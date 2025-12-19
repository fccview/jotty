# Encryption for Notes

Jotty supports two encryption methods for securing your notes.

## Encryption Methods

### XChaCha20-Poly1305 (Default, Recommended)

- **Simpler**: Uses a passphrase only, no key management required
- **Faster**: Modern symmetric encryption algorithm
- **Secure**: 256-bit keys derived using Argon2id key derivation
- **Best for**: Most users who want simple, secure encryption

### PGP

- **Traditional**: Public-key cryptography with RSA-4096
- **Key Management**: Requires generating/managing key pairs
- **Interoperable**: Can encrypt/decrypt with external PGP tools
- **Best for**: Users who need PGP compatibility or already have PGP keys

**After a lot of reading around, I recommend XChaCha20 for most users** due to its simplicity and modern cryptographic design. I still love PGP so I have decided to implement both and let users decide which one they prefer (you can actually decrypt notes encrypted with both methods, but only one will be defaulted at once for encryption).

You can switch methods in **Profile → Encryption → Encryption Method**.

---

### 1. Choose Your Encryption Method

Navigate to **Profile → Encryption** tab:

1. Select your preferred **Encryption Method**:
   - **XChaCha20-Poly1305** - Passphrase-based encryption
   - **PGP** - Key pair-based encryption

### 2. Set Up Encryption

#### For XChaCha20-Poly1305

No setup required! Simply create a strong passphrase when encrypting your notes:

- Use a passphrase of at least 12 characters
- Include uppercase, lowercase, numbers, and symbols
- **IMPORTANT**: Store this passphrase in your password vault
- You'll need to enter it each time you encrypt or decrypt

#### For PGP

Navigate to **Profile → Encryption** tab and choose one of the following:

##### Generate New Key Pair

1. Click **"Generate New Key Pair"**
2. Enter your name and email (optional)
3. Create a strong passphrase (minimum 8 characters recommended)
   - **IMPORTANT**: store this passphrase in your password vault! It cannot be recovered.
4. Click **"Generate Keys"**
5. Your keys will be generated and saved automatically

##### Import Existing Keys

1. Click **"Import Existing Keys"**
2. Paste your ASCII-armored PGP public key (starts with `-----BEGIN PGP PUBLIC KEY BLOCK-----`)
3. Paste your ASCII-armored PGP private key (starts with `-----BEGIN PGP PRIVATE KEY BLOCK-----`)
4. Click **"Import Keys"**

---

### 3. Encrypt a Note

1. Open any note in the editor
2. Click the **⋯** (more) menu in the top-right
3. Select **"Encrypt Note"**

#### For XChaCha20-Poly1305

4. Enter your passphrase
5. Click **"Encrypt"**

#### For PGP

4. Choose:
   - **Use stored keys**: Use your configured keys (default)
   - **Use custom keys**: Paste a specific public key
5. Click **"Encrypt"**

**What gets encrypted:**
- Note content (body)
- Note title remains unencrypted for organization
- Category remains unencrypted for organization

---

### 4. Decrypt a Note

1. Open the encrypted note
   - If "Auto-decrypt on load" is enabled, you'll be prompted automatically, the note won't be decrypted on the server but only in the current tab session, refreshing the page will re-encrypt it
   - If disabled you'll just see a message like "This note is encrypted"
2. If not auto-prompted, click **⋯** menu → **"Decrypt Note"**

#### For XChaCha20-Poly1305

3. Enter your passphrase (the same one you used to encrypt)
4. Click **"Decrypt"**

#### For PGP

3. Choose your key source:
   - **Use stored keys**: Use your configured private key
   - **Use custom keys**: Paste a specific private key
4. Enter your passphrase
5. Click **"Decrypt"**

---

## Encryption Settings

### Auto-Decrypt on Load

**Location**: Profile → Encryption → Encryption Settings

When enabled (default):
- Encrypted notes automatically prompt for passphrase when opened

When disabled:
- Encrypted notes show a "this note is encrypted message"
- Must manually click "Decrypt Note" to decrypt - This WILL decrypt the note on the server
- You can always just "view" and encrypted note without decrypting it, but you won't be able to edit it.

**Note**: Even with auto-decrypt enabled, your passphrase is NEVER stored. You must enter it each time.

---

## Docker Mapping (PGP Only)

### Mapping Custom Keys for Docker

If you want to use a custom location for your encryption keys (instead of the default `./data/encryption/{username}/`):

1. **Create your custom directory structure on your host:**
   ```bash
   mkdir -p ./my-custom-keys/{username}/
   ```
   Replace `{username}` with your actual username and use your desired custom path.

2. **Place the required files in your custom directory:**

   **public.asc** (mandatory for encryption):
   - Your ASCII-armored PGP public key file
   
   **private.asc** (mandatory for decryption):
   - Your ASCII-armored PGP private key file

3. **Add volume mapping in `docker-compose.yml`:**

   Add this line to the `volumes` section under the `jotty` service:
   ```yaml
   services:
     jotty:
       volumes:
         - ./data:/app/data:rw
         - ./config:/app/config:rw
         - ./cache:/app/.next/cache:rw
         - ./my-custom-keys/{username}:/app/data/encryption/{username}:ro
   ```
   Replace `{username}` with your actual username and `./my-custom-keys/{username}` with your custom host path. Use `:ro` for read-only or `:rw` for read-write access.

4. **Restart your container:**

5. **Verify keys are detected:**
   - Go to **Profile → Encryption**
   - You should see your key information displayed

**Note**: The "Custom Key Path" setting in the UI is for **local installations only**, not Docker deployments.

---

## Local Installation (Non-Docker, PGP Only)

### Custom Key Path

For local installations, you can specify a custom absolute path for key storage:

1. Go to **Profile → Encryption**
2. Under "Custom Key Path (Local Installations)", enter an absolute path:
   - Linux/Mac: `/home/user/my-encryption-keys`
   - Windows: `C:\Users\user\my-encryption-keys`
3. Click **"Set Custom Path"**

**Important**: The path must:
- Be an absolute path (not relative)
- Exist and be writable by the application
- Have proper permissions

---

## File Format

Encrypted notes use YAML frontmatter to indicate encryption status.

### XChaCha20-Poly1305 Format

```markdown
---
uuid: abc-123-def
title: My Secret Note
encrypted: true
encryptionMethod: xchacha
---

{"alg":"xchacha20","salt":"a1b2c3...","nonce":"x1y2z3...","data":"encrypted..."}
```

### PGP Format

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

- Encrypted note content cannot be searched by the search feature
- Note titles and metadata remain searchable

### Sharing

- Encrypted notes are only decryptable by the key owner
- Shared encrypted notes will appear encrypted to others

### Performance

- Large notes take longer to encrypt/decrypt
- Decryption happens in real-time when opening notes

### Recovery

- No passphrase recovery mechanism (by design for security)
- Lost passphrase = permanent loss of access to encrypted notes
- Always maintain secure backups of your private key and passphrase


# Coming soon

Hi! fccview here! I understand some people may want ABSOLUTE privacy when encrypting, so I am going to (at some point in the future) encrypt frontmatter/title on top of the note body. This requires a lot of thinking as it will break a ton of features if not done properly, but I didn't want this to block the release of the current system.