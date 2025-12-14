# PGP Encryption for Notes

Jotty supports PGP encryption for notes using 4096-bit RSA keys. 
This allows you to securely encrypt sensitive notes so that only you (or those with your private key) can decrypt and read them.

---

### 1. Set Up Encryption Keys

Navigate to **Profile → Encryption** tab and choose one of the following:

#### Generate New Key Pair

1. Click **"Generate New Key Pair"**
2. Enter your name and email (optional)
3. Create a strong passphrase (minimum 8 characters recommended)
   - **IMPORTANT**: store this passphrase in your password vault! It cannot be recovered.
4. Click **"Generate Keys"**
5. Your keys will be generated and saved automatically

#### Import Existing Keys

1. Click **"Import Existing Keys"**
2. Paste your ASCII-armored PGP public key (starts with `-----BEGIN PGP PUBLIC KEY BLOCK-----`)
3. Paste your ASCII-armored PGP private key (starts with `-----BEGIN PGP PRIVATE KEY BLOCK-----`)
4. Click **"Import Keys"**

---

### 2. Encrypt a Note

1. Open any note in the editor
2. Click the **⋯** (more) menu in the top-right
3. Select **"Encrypt Note"**
4. Choose:
   - **Use stored keys**: Use your configured keys (default)
   - **Use custom keys**: Paste a specific public key
5. Click **"Encrypt"**

**What gets encrypted:**
- Note content (body)
- Note title remains unencrypted for organization
- Category remains unencrypted for organization

---

### 3. Decrypt a Note

1. Open the encrypted note
   - If "Auto-decrypt on load" is enabled, you'll be prompted automatically, the note won't be decryptd on the server but only in the current tab session, refreshing the page will re-encrypt it
   - If disabled you'll just see a message like "This note is encrypted"
2. If not auto-prompted, click **⋯** menu → **"Decrypt Note"**
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

## Docker mapping

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

## Local Installation (Non-Docker)

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

Encrypted notes use YAML frontmatter to indicate encryption status:

```markdown
---
uuid: abc-123-def
title: My Secret Note
encrypted: true
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