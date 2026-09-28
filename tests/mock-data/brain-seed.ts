import { promises as fs } from "fs";
import path from "path";
import { createHash } from "crypto";
import lockfile from "proper-lockfile";
import { noteToMarkdown } from "../../app/_server/actions/note/parsers";
import { listToMarkdown } from "../../app/_utils/checklist-utils";
import type { Checklist, Item, Note } from "../../app/_types";
import { ChecklistsTypes } from "../../app/_types/enums";
import { random, randomChoice, randomInt, randomSample, resetSeed } from "./utils";

const USER_FLAG = "--user=";
const DEFAULT_USER = "braintest";
const USERNAME =
  process.argv.find((arg) => arg.startsWith(USER_FLAG))?.slice(USER_FLAG.length) ||
  process.env.BRAIN_SEED_USER ||
  DEFAULT_USER;
const PASSWORD = process.env.BRAIN_SEED_PASSWORD || "braintest-local-only";
const SEED_CATEGORY = "Brain Seed";
const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users", "users.json");
const NOTES_ROOT = path.join(DATA_DIR, "notes", USERNAME, SEED_CATEGORY);
const LISTS_ROOT = path.join(DATA_DIR, "checklists", USERNAME, SEED_CATEGORY);
const CREATED_MARKER = path.join(DATA_DIR, "notes", USERNAME, ".brain-seed-user");
const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

interface Cluster {
  category: string;
  tag: string;
  notes: string[];
  lists: string[];
}

const CLUSTERS: Cluster[] = [
  {
    category: "Home",
    tag: "home",
    notes: ["Boiler service history", "Living room repaint plan", "House insurance notes", "Neighbours and contacts", "Moving in checklist retro"],
    lists: ["Weekly cleaning rota", "Hardware store run", "Spare parts inventory", "Paint colour shortlist", "Bills to cancel"],
  },
  {
    category: "Garden",
    tag: "garden",
    notes: ["Tomato growing log", "Composting notes", "Raised bed layout", "Pest control ideas", "Seed swap contacts"],
    lists: ["Spring sowing plan", "Garden centre shopping", "Watering schedule", "Tools to sharpen", "Bulbs to plant"],
  },
  {
    category: "Recipes",
    tag: "cooking",
    notes: ["Sourdough starter notes", "Weeknight curry", "Grandma's lasagne", "Meal prep principles", "Fermentation experiments"],
    lists: ["Groceries this week", "Pantry staples", "Baking gear wishlist", "Dinner party menu", "Spices to restock"],
  },
  {
    category: "Travel/Japan",
    tag: "travel",
    notes: ["Tokyo itinerary", "Kyoto temples shortlist", "JR pass maths", "Japanese phrases", "Onsen etiquette"],
    lists: ["Packing list Japan", "Bookings to confirm", "Souvenirs for family", "Before we fly", "Food to try in Osaka"],
  },
  {
    category: "Work/Projects",
    tag: "work",
    notes: ["Q3 roadmap", "Search rewrite design", "Incident review April", "Onboarding guide draft", "Architecture decisions"],
    lists: ["Sprint board", "Launch checklist", "Hiring pipeline", "Tech debt backlog", "Release notes todo"],
  },
  {
    category: "Work/Meetings",
    tag: "meetings",
    notes: ["Weekly sync notes", "One to one with Sam", "Planning offsite", "Customer call notes", "Retro themes"],
    lists: ["Action items", "Agenda next week", "Follow ups", "Offsite logistics", "Questions for leadership"],
  },
  {
    category: "Health",
    tag: "health",
    notes: ["Running plan", "Physio exercises", "Sleep experiments", "Blood test results summary", "Stretching routine"],
    lists: ["Gym programme", "Supplements", "Race day kit", "Appointments", "Healthy snacks"],
  },
  {
    category: "Reading",
    tag: "books",
    notes: ["Book notes Deep Work", "Book notes Thinking Fast and Slow", "Quotes I like", "Reading goals", "Sci-fi recommendations"],
    lists: ["To read", "Books to lend back", "Library holds", "Gift ideas books", "Audiobooks queue"],
  },
  {
    category: "Finance",
    tag: "money",
    notes: ["Budget principles", "Pension research", "Tax year notes", "Subscriptions audit", "Savings goals"],
    lists: ["Monthly budget", "Receipts to file", "Accounts to close", "Big purchases", "Tax documents"],
  },
  {
    category: "Ideas",
    tag: "ideas",
    notes: ["Side project ideas", "App features wishlist", "Blog post drafts", "Things to learn", "Random thoughts"],
    lists: ["Weekend projects", "Domains to buy", "Talks to watch", "Experiments backlog", "Someday maybe"],
  },
];

