# Jotty

Jotty is a self-hosted app for notes, checklists and Kanban boards. There is no database. Every note, checklist, user and share is a file on a disk that the person running it owns.

If we corrupt one of those files there is no restore button and nobody to email. There is a person and whatever backup they happened to take.

This file covers what we value. Branching and merge requests live in `CONTRIBUTING.md`, feature documentation lives in `howto/`, and coding standards for agents live in `.claude/skills/jotty/`.

## The filesystem is the database

Read, change, write back on a shared file without a lock loses data. It has happened here. Take the lock around the whole sequence, starting at the read.

A write that fails halfway leaves a truncated note where a note used to be. Use the existing file helpers, they write atomically.

Indexes do not rebuild themselves. Add a write path, miss the rebuild, and search goes stale with nothing in the logs to say so.

Loops are expensive. One helper reading one item is fine. That same helper running once per item for a user with 800 notes is a stat storm. Caches and indexes already exist for this, look for them before you walk a directory yourself.

People update their instance when they remember, so the shape you are reading may have been written a year ago. Changing how something is stored means a migration, and it has to survive data that is old, new, half done or already migrated. We keep reading old shapes long after we stop writing them.

The REST API is a published contract. Users hit it with an API key from scripts, shortcuts and home automations, and they never read the changelog. Adding a field is safe. Renaming one, dropping one, changing a type or changing what a status value means will break somebody's morning routine.

The data directory on this machine holds real notes, usually mine. Don't clear it, reshape it or tidy it to make a test pass. There are mock generators when you need volume.

## Sharing and permissions

An item belongs to one user and sits in that user's folder. Everything else is a view onto it. Shares carry read, write, create and delete as four separate grants. Somebody who can tick items off your shopping list still can't delete it.

Every request that touches an item settles two things on the server. Who owns this path, and does the person asking hold the permission for what they are attempting. Client-side checks exist so users don't stare at buttons that will refuse them, and that is all they do. An action trusting an owner or a category sent up from the browser is an auth bug even when our own UI would never send a bad one.

Category names are user input and they end up in file paths. Check containment every time you build one.

A mutation shipped without its permission check is the first thing I look for in review.

## Encryption

Notes can be encrypted with a passphrase or with PGP. The passphrase belongs to the user. We never store it, log it, or write anything derived from it to disk. Same for private keys.

Encrypted notes are opaque. They don't get indexed, previewed, summarised or quietly decrypted so a feature can look inside. If something you're building would be much easier with the plaintext, it doesn't get the plaintext. Users have been told that losing a passphrase loses the note, so silently re-encrypting or re-keying one destroys their data.

The same boundary holds for the rest of it. Server modules handle user records, sessions, API keys and MFA secrets. Client components get the trimmed object. When a server helper turns up in a client bundle, fix the import chain instead of hiding it behind a dynamic import.

## Translations

Use translation keys. Buttons, toasts and any error message a user will read.

Users pick their language in settings and instances set a default, so a hardcoded string is an English word sitting in somebody's Korean interface today. Add your key to the English file, that one has to be complete. The other fourteen fall back, and filling them in is community work. Klingon and pirate are real locale files.

## Multiple devices

Somebody has Jotty open on a phone and a laptop at the same time. After a mutation that changes what another session can see, broadcast it. Wait for the server, broadcast, refresh. We don't do optimistic updates.

A spinner that never resolves and a checklist that loses a tick are what send somebody back to paper.

## How I like to work

Look before you build. This codebase is bigger than it looks and I name things for fun, so what you need probably exists under a name you wouldn't have picked. Most requests need a permission check, a flag on an existing type, or four lines where the neighbouring case is already handled.

Fix causes. A guard that stops the crash while leaving the file on disk wrong is worse than the crash.

Boy scout rule, within reason. Tidy the small mess next to your change while you're in the file. Don't turn a bug fix into a refactor of the module.

Don't run production builds, write to git, or edit the environment file, unless I asked for it in the message you're answering. If a variable is missing, name it and ask.

Treat all of this as good defaults. What I ask for in the message you're answering beats anything here. What you decide on your own doesn't, so if a rule here fights the task, say so and ask.

## Taste

- No comments. Say it in the naming, or say it to me in the pull request. A comment in a diff here reads as noise. JSDoc only where something genuinely can't be explained any other way.
- Arrow functions. Short camelCase names, roughly fifteen characters, and if the name needs a paragraph the function is doing too much.
- Constants, not magic strings. Enums for anything with a fixed set of values.
- `any` is not a solution, it is a deferral. If a type is fighting you, the type is usually right.
- Log when you catch. A swallowed error in a file-backed app is a mystery bug six months later.
- Small files, real hooks, actual modules. If a file has grown past the point where you can hold it in your head, split it while you're in there.
- New abstractions earn their place. Two similar things are not a pattern.
- Keep it quirky. The permission check is a bouncer and refusing you is a `refusalMessage`. Understandable first, funny second, but a codebase that reads like a tax form is one nobody wants to open on a Sunday.
- Prefer boring. Somebody's shopping list, somebody's work notes and somebody's diary are all in here.

## Words

Same words for the same things, please.

- **you** is the agent reading this. **we** is me, fccview, plus whoever is contributing. **user** is somebody logged into a running instance, not the developer and not me.
- **instance** is one deployment somebody self-hosts. It may have one user or forty. **admin** manages users and settings, **superadmin** is the first account and can do slightly more.
- **mode** is which side of the app you're in, notes or checklists. A lot of shared code branches on it.
- **item** is one note or one checklist. **category** is a folder a user organises items into. It nests, and its name is untrusted input in a path.
- **share** is a grant of an item or category to another user or to the public, carrying its own permissions. **mount** is how that share appears in the recipient's tree. The file still lives in the owner's folder.
- **index** is a derived file we keep so we don't have to walk the data directory to answer a question.
- **howto** is the user-facing documentation in this repo, written for the person running the instance.

## Verifying

Smallest thing that proves the change works. Type check, lint what you touched, run the tests covering the area, and the whole suite if you changed something shared.

The security tests cover auth, path containment and data leakage. If your change makes one fail, the change is wrong until proven otherwise. If you changed behaviour the tests cover, update them and tell me you did.