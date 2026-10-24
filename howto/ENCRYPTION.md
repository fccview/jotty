# Encryption for notes

Jotty can encrypt a note with a passphrase (XChaCha20-Poly1305) or with PGP.

> [!CAUTION]
> There is no recovery. If you lose the passphrase, or the PGP private key, the note is gone. I can't get it back, your admin can't get it back, nobody can. Put the passphrase in a password manager before you encrypt anything you care about.

## Encryption methods

### XChaCha20-Poly1305 (default, recommended)

A passphrase is all you need, there are no keys to manage. It's a modern symmetric cipher, and the 256-bit key is derived from your passphrase with Argon2id. Pick this unless you have a reason not to.

### PGP

Public-key encryption with RSA-4096. You generate or import a key pair and look after it yourself. The upside is that notes work with external PGP tools, so it makes sense if you need PGP compatibility or already have keys.

> [!TIP]
> After a lot of reading around I recommend XChaCha20 for most people. It's simpler and the design is modern. I still love PGP, so both are in.

Jotty can decrypt notes encrypted with either method, but only one is the default for new encryption at any time.

You can switch methods in **Profile -> Encryption -> Encryption Method**.

---

### 1. Choose your encryption method

Go to the **Profile -> Encryption** tab and pick an **Encryption Method**:

- **XChaCha20-Poly1305**, passphrase-based
- **PGP**, key pair-based

### 2. Set up encryption

#### For XChaCha20-Poly1305

There's nothing to set up. You choose a passphrase when you encrypt a note:

- Use at least 12 characters
- Mix uppercase, lowercase, numbers and symbols
- **Store this passphrase in your password vault.** Lose it and the note is unreadable forever.
- You enter it every time you encrypt or decrypt

#### For PGP

Go to the **Profile -> Encryption** tab and either generate a key pair or import one.

##### Generate new key pair

1. Click **"Generate New Key Pair"**
2. Enter your name and email (optional)
3. Create a strong passphrase (at least 8 characters recommended)
   - **Store this passphrase in your password vault. It cannot be recovered.**
4. Click **"Generate Keys"**
5. Jotty generates and saves the keys

##### Import existing keys

1. Click **"Import Existing Keys"**
2. Paste your ASCII-armored PGP public key (starts with `-----BEGIN PGP PUBLIC KEY BLOCK-----`)
3. Paste your ASCII-armored PGP private key (starts with `-----BEGIN PGP PRIVATE KEY BLOCK-----`)
4. Click **"Import Keys"**

---

### 3. Encrypt a note

1. Open the note in the editor
2. Click the **⋯** (more) menu in the top-right
3. Select **"Encrypt Note"**

#### For XChaCha20-Poly1305

4. Enter your passphrase
5. Click **"Encrypt"**

#### For PGP

4. Choose a key source:
   - **Use stored keys** uses your configured keys (default)
   - **Use custom keys** lets you paste a specific public key
5. Click **"Encrypt"**

Only the note body gets encrypted. The title and category stay in plain text so you can still organise the note.

---

### 4. Decrypt a note

1. Open the encrypted note
   - With "Auto-decrypt on load" enabled you get a passphrase prompt straight away. The note is decrypted in the current tab only, never on the server, and refreshing the page puts it back to encrypted.
   - With it disabled you see a "This note is encrypted" message instead
2. If there was no prompt, click the **⋯** menu, then **"Decrypt Note"**

#### For XChaCha20-Poly1305

3. Enter the passphrase you used to encrypt it
4. Click **"Decrypt"**

#### For PGP

3. Choose a key source:
   - **Use stored keys** uses your configured private key
   - **Use custom keys** lets you paste a specific private key
4. Enter your passphrase
5. Click **"Decrypt"**

---

## Encryption settings

### Auto-decrypt on load

This lives in **Profile -> Encryption -> Encryption Settings**, labelled "Prompt for passphrase when opening encrypted notes".

It's on by default. Opening an encrypted note prompts for the passphrase.

When it's off:
- Encrypted notes show a "This note is encrypted" message
- You have to click "Decrypt Note" yourself, and that **does** decrypt the note on the server
- You can still just view an encrypted note without decrypting it, but you can't edit it that way

Either way, Jotty never stores your passphrase. You type it every time.

---

## Docker mapping (PGP only)

### Mapping custom keys for Docker

Keys live in `./data/encryption/{username}/` by default. To keep them somewhere else:

1. **Create the directory on your host:**
   ```bash
   mkdir -p ./my-custom-keys/{username}/
   ```
   Replace `{username}` with your username and the path with wherever you want the keys.

2. **Put your key files in it:**

   - `public.asc`, your ASCII-armored PGP public key. Needed to encrypt.
   - `private.asc`, your ASCII-armored PGP private key. Needed to decrypt.

3. **Add a volume mapping in `docker-compose.yml`:**

   Add the last line below to the `volumes` section of the `jotty` service:
   ```yaml
   services:
     jotty:
       volumes:
         - ./data:/app/data:rw
         - ./config:/app/config:rw
         - ./cache:/app/.next/cache:rw
         - ./my-custom-keys/{username}:/app/data/encryption/{username}:ro
   ```
   Replace `{username}` with your username and `./my-custom-keys/{username}` with your host path. Use `:ro` for read-only or `:rw` for read-write.

4. **Restart the container.**

5. **Check the keys were picked up** in **Profile -> Encryption**. Your key information should be there.

The "Custom Key Path" setting in the UI is for local installs only. It does nothing useful in Docker, use the volume mapping instead.

---

## Local installation (non-Docker, PGP only)

### Custom key path

On a local install you can store keys at any absolute path:

1. Go to **Profile -> Encryption**
2. Under "Custom Key Path (Local Installations)", enter an absolute path:
   - Linux/Mac: `/home/user/my-encryption-keys`
   - Windows: `C:\Users\user\my-encryption-keys`
3. Click **"Set Custom Path"**

The path has to be absolute, it has to exist, and the app needs permission to write to it.

---

## File format

Encrypted notes mark their encryption in the YAML frontmatter.

### XChaCha20-Poly1305 format

```markdown
---
uuid: abc-123-def
title: My Secret Note
encrypted: true
encryptionMethod: xchacha
---

{"alg":"xchacha20","salt":"a1b2c3...","nonce":"x1y2z3...","data":"encrypted..."}
```

### PGP format

```markdown
---
uuid: abc-123-def
title: My Secret Note
encrypted: true
encryptionMethod: pgp
---

-----BEGIN PGP MESSAGE-----
Version: OpenPGP.js v6.0.0

wcBMA... [encrypted content here] ...
=abc1
-----END PGP MESSAGE-----
```

---

## Limitations

### Search

Search can't see inside encrypted notes. Titles and metadata are still searchable.

### Sharing

Only the key owner can decrypt a note. If you share an encrypted note, the other user sees it encrypted.

### Performance

Big notes take longer to encrypt and decrypt. Decryption happens when you open the note.

### Recovery

There isn't any, on purpose.

- There is no passphrase reset of any kind
- A lost passphrase means the note is lost for good
- Back up your private key and passphrase somewhere safe, and do it before you need them


# Coming soon

Hi, fccview here. Some people want absolute privacy, so at some point I'm going to encrypt the frontmatter and title as well as the body. That needs a lot of thought, because done badly it breaks a ton of features, and I didn't want it to hold up the release of what's here now.
