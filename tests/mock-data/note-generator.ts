import { promises as fs } from "fs";
import path from "path";
import { faker } from "@faker-js/faker";
import { NUM_FILES, SEED } from "./constants";
import {
  resetSeed,
  random,
  randomInt,
  randomChoice,
  randomSample,
  generateTagPool,
  getNoteCategories,
} from "./utils";

resetSeed();
faker.seed(SEED);

const NOTE_CATEGORIES = getNoteCategories();
const TAG_POOL = generateTagPool();

const _getRandomText = (
  minWords: number = 10,
  maxWords: number = 1000,
  tags?: string[],
): string => {
  const numWords = randomInt(minWords, maxWords);
  const textParts: string[] = [];
  let currentWords = 0;
  const tagsRemaining = tags ? [...tags] : [];

  while (currentWords < numWords) {
    if (random() < 0.1) {
      const headerLevel = randomInt(1, 3);
      const headerText = faker.company
        .catchPhrase()
        .replace(/^\w/, (c) => c.toUpperCase());
      textParts.push(`\n${"#".repeat(headerLevel)} ${headerText}\n`);
    }

    if (random() < 0.05) {
      const width = randomInt(320, 600);
      const height = randomInt(180, 400);
      const imageUrl = faker.image.url({ width, height });
      textParts.push(`\n![Random Image](${imageUrl})\n`);
    }

    if (random() < 0.1) {
      const listLen = randomInt(3, 6);
      textParts.push("\n");
      for (let j = 0; j < listLen; j++) {
        textParts.push(`- ${faker.company.catchPhrase()}`);
      }
      textParts.push("\n");
    }

    const sentenceCount = randomInt(2, 6);
    const sentences = Array.from({ length: sentenceCount }, () =>
      faker.commerce.productDescription(),
    );
    const paragraph = sentences.join(" ");
    let block = paragraph;
    if (random() < 0.2) {
      const words = block.split(" ");
      if (words.length > 3) {
        const boldIdx = randomInt(0, words.length - 3);
        words[boldIdx] = `**${words[boldIdx]}**`;
        block = words.join(" ");
      }
    }
    textParts.push(block);

    if (tagsRemaining.length > 0 && random() < 0.15) {
      const tag = tagsRemaining.shift();
      if (tag) {
        textParts.push(` ${tag}`);
      }
    }

    currentWords += randomInt(10, 50);
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
    await fs.rm(outputDir, { recursive: true, force: true });
  } catch {
  }

  for (const cat of NOTE_CATEGORIES) {
    await fs.mkdir(path.join(outputDir, cat), { recursive: true });
  }

  console.log(`Generating ${NUM_FILES} notes for user '${username}'...`);

  const slugToTitle = (slug: string): string =>
    slug
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");

  for (let i = 0; i < NUM_FILES; i++) {
    const category = randomChoice(NOTE_CATEGORIES);
    const rawPhrase = faker.company.catchPhrase();
    const slug = faker.helpers.slugify(rawPhrase).toLowerCase();
    const title = slugToTitle(slug);
    const filename = `note_${String(i + 1).padStart(3, "0")}_${slug}.md`;
    const filepath = path.join(outputDir, category, filename);

    const hasTags = random() > 0.1;
    let fileTags: string[] | undefined;

    if (hasTags) {
      const numTags = randomInt(1, 10);
      fileTags = randomSample(TAG_POOL, numTags);
    }

    const body = _getRandomText(10, 1000, fileTags);
    const frontmatter = ["---", `title: ${title}`];
    if (fileTags && fileTags.length > 0) {
      frontmatter.push("tags:");
      for (const tag of fileTags) {
        frontmatter.push(`  - ${tag.replace(/^#/, "")}`);
      }
    }
    frontmatter.push("---");
    const content = frontmatter.join("\n") + "\n\n" + body;

    await fs.writeFile(filepath, content, "utf-8");
  }

  console.log(`Done! Generated ${NUM_FILES} notes in ${outputDir}`);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
