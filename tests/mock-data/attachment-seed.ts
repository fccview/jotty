import { promises as fs } from "fs";
import path from "path";
import { deflateSync } from "zlib";
import _sodium from "libsodium-wrappers-sumo";
import { listToMarkdown } from "../../app/_utils/checklist-utils";
import type { Checklist, Item } from "../../app/_types";
import { ChecklistsTypes } from "../../app/_types/enums";

const DATA_DIR = path.join(process.cwd(), "data");
const MANIFEST = path.join(DATA_DIR, ".attachment-seed.json");
const SCHEMA_FILE = path.join(DATA_DIR, ".schema-version");
const USERS_FILE = path.join(DATA_DIR, "users", "users.json");
const CATEGORY = "Attachment Migration";
const READ_ONLY_CATEGORY = `${CATEGORY}/Read only`;
const PASSPHRASE = "jotty-seed";
const OWNER = argValue("--owner=") || "fccview";
const FRIEND = argValue("--friend=") || "mario";
const VIEWER = argValue("--viewer=") || "Jot";
const ORIGIN = argValue("--origin=") || process.env.APP_URL || "http://localhost:3000";
const V1 = process.argv.includes("--v1");
const REMOVE = process.argv.includes("--remove");
const SAFE_USERNAME = /^[A-Za-z0-9_-][A-Za-z0-9_.-]*$/;

interface Manifest {
  files: string[];
  dirs: string[];
  readOnly: string[];
  uuids: string[];
  schema: string | null;
  avatars: Record<string, string | null>;
}

interface User {
  username: string;
  avatarUrl?: string;
}

function argValue(flag: string): string | undefined {
  return process.argv.find((arg) => arg.startsWith(flag))?.slice(flag.length);
}

const uuid = (n: number): string => `a77ac000-0000-4000-8000-${String(n).padStart(12, "0")}`;

const U = {
  basics: uuid(1),
  html: uuid(2),
  code: uuid(3),
  urls: uuid(4),
  names: uuid(5),
  sharedA: uuid(6),
  sharedB: uuid(7),
  clashes: uuid(8),
  broken: uuid(9),
  encrypted: uuid(10),
  duplicate: uuid(11),
  crossEdit: uuid(12),
  crossRead: uuid(13),
  board: uuid(14),
  list: uuid(15),
  publicNote: uuid(16),
  viewerNote: uuid(17),
  privateNote: uuid(18),
  archived: uuid(19),
  template: uuid(20),
  readOnly: uuid(21),
  gallery: uuid(22),
  legacyShare: uuid(23),
  friendNote: uuid(24),
  markers: uuid(25),
};

const manifest: Manifest = { files: [], dirs: [], readOnly: [], uuids: Object.values(U), schema: null, avatars: {} };

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer: Buffer): number => {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i++) crc = crcTable[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type: string, data: Buffer): Buffer => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

const png = (hex: string, size = 96): Buffer => {
  const [r, g, b] = [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16));
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  const rows = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x++) {
      const stripe = (x + y) % 24 < 12 ? 1 : 0.7;
      rows.set([r * stripe, g * stripe, b * stripe].map(Math.round), row + 1 + x * 3);
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
};

const pdf = (text: string): Buffer =>
  Buffer.from(
    `%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 100]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n4 0 obj<</Length ${text.length + 30}>>stream\nBT /F1 14 Tf 20 50 Td (${text}) Tj ET\nendstream endobj\n5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n`,
  );

const remember = async (filePath: string) => {
  manifest.files.push(path.relative(DATA_DIR, filePath));
};

