# Multi-factor authentication (MFA)

With MFA on, logging in takes your password plus a time-based one-time password (TOTP) from an authenticator app. Somebody who steals your password still can't get in without your phone.

## Enable MFA

Go to **Profile -> User Info**:

1. Click **Enable MFA**
2. Scan the QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.)
3. Enter the 6-digit code from your app
4. **Save your recovery code in your password vault.**
5. MFA is on

## Recovery code

> [!IMPORTANT]
> Enabling MFA gives you a single recovery code. It's for admins only. If you lose your authenticator, an admin uses it to turn your MFA off.

- Keep it in your password vault
- It works more than once
- Only admins can use it to disable your MFA
- You can't log in with it yourself

## Regenerate recovery code

1. Go to **Profile -> User Info**
2. Click **Regenerate Recovery Code**
3. Enter your current MFA code to confirm
4. Save the new code straight away

The old recovery code stops working.

## Disable MFA

1. Go to **Profile -> User Info**
2. Click **Disable MFA**
3. Enter your current MFA code to confirm
4. MFA is off

## Supported authenticator apps

Any app that does RFC 6238 TOTP works, for example:

- Google Authenticator (iOS, Android)
- Authy (iOS, Android, desktop)
- 1Password (cross-platform)
- Bitwarden (cross-platform)
- Microsoft Authenticator (iOS, Android)

## Lost your authenticator?

Ask your admin. They use your recovery code to turn MFA off, and then you can:

1. Log in with just your password
2. Turn MFA back on with a new QR code
3. Save the new recovery code that comes with it
