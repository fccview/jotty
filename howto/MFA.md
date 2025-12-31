# Multi-Factor Authentication (MFA)

MFA adds an extra layer of security to your account by requiring both your password and a time-based one-time password (TOTP) from your authenticator app.

## What is MFA?

Multi-Factor Authentication (2FA/MFA) requires two pieces of information to log in:
1. **Something you know**: Your password
2. **Something you have**: Your phone with an authenticator app

Even if someone steals your password, they can't access your account without your authenticator app.

## Enable MFA

Navigate to **Profile → User Info**:

1. Click **Enable MFA**
2. Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
3. Enter the 6-digit code from your app
4. **CRITICAL**: Save your recovery code in a secure location (password vault)
5. MFA is now active

## Recovery Code

When enabling MFA, you receive a single recovery code. This code is for **administrator use only** to disable MFA if you lose access to your authenticator.

**Important:**
- Store the recovery code in your password vault
- The recovery code can be used multiple times
- Only administrators can use it to disable your MFA
- You cannot use it yourself to log in

## Regenerate Recovery Code

To generate a new recovery code:

1. Go to **Profile → User Info**
2. Click **Regenerate Recovery Code**
3. Enter your current MFA code to confirm
4. Save the new code immediately

**Warning:** This invalidates your previous recovery code.

## Disable MFA

1. Go to **Profile → User Info**
2. Click **Disable MFA**
3. Enter your current MFA code to confirm
4. MFA is now disabled

## Supported Authenticator Apps

Any TOTP-compatible authenticator app works:

- **Google Authenticator** (iOS, Android)
- **Authy** (iOS, Android, Desktop)
- **1Password** (Cross-platform)
- **Bitwarden** (Cross-platform)
- **Microsoft Authenticator** (iOS, Android)
- **Any RFC 6238 TOTP app**

## Lost Access to Authenticator?

If you lose your phone or authenticator app, contact your administrator. They can use your recovery code to disable MFA, allowing you to:

1. Log in with just your password
2. Re-enable MFA with a new QR code
3. Get a new recovery code