const put = async (filePath: string, content: string | Buffer) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  try {
    await fs.access(filePath);
    throw new Error(`Refusing to overwrite ${filePath}, run with --remove first`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await fs.writeFile(filePath, content);
  await remember(filePath);
};

const legacy = (owner: string, dir: "images" | "files" | "videos", name: string, content: string | Buffer) =>
  put(path.join(DATA_DIR, "notes", owner, dir, name), content);

const frontmatter = (fields: Record<string, string | undefined>): string =>
  [
    "---",
    ...Object.entries(fields)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}: ${value}`),
    "---",
    "",
  ].join("\n");

const note = (
  owner: string,
  category: string,
  title: string,
  id: string | undefined,
  body: string,
  extra: Record<string, string | undefined> = {},
) =>
  put(
    path.join(DATA_DIR, "notes", owner, category, `${title}.md`),
    `${frontmatter({ uuid: id, title, createdAt: "2026-01-01T00:00:00.000Z", ...extra })}${body}\n`,
  );

const checklist = (owner: string, title: string, id: string, type: ChecklistsTypes, items: Partial<Item>[]) =>
  put(
    path.join(DATA_DIR, "checklists", owner, CATEGORY, `${title}.md`),
    listToMarkdown({
      id: title,
      uuid: id,
      title,
      type,
      category: CATEGORY,
      owner,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      items: items.map((item, order) => ({
        id: `${id}-${order}`,
        text: "",
        completed: false,
        order,
        ...item,
      })),
    } as Checklist),
  );

const encrypt = async (content: string): Promise<string> => {
  await _sodium.ready;
  const sod = _sodium;
  const salt = sod.randombytes_buf(sod.crypto_pwhash_SALTBYTES);
  const key = sod.crypto_pwhash(
    sod.crypto_aead_xchacha20poly1305_ietf_KEYBYTES,
    PASSPHRASE,
    salt,
    sod.crypto_pwhash_OPSLIMIT_INTERACTIVE,
    sod.crypto_pwhash_MEMLIMIT_INTERACTIVE,
    sod.crypto_pwhash_ALG_DEFAULT,
  );
  const nonce = sod.randombytes_buf(sod.crypto_aead_xchacha20poly1305_ietf_NPUBBYTES);
  const data = sod.crypto_aead_xchacha20poly1305_ietf_encrypt(content, null, null, nonce, key);
  return JSON.stringify({ alg: "xchacha20", salt: sod.to_hex(salt), nonce: sod.to_hex(nonce), data: sod.to_hex(data) });
};

const readUsers = async (): Promise<User[]> => JSON.parse(await fs.readFile(USERS_FILE, "utf-8"));

const setAvatars = async (wanted: Record<string, string>) => {
  const users = await readUsers();
  for (const user of users) {
    if (!(user.username in wanted)) continue;
    manifest.avatars[user.username] = user.avatarUrl ?? null;
    user.avatarUrl = wanted[user.username];
  }
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));
};

const seedLegacyFiles = async () => {
  await legacy(OWNER, "images", "cat.png", png("e8743b"));
  await legacy(OWNER, "images", "dog.png", png("19a979"));
  await legacy(OWNER, "images", "cat_photo.png", png("c0ca33"));
  await legacy(OWNER, "images", "my holiday photo.png", png("ed4a7b"));
  await legacy(OWNER, "images", "café.png", png("945ecf"));
  await legacy(OWNER, "images", "shared.png", png("13a4b4"));
  await legacy(OWNER, "images", "same-name.png", png("525df4"));
  await legacy(OWNER, "files", "same-name.png", png("bf399e"));
  await legacy(OWNER, "images", "public.png", png("6c8893"));
  await legacy(OWNER, "images", "secret.png", png("ee6868"));
  await legacy(OWNER, "images", "encrypted.png", png("2f6497"));
  await legacy(OWNER, "images", "avatar.png", png("ffb000"));
  await legacy(OWNER, "images", "orphan-never-embedded.png", png("999999"));
  await legacy(OWNER, "images", "archived.png", png("a0522d"));
  await legacy(OWNER, "images", "template.png", png("4682b4"));
  await legacy(OWNER, "images", "readonly.png", png("708090"));
  await legacy(OWNER, "images", "card.png", png("daa520"));
  await legacy(OWNER, "files", "report.pdf", pdf("Seeded report"));
  await legacy(OWNER, "files", "data.csv", "a,b\n1,2\n");
  await legacy(OWNER, "videos", "clip.mp4", Buffer.from("not really a video"));
  await legacy(FRIEND, "images", "friend-edit.png", png("dc143c"));
  await legacy(FRIEND, "images", "friend-read.png", png("ff8c00"));
  await legacy(FRIEND, "images", "legacy-share.png", png("2e8b57"));
  for (let n = 1; n <= 30; n++) {
    await legacy(OWNER, "images", `gallery-${n}.png`, png(((n * 0x2f3a17) & 0xffffff).toString(16).padStart(6, "0"), 48));
  }

  const link = path.join(DATA_DIR, "notes", OWNER, "images", "points-at-users.png");
  await fs.symlink(USERS_FILE, link);
  await remember(link);
};

const img = (owner: string, name: string) => `/api/image/${owner}/${encodeURIComponent(name)}`;

const seedNotes = async () => {
  await note(OWNER, CATEGORY, "01 Basics", U.basics, [
    "# Basics",
    "An image, a file, a csv and a video, all relative URLs.",
    "",
    `![cat](${img(OWNER, "cat.png")})`,
    "",
    `[📎 report.pdf](/api/file/${OWNER}/report.pdf)`,
    "",
    `[📎 data.csv](/api/file/${OWNER}/data.csv)`,
    "",
    `[🎥 clip.mp4](/api/video/${OWNER}/clip.mp4)`,
    "",
    "The same cat twice in one note should end up as one file:",
    "",
    `![cat again](${img(OWNER, "cat.png")})`,
  ].join("\n"));

  await note(OWNER, CATEGORY, "02 Raw HTML and definitions", U.html, [
    "# Raw HTML",
    `<img src="${img(OWNER, "dog.png")}" width="120" alt="dog">`,
    "",
    `<a href='/api/file/${OWNER}/report.pdf'>single-quoted href</a>`,
    "",
    "A reference-style image: ![dog][dogref]",
    "",
    `[dogref]: ${img(OWNER, "dog.png")}`,
  ].join("\n"));

  await note(OWNER, CATEGORY, "03 Code must not change", U.code, [
    "# Code must not change",
    "Everything below documents the old API and must stay byte for byte.",
    "",
    "```markdown",
    `![cat](${img(OWNER, "cat.png")})`,
    "```",
    "",
    `Inline: \`![cat](${img(OWNER, "cat.png")})\``,
    "",
    "    indented code /api/image/" + OWNER + "/cat.png",
    "",
    `Plain text mention, left alone and reported as loose: ${img(OWNER, "cat.png")}`,
    "",
    `But this real image right after should move: ![cat](${img(OWNER, "cat.png")})`,
  ].join("\n"));

  await note(OWNER, CATEGORY, "04 URL shapes", U.urls, [
    "# URL shapes",
    `Absolute on this instance (${ORIGIN}), moves only if APP_URL matches: ![abs](${ORIGIN}${img(OWNER, "dog.png")})`,
    "",
    `Autolink: <${ORIGIN}/api/file/${OWNER}/report.pdf>`,
    "",
    `Another address, always left alone: ![foreign](https://elsewhere.example${img(OWNER, "dog.png")})`,
    "",
    `Query and hash are kept: ![q](${img(OWNER, "dog.png")}?v=2) and [pdf](/api/file/${OWNER}/report.pdf#page=1)`,
    "",
    `Image with a title: ![titled](${img(OWNER, "cat.png")} "A titled cat")`,
  ].join("\n"));

  await note(OWNER, CATEGORY, "05 Odd names", U.names, [
    "# Odd names",
    `Spaces: ![holiday](${img(OWNER, "my holiday photo.png")})`,
    "",
    `Unicode: ![café](${img(OWNER, "café.png")})`,
    "",
    `Same name, two folders, the second one becomes same-name-1.png: ![a](${img(OWNER, "same-name.png")}) [b](/api/file/${OWNER}/same-name.png)`,
  ].join("\n"));

  await note(OWNER, CATEGORY, "06 Shared image A", U.sharedA, `One upload in two notes, hardlinked into both: ![shared](${img(OWNER, "shared.png")})`);
  await note(OWNER, CATEGORY, "07 Shared image B", U.sharedB, `Same upload again: ![shared](${img(OWNER, "shared.png")})`);

  await note(OWNER, CATEGORY, "08 Broken and hostile", U.broken, [
    "# Broken and hostile",
    "All of these stay as they are and show up in the report.",
    "",
    `Missing file: ![gone](${img(OWNER, "does-not-exist.png")})`,
    "",
    `Symlink to users.json: ![link](${img(OWNER, "points-at-users.png")})`,
    "",
    `Traversal: ![t](/api/image/${OWNER}/..%2F..%2F..%2Fusers%2Fusers.json)`,
    "",
    `Owner segment traversal: ![t](/api/image/..%2Fusers/users.json)`,
  ].join("\n"));

  await note(OWNER, CATEGORY, "09 Encrypted", U.encrypted, await encrypt([
    "# Encrypted",
    `Passphrase is ${PASSPHRASE}. The migration can't read this, so it stays.`,
    "Open it, decrypt, edit and save: the image below should move on save.",
    "",
    `![encrypted](${img(OWNER, "encrypted.png")})`,
  ].join("\n")), { encrypted: "true", encryptionMethod: "xchacha" });

  await note(OWNER, CATEGORY, "10 Duplicate uuid one", U.duplicate, `Two files share this uuid, both are left alone: ![cat](${img(OWNER, "cat.png")})`);
  await note(OWNER, CATEGORY, "11 Duplicate uuid two", U.duplicate, `Second claimant: ![dog](${img(OWNER, "dog.png")})`);

  await note(OWNER, CATEGORY, "12 Friend can edit", U.crossEdit, [
    `${FRIEND} can edit this note, so their upload is adopted and listed in the report.`,
    "",
    `![friend](${img(FRIEND, "friend-edit.png")})`,
  ].join("\n"), { sharedWith: `${FRIEND}:rw` });

  await note(OWNER, CATEGORY, "13 Friend can only read", U.crossRead, [
    `${FRIEND} can only read this note, so their upload is NOT adopted and stays on the old URL.`,
    "",
    `![friend](${img(FRIEND, "friend-read.png")})`,
  ].join("\n"), { sharedWith: `${FRIEND}:r` });

  await note(OWNER, CATEGORY, "14 Public", U.publicNote, `Public note. After the migration, open /public/note/${U.publicNote} logged out and the image loads.\n\n![public](${img(OWNER, "public.png")})`, { sharedWith: "public:r" });

  await note(OWNER, CATEGORY, "15 Shared with viewer", U.viewerNote, `${VIEWER} can read this one and see its image.\n\n![dog](${img(OWNER, "dog.png")})`, { sharedWith: `${VIEWER}:r` });

  await note(OWNER, CATEGORY, "16 Private", U.privateNote, [
    `${VIEWER} must NOT see this image even though they hold a share from ${OWNER} (the advisory).`,
    "",
    `![secret](${img(OWNER, "secret.png")})`,
    "",
    `As ${VIEWER}, try /api/attachment/${U.privateNote}/secret.png after the migration: 404.`,
  ].join("\n"));

  await note(OWNER, path.join(".archive", CATEGORY), "17 Archived", U.archived, `Archived notes move too: ![archived](${img(OWNER, "archived.png")})`);
  await note(OWNER, ".templates", "18 Seed template", U.template, `Template image, carried into every note made from this template: ![template](${img(OWNER, "template.png")})`);

  await note(OWNER, READ_ONLY_CATEGORY, "19 In a read-only folder", U.readOnly, `Jotty can't write here, so this stays: ![ro](${img(OWNER, "readonly.png")})`);
  await note(OWNER, READ_ONLY_CATEGORY, "20 Read-only and unstamped", undefined, `No uuid and a read-only folder, reported as locked: ![ro](${img(OWNER, "readonly.png")})`);

  await note(OWNER, CATEGORY, "21 Gallery", U.gallery, [
    "# Gallery",
    ...Array.from({ length: 30 }, (_, i) => `![g${i + 1}](${img(OWNER, `gallery-${i + 1}.png`)})`),
  ].join("\n\n"));

  await note(OWNER, CATEGORY, "22 Legacy share", U.legacyShare, [
    V1
      ? `Shared with ${FRIEND} (edit) through the old .sharing.json, so the sharing migration has to run first for this upload to be adopted.`
      : `Shared with ${FRIEND} (edit) in frontmatter.`,
    "",
    `![legacy share](${img(FRIEND, "legacy-share.png")})`,
  ].join("\n"), V1 ? {} : { sharedWith: `${FRIEND}:rw` });

  await note(FRIEND, CATEGORY, "23 Friend's own note", U.friendNote, `${FRIEND}'s note embedding ${OWNER}'s upload, which ${OWNER} can't edit here, so it stays: ![cat](${img(OWNER, "cat.png")})`);

  await note(OWNER, CATEGORY, "24 Markdown oddities", U.markers, [
    "# Oddities",
    `Escaped underscore in a name: ![x](${img(OWNER, "cat_photo.png").replace("_", "\\_")})`,
    "",
    `Inside a table: | col |\n| --- |\n| ![t](${img(OWNER, "dog.png")}) |`,
    "",
    `In a blockquote:\n> ![q](${img(OWNER, "cat.png")})`,
    "",
    `- [ ] task with ![todo](${img(OWNER, "cat.png")})`,
  ].join("\n"));
};

