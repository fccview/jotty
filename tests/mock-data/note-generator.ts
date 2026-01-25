import { promises as fs } from "fs";
import path from "path";
import { NUM_FILES, NOTE_CATEGORIES } from "./constants";
import {
  resetSeed,
  random,
  randomInt,
  randomChoice,
  randomSample,
  generateTagPool,
  LOREM_WORDS,
} from "./utils";

resetSeed();

const TAG_POOL = generateTagPool();

const _getRandomText = (
  minWords: number = 10,
  maxWords: number = 1000,
  tags?: string[]
): string => {
  const numWords = randomInt(minWords, maxWords);
  const textParts: string[] = [];
  let currentWords = 0;
  const tagsRemaining = tags ? [...tags] : [];
  const tagsUsed: string[] = [];

  while (currentWords < numWords) {
    if (random() < 0.1) {
      const headerLevel = randomInt(1, 3);
      const headerWords = Array(3)
        .fill(0)
        .map(() => {
          const word = randomChoice(LOREM_WORDS);
          return word.charAt(0).toUpperCase() + word.slice(1);
        });
      const headerText = headerWords.join(" ");
      textParts.push(`\n${"#".repeat(headerLevel)} ${headerText}\n`);
    }

    if (random() < 0.05) {
      const imgId = randomInt(1, 1000);
      textParts.push(
        `\n![Random Image](https://picsum.photos/seed/${imgId}/400/200)\n`
      );
    }

    if (random() < 0.1) {
      const listLen = randomInt(3, 6);
      textParts.push("\n");
      for (let j = 0; j < listLen; j++) {
        const itemWords = Array(4)
          .fill(0)
          .map(() => randomChoice(LOREM_WORDS));
        const itemText = itemWords.join(" ");
        textParts.push(`- ${itemText}`);
      }
      textParts.push("\n");
    }

    const paraLen = randomInt(10, 50);
    const sentenceCount = randomInt(2, 6);
    const paragraph: string[] = [];
    for (let j = 0; j < sentenceCount; j++) {
      const sentLen = randomInt(5, 15);
      const sentenceWords = Array(sentLen)
        .fill(0)
        .map(() => randomChoice(LOREM_WORDS));
      let sentence = sentenceWords.join(" ") + ".";
      if (random() < 0.2) {
        const words = sentence.split(" ");
        if (words.length > 3) {
          const boldIdx = randomInt(0, words.length - 3);
          words[boldIdx] = `**${words[boldIdx]}**`;
          sentence = words.join(" ");
        }
      }
      paragraph.push(
        sentence.charAt(0).toUpperCase() + sentence.slice(1)
      );
    }

    textParts.push(paragraph.join(" "));

    if (tagsRemaining.length > 0 && random() < 0.15) {
      const tag = tagsRemaining.shift();
      if (tag) {
        tagsUsed.push(tag);
        textParts.push(` ${tag}`);
      }
    }

    currentWords += paraLen;
  }

  return textParts.join("\n\n");
};

const main = async () => {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: tsx note-generator.ts <username>");
    process.exit(1);
  }

  const outputDir = path.join("data", "notes", username);

  try {
    await fs.readdir(outputDir);
    for (const cat of NOTE_CATEGORIES) {
      const catDir = path.join(outputDir, cat);
      try {
        await fs.rm(catDir, { recursive: true, force: true });
      } catch {
        console.warn(`Directory ${catDir} does not exist`);
      }
    }
  } catch {
    console.warn(`Directory ${outputDir} does not exist`);
  }

  for (const cat of NOTE_CATEGORIES) {
    await fs.mkdir(path.join(outputDir, cat), { recursive: true });
  }

  console.log(`Generating ${NUM_FILES} notes for user '${username}'...`);

  for (let i = 0; i < NUM_FILES; i++) {
    const category = randomChoice(NOTE_CATEGORIES);
    const filename = `note_${String(i + 1).padStart(3, "0")}_${randomChoice(LOREM_WORDS)}.md`;
    const filepath = path.join(outputDir, category, filename);

    const hasTags = random() > 0.1;
    let fileTags: string[] | undefined;

    if (hasTags) {
      const numTags = randomInt(1, 10);
      fileTags = randomSample(TAG_POOL, numTags);
    }

    const content = _getRandomText(10, 1000, fileTags);

    await fs.writeFile(filepath, content, "utf-8");
  }

  console.log(`Done! Generated ${NUM_FILES} notes in ${outputDir}`);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
