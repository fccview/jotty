import { promises as fs } from "fs";
import path from "path";
import { NUM_FILES, CHECKLIST_CATEGORIES, LOREM_WORDS } from "./constants";
import {
  resetSeed,
  random,
  randomInt,
  randomChoice,
  randomSample,
  generateTagPool,
  getLoremText,
  getTimestamp,
  getUniqueId,
} from "./utils";

resetSeed();

const TAG_POOL = generateTagPool();

const _generateMetadata = (
  itemId: string,
  statusHistory?: Array<{
    status: string;
    timestamp: string;
    user: string;
  }>
): string => {
  const createdAt = getTimestamp();
  const meta: {
    id: string;
    createdBy: string;
    createdAt: string;
    lastModifiedBy: string;
    lastModifiedAt: string;
    history?: Array<{ status: string; timestamp: string; user: string }>;
  } = {
    id: itemId,
    createdBy: "user",
    createdAt,
    lastModifiedBy: "user",
    lastModifiedAt: createdAt,
  };
  if (statusHistory) {
    meta.history = statusHistory;
  }
  return JSON.stringify(meta);
};

const _generateSimpleChecklistContent = (title: string): string => {
  const fileUuid = getUniqueId();
  const now = getTimestamp();

  const content = [
    "---",
    `uuid: ${fileUuid}`,
    `title: ${title}`,
    "checklistType: simple",
    `createdAt: '${now}'`,
    `updatedAt: '${now}'`,
    "---",
  ];

  const numItems = randomInt(3, 15);
  for (let i = 0; i < numItems; i++) {
    const isChecked = random() < 0.3 ? "x" : " ";
    let text = getLoremText(2, 5);

    if (random() < 0.1) {
      text += ` (${getLoremText(1, 2)})`;
    }

    const itemId = getUniqueId();
    const metaJson = _generateMetadata(itemId);

    content.push(`- [${isChecked}] ${text} | metadata:${metaJson}`);
  }

  return content.join("\n");
};

const _generateTaskListContent = (title: string): string => {
  const fileUuid = getUniqueId();

  const statusTodo = getUniqueId();
  const statusProg = getUniqueId();
  const statusDone = getUniqueId();

  const content = [
    "---",
    `uuid: ${fileUuid}`,
    `title: ${title}`,
    "checklistType: task",
    "statuses:",
    `  - id: ${statusTodo}`,
    "    label: To Do",
    "    order: 0",
    "  - id: paused",
    "    label: Paused",
    "    order: 1",
    "    color: '#f59e0b'",
    `  - id: ${statusProg}`,
    "    label: In Progress",
    "    order: 2",
    "    color: '#3b82f6'",
    `  - id: ${statusDone}`,
    "    label: Completed",
    "    order: 3",
    "    color: '#10b981'",
    "---",
  ];

  const statuses = [statusTodo, "paused", statusProg, statusDone];
  const numItems = randomInt(5, 20);

  for (let i = 0; i < numItems; i++) {
    const currentStatus = randomChoice(statuses);
    const isChecked = currentStatus === statusDone ? "x" : " ";

    const text = getLoremText(2, 5);
    const itemId = getUniqueId();

    const history = [
      { status: statusTodo, timestamp: getTimestamp(), user: "user" },
      { status: currentStatus, timestamp: getTimestamp(), user: "user" },
    ];

    const metaJson = _generateMetadata(itemId, history);

    content.push(
      `- [${isChecked}] ${text} | status:${currentStatus} | time:0 | metadata:${metaJson}`
    );

    if (random() < 0.2) {
      const subId = getUniqueId();
      const subMeta = _generateMetadata(subId);
      content.push(
        `  - [ ] ${getLoremText(2, 3)} | time:0 | metadata:${subMeta}`
      );
    }
  }

  return content.join("\n");
};

const main = async () => {
  const username = process.argv[2];
  if (!username) {
    console.error("Usage: tsx checklist-generator.ts <username>");
    process.exit(1);
  }

  const outputDir = path.join("data", "checklists", username);

  try {
    await fs.readdir(outputDir);

    for (const cat of CHECKLIST_CATEGORIES) {
      const catDir = path.join(outputDir, cat);
      try {
        await fs.rm(catDir, { recursive: true, force: true });
      } catch {
      }
    }
  } catch {
  }

  for (const cat of CHECKLIST_CATEGORIES) {
    await fs.mkdir(path.join(outputDir, cat), { recursive: true });
  }

  console.log(`Generating ${NUM_FILES} checklists for user '${username}'...`);

  for (let i = 0; i < NUM_FILES; i++) {
    const category = randomChoice(CHECKLIST_CATEGORIES);

    const isTaskType = random() > 0.5;
    const title = `${isTaskType ? "Task" : "List"} ${i + 1} - ${getLoremText(1, 2)}`;
    const filename = `${isTaskType ? "task" : "check"}_${String(i + 1).padStart(3, "0")}.md`;
    const filepath = path.join(outputDir, category, filename);

    let content = isTaskType
      ? _generateTaskListContent(title)
      : _generateSimpleChecklistContent(title);

    if (random() > 0.1) {
      const numTags = randomInt(1, 10);
      const fileTags = randomSample(TAG_POOL, numTags);
      content += "\n\n" + fileTags.join(" ");
    }

    await fs.writeFile(filepath, content, "utf-8");
  }

  console.log(`Done! Generated ${NUM_FILES} checklists in ${outputDir}`);
};

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
