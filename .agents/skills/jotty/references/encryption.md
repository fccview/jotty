# Encryption

Notes can be encrypted with a passphrase (XChaCha) or with PGP. The passphrase belongs to the user. We never store it, log it, or write anything derived from the passphrase to disk. Same for private key passphrases.

Users have been told that losing a passphrase loses the note. Silently re-encrypting or re-keying one destroys their data.

## Opaque means opaque

Encrypted notes do not get indexed, previewed, summarised, or quietly decrypted so a feature can look inside. If the thing you are building would be easier with the plaintext, it does not get the plaintext.

Link-index updates skip ciphertext. Note history skips encrypted files. Search must not sniff inside them.

Frontmatter stays readable: uuid, title, `encrypted`, `encryptionMethod`. That is how the list can show a lock without opening the body. Do not put secrets in frontmatter.

## How it actually runs

XChaCha: `app/_server/actions/xchacha`. Passphrase arrives in FormData, key is derived with Argon2id, salt and nonce live next to the ciphertext, derived key is discarded. Algorithm field is `alg: "xchacha20"` so old envelopes stay decryptable.

PGP: `app/_server/actions/pgp`. Key files under `data/encryption/<username>/` (or a user-set custom path). Private key is armored and passphrase-protected. Public metadata may be stored on the user record. The passphrase is not.

Wrappers in `app/_utils/encryption-utils.ts` detect method and whether a body is encrypted. Feature code uses those, not `openpgp` / `libsodium` directly.

The client may cache a passphrase in memory for the session (`useNoteEditor`). Never `localStorage`. Wrong passphrase is a clean error, not a library stack trace.

## Rules

Do not log FormData that might contain a passphrase.

Do not "helpfully" decrypt on the server to power search, related notes, or an AI summary.

Do not rotate, strip, or rewrite ciphertext during an unrelated save.

Changing method or passphrase is decrypt with old, encrypt with new, write once. A half-written file is a destroyed note.

Operator docs: `howto/ENCRYPTION.md`.