const seedChecklists = async () => {
  await checklist(OWNER, "25 Board with card images", U.board, ChecklistsTypes.KANBAN, [
    {
      text: "Card with an image",
      status: "todo",
      description: `Look at this ![card](${img(OWNER, "card.png")})\nand a file [📎 report.pdf](/api/file/${OWNER}/report.pdf)`,
    },
    {
      text: "Card with code in the description",
      status: "todo",
      description: `\`![nope](${img(OWNER, "card.png")})\` stays as it is`,
    },
  ]);

  await checklist(OWNER, "26 Simple list with images", U.list, ChecklistsTypes.SIMPLE, [
    { text: `Buy this ![dog](${img(OWNER, "dog.png")})` },
    { text: `Done with ![cat](${img(OWNER, "cat.png")})`, completed: true },
  ]);
};

const seedLegacySharing = async () => {
  const file = path.join(DATA_DIR, "notes", ".sharing.json");
  let existing: Record<string, unknown[]> = {};
  try {
    existing = JSON.parse(await fs.readFile(file, "utf-8"));
    throw new Error(`${file} already exists, refusing to merge into it`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  existing[FRIEND] = [
    { uuid: U.legacyShare, sharer: OWNER, permissions: { canRead: true, canEdit: true, canDelete: false } },
  ];
  await put(file, JSON.stringify(existing, null, 2));
};

const lockReadOnly = async () => {
  const dir = path.join(DATA_DIR, "notes", OWNER, READ_ONLY_CATEGORY);
  await fs.chmod(dir, 0o555);
  manifest.readOnly.push(path.relative(DATA_DIR, dir));
};

const seed = async () => {
  try {
    await fs.access(MANIFEST);
    throw new Error("Already seeded, run with --remove first");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }

  const users = (await readUsers()).map((user) => user.username);
  for (const name of [OWNER, FRIEND, VIEWER]) {
    if (!SAFE_USERNAME.test(name)) throw new Error(`Refusing unsafe username ${name}`);
    if (!users.includes(name)) throw new Error(`User ${name} isn't in users.json, pass --owner= --friend= --viewer=`);
  }

  manifest.schema = await fs.readFile(SCHEMA_FILE, "utf-8").catch(() => null);
  manifest.dirs.push(
    path.join("notes", OWNER, CATEGORY),
    path.join("notes", OWNER, ".archive", CATEGORY),
    path.join("notes", FRIEND, CATEGORY),
    path.join("checklists", OWNER, CATEGORY),
  );

  await seedLegacyFiles();
  await seedNotes();
  await seedChecklists();
  if (V1) await seedLegacySharing();
  await setAvatars({
    [OWNER]: img(OWNER, "avatar.png"),
    [FRIEND]: img(FRIEND, "avatar-that-was-deleted.png"),
    [VIEWER]: img(OWNER, "cat.png"),
  });
  await lockReadOnly();

  await fs.writeFile(SCHEMA_FILE, V1 ? "1" : "2");
  await fs.writeFile(MANIFEST, JSON.stringify(manifest, null, 2));

  console.log(`Seeded the attachments migration playground (${V1 ? "v1, sharing first" : "v2"}).`);
  console.log(`Notes are in "${CATEGORY}" for ${OWNER}, plus one for ${FRIEND}. Encrypted note passphrase: ${PASSPHRASE}`);
  console.log(`Open the app as an admin, you'll land on /migration. Undo with: yarn mock:data:attachments --remove`);
};

const remove = async () => {
  const saved: Manifest = JSON.parse(await fs.readFile(MANIFEST, "utf-8"));

  for (const dir of saved.readOnly) await fs.chmod(path.join(DATA_DIR, dir), 0o755).catch(() => undefined);
  for (const file of saved.files) await fs.rm(path.join(DATA_DIR, file), { force: true });
  for (const file of saved.files) await fs.rmdir(path.dirname(path.join(DATA_DIR, file))).catch(() => undefined);
  for (const dir of saved.dirs) await fs.rm(path.join(DATA_DIR, dir), { recursive: true, force: true });
  for (const id of saved.uuids) {
    await fs.rm(path.join(DATA_DIR, "attachments", id), { recursive: true, force: true });
  }
  await fs.rm(path.join(DATA_DIR, ".migrations"), { recursive: true, force: true });

  const users = await readUsers();
  for (const user of users) {
    if (!(user.username in saved.avatars)) continue;
    const before = saved.avatars[user.username];
    if (before === null) delete user.avatarUrl;
    else user.avatarUrl = before;
  }
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2));

  if (saved.schema === null) await fs.rm(SCHEMA_FILE, { force: true });
  else await fs.writeFile(SCHEMA_FILE, saved.schema);

  await fs.rm(MANIFEST, { force: true });
  console.log("Removed the attachments migration playground. Avatars written to data/attachments/avatars and user uuids were kept.");
};

(REMOVE ? remove() : seed()).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