const SHARED_TAGS = ["urgent", "someday", "review", "family"];
const GHOSTS = ["Unwritten travel journal", "Future house plans", "Recipe book idea", "Marathon training diary"];
const KANBAN_STATUSES = ["todo", "in_progress", "completed"];

let _minted = 0;

const _uuid = (): string => {
  _minted += 1;
  const hex = createHash("sha256").update(`${USERNAME}:${_minted}`).digest("hex").slice(0, 32).split("");
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  const h = hex.join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

const _slug = (title: string) =>
  title.toLowerCase().replace(/['’]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

interface Seeded {
  uuid: string;
  title: string;
  type: "note" | "checklist";
  cluster: Cluster;
  kanban: boolean;
}

const _href = (item: Seeded, legacy = false) =>
  legacy ? `/jotty/${item.uuid}` : `/${item.type}/${item.uuid}`;

const _link = (item: Seeded, legacy = false) => `[${item.title}](${_href(item, legacy)})`;

const _mention = (item: Seeded) => {
  const roll = random();
  if (roll < 0.1) return _link(item, true);
  if (roll < 0.3) return `[[${item.title}]]`;
  if (roll < 0.36) return `[[${item.title.toLowerCase()}]]`;
  if (roll < 0.42) return `[[${item.title}|this one]]`;
  return _link(item);
};

const _category = (cluster: Cluster) => `${SEED_CATEGORY}/${cluster.category}`;

const _plan = (): Seeded[] => {
  const all: Seeded[] = [];
  CLUSTERS.forEach((cluster) => {
    cluster.notes.forEach((title) => all.push({ uuid: _uuid(), title, type: "note", cluster, kanban: false }));
    cluster.lists.forEach((title, index) =>
      all.push({ uuid: _uuid(), title, type: "checklist", cluster, kanban: index % 2 === 1 }),
    );
  });
  return all;
};

const _noteBody = (note: Seeded, all: Seeded[], index: number): string => {
  const siblings = all.filter((item) => item.cluster === note.cluster && item.uuid !== note.uuid);
  const others = all.filter((item) => item.cluster !== note.cluster);
  const lines = [
    `Notes about ${note.title.toLowerCase()}. #${note.cluster.tag}`,
    "",
    `Related: ${randomSample(siblings, randomInt(1, 3)).map(_mention).join(", ")}.`,
  ];

  if (random() < 0.4) lines.push("", `Also see ${_mention(randomChoice(others))} for context.`);
  if (random() < 0.25) lines.push("", `One day: [[${randomChoice(GHOSTS)}]].`);
  if (random() < 0.3) lines.push("", `Tagged #${randomChoice(SHARED_TAGS)} for later.`);
  if (random() < 0.5) lines.push("", `I keep coming back to ${randomChoice(others).title} when I think about this.`);
  if (index % 7 === 0) {
    lines.push("", "```md", `[not a real link](/note/${randomChoice(others).uuid}) and [[Not A Wikilink]]`, "```");
  }
  return lines.join("\n");
};

const _itemsFor = (list: Seeded, all: Seeded[]): Item[] => {
  const notes = all.filter((item) => item.type === "note");
  const siblings = all.filter((item) => item.cluster === list.cluster && item.uuid !== list.uuid);
  const count = randomInt(4, 8);
  const now = new Date().toISOString();

  return Array.from({ length: count }, (_, order) => {
    const linked = random() < 0.35;
    const target = linked ? randomChoice(random() < 0.7 ? siblings : notes) : null;
    const text = target
      ? `Check ${_link(target)} #${list.cluster.tag}`
      : `${randomChoice(["Sort out", "Buy", "Book", "Call about", "Review", "Tidy"])} item ${order + 1}`;
    const item: Item = {
      id: `${list.uuid.slice(0, 8)}-${order}`,
      text,
      completed: random() < 0.3,
      order,
      createdAt: now,
    };

    if (list.kanban) {
      item.status = randomChoice(KANBAN_STATUSES);
      if (random() < 0.4) item.description = `Context in ${_link(randomChoice(notes))}`;
    } else if (random() < 0.2) {
      item.children = [
        {
          id: `${item.id}-child`,
          text: `Sub task, see ${_link(randomChoice(siblings))}`,
          completed: false,
          order: 0,
          createdAt: now,
        },
      ];
    }
    return item;
  });
};

const _write = async (root: string, category: string, title: string, content: string) => {
  const dir = path.join(root, ...category.split("/"));
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, `${_slug(title)}.md`);
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, content, "utf-8");
  await fs.rename(tmp, file);
};

const _withUsers = async (change: (users: Record<string, unknown>[]) => Record<string, unknown>[]) => {
  const release = await lockfile.lock(USERS_FILE, { retries: { retries: 10, minTimeout: 100 } });
  try {
    const users = JSON.parse(await fs.readFile(USERS_FILE, "utf-8")) as Record<string, unknown>[];
    const tmp = `${USERS_FILE}.${process.pid}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(change(users), null, 2), "utf-8");
    await fs.rename(tmp, USERS_FILE);
  } finally {
    await release();
  }
};

const _ensureUser = () =>
  _withUsers((users) => {
    if (users.some((user) => user.username === USERNAME)) return users;
    created = true;
    const now = new Date().toISOString();
    return [
      ...users,
      {
        username: USERNAME,
        brainSeedCreated: true,
        passwordHash: createHash("sha256").update(PASSWORD).digest("hex"),
        isAdmin: false,
        createdAt: now,
        lastLogin: now,
        preferredDateFormat: "system",
        preferredTimeFormat: "system",
        handedness: "right-handed",
        hideMobileStatusDropdown: "disable",
      },
    ];
  });

let created = false;

const _exists = (target: string) =>
  fs.access(target).then(
    () => true,
    () => false,
  );

const _seededUser = async () => {
  const users = JSON.parse(await fs.readFile(USERS_FILE, "utf-8")) as Record<string, unknown>[];
  return users.some((user) => user.username === USERNAME && user.brainSeedCreated === true);
};

const _remove = async () => {
  await fs.rm(NOTES_ROOT, { recursive: true, force: true });
  await fs.rm(LISTS_ROOT, { recursive: true, force: true });
  if (!(await _seededUser()) || !(await _exists(CREATED_MARKER))) {
    console.log(`Removed the ${SEED_CATEGORY} category from ${USERNAME}.`);
    return;
  }
  await fs.rm(path.join(DATA_DIR, "notes", USERNAME), { recursive: true, force: true });
  await fs.rm(path.join(DATA_DIR, "checklists", USERNAME), { recursive: true, force: true });
  await _withUsers((users) => users.filter((user) => user.username !== USERNAME));
  console.log(`Removed ${USERNAME} and all of their items.`);
};

const _seed = async () => {
  resetSeed();
  await fs.rm(NOTES_ROOT, { recursive: true, force: true });
  await fs.rm(LISTS_ROOT, { recursive: true, force: true });
  await _ensureUser();
  if (created) {
    await fs.mkdir(path.dirname(CREATED_MARKER), { recursive: true });
    await fs.writeFile(CREATED_MARKER, "", "utf-8");
  }

  const all = _plan();
  const notes = all.filter((item) => item.type === "note");
  const lists = all.filter((item) => item.type === "checklist");
  const now = new Date().toISOString();

  for (let index = 0; index < notes.length; index++) {
    const seeded = notes[index];
    const note: Note = {
      id: _slug(seeded.title),
      uuid: seeded.uuid,
      title: seeded.title,
      content: _noteBody(seeded, all, index),
      category: _category(seeded.cluster),
      createdAt: now,
      updatedAt: now,
      owner: USERNAME,
      tags: [seeded.cluster.tag],
    };
    await _write(NOTES_ROOT, seeded.cluster.category, seeded.title, noteToMarkdown(note));
  }

  const hub: Note = {
    id: "index-of-everything",
    uuid: _uuid(),
    title: "Index of everything",
    content: ["Start here.", "", ...randomSample(all, 16).map((item) => `- ${_link(item)}`)].join("\n"),
    category: `${SEED_CATEGORY}/Ideas`,
    createdAt: now,
    updatedAt: now,
    owner: USERNAME,
    tags: ["ideas", "review"],
  };
  await _write(NOTES_ROOT, "Ideas", hub.title, noteToMarkdown(hub));

  const secret: Note = {
    id: "private-journal",
    uuid: _uuid(),
    title: "Private journal",
    content: `-----BEGIN PGP MESSAGE-----\n\nhQEMA${"x".repeat(60)}\n[should never be indexed](/note/${notes[0].uuid})\n-----END PGP MESSAGE-----`,
    category: `${SEED_CATEGORY}/Ideas`,
    createdAt: now,
    updatedAt: now,
    owner: USERNAME,
    encrypted: true,
    encryptionMethod: "pgp",
  };
  await _write(NOTES_ROOT, "Ideas", secret.title, noteToMarkdown(secret));

  for (const loner of ["Loose thought one", "Loose thought two", "Loose thought three"]) {
    const note: Note = {
      id: _slug(loner),
      uuid: _uuid(),
      title: loner,
      content: "Nothing links here yet.",
      category: `${SEED_CATEGORY}/Ideas`,
      createdAt: now,
      updatedAt: now,
      owner: USERNAME,
    };
    await _write(NOTES_ROOT, "Ideas", loner, noteToMarkdown(note));
  }

  const twins = ["an old imported copy", "a newer copy"].map((body, index) => ({
    id: `weekly-review-${index}`,
    uuid: _uuid(),
    title: "Weekly review",
    content: `This is ${body}. Wikilinks to [[Weekly review]] should land on the old one.`,
    category: `${SEED_CATEGORY}/Ideas`,
    createdAt: new Date(Date.now() - (index === 0 ? YEAR_MS : 0)).toISOString(),
    updatedAt: now,
    owner: USERNAME,
  }));
  for (const twin of twins) {
    await _write(NOTES_ROOT, "Ideas", twin.id, noteToMarkdown(twin as Note));
  }

  const renamer: Note = {
    id: "rename-playground",
    uuid: _uuid(),
    title: "Rename playground",
    content: [
      "Rename the targets of these links, then save this note and watch the text follow.",
      "",
      `- [[${notes[0].title}]]`,
      `- [[${notes[1].title}#Details|with an alias]]`,
      `- [[Weekly review]]`,
      "",
      `Plain mention for the unlinked mentions panel: ${notes[2].title}.`,
    ].join("\n"),
    category: `${SEED_CATEGORY}/Ideas`,
    createdAt: now,
    updatedAt: now,
    owner: USERNAME,
  };
  await _write(NOTES_ROOT, "Ideas", renamer.title, noteToMarkdown(renamer));

  for (const seeded of lists) {
    const list: Checklist = {
      id: _slug(seeded.title),
      uuid: seeded.uuid,
      title: seeded.title,
      type: seeded.kanban ? ChecklistsTypes.KANBAN : ChecklistsTypes.SIMPLE,
      category: _category(seeded.cluster),
      items: _itemsFor(seeded, all),
      createdAt: now,
      updatedAt: now,
      owner: USERNAME,
      tags: [seeded.cluster.tag],
    } as Checklist;
    await _write(LISTS_ROOT, seeded.cluster.category, seeded.title, listToMarkdown(list));
  }

  console.log(
    `Seeded ${USERNAME} under ${SEED_CATEGORY}: ${notes.length + 8} notes, ${lists.length} checklists. ` +
      "Rebuild relations from Admin > Content, or restart the dev server, to index them.",
  );
};

(process.argv.includes("--remove") ? _remove() : _seed()).catch((error) => {
  console.error("brain seed failed:", error);
  process.exit(1);
});
