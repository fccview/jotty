# LDAP authentication

`jotty·page` can check logins directly against an LDAP or Active Directory server. Users type their usual username and password into the normal login form. There are no browser redirects.

## Requirements

- An LDAP server reachable from the container (OpenLDAP, LLDAP, Active Directory, FreeIPA, etc.)
- A service account DN ("bind user") and password with search access to the user tree
- The **`memberof` overlay** enabled on the LDAP server, if you want group-based access control or admin promotion. Without it, `LDAP_USER_GROUPS` and `LDAP_ADMIN_GROUPS` silently do nothing. Every authenticated user gets in and nobody becomes admin.

## Quick start

```yaml
services:
  jotty:
    environment:
      - AUTH_MODE=ldap
      - LDAP_URL=ldap://ldap.example.com:389
      - LDAP_BIND_DN=cn=service,dc=example,dc=com
      - LDAP_BIND_PASSWORD=service-account-password
      - LDAP_BASE_DN=ou=users,dc=example,dc=com
```

## Environment variables

### Required

- `AUTH_MODE=ldap` turns on LDAP authentication. Users log in with the normal username and password form, and the OIDC "Sign in with SSO" button is hidden. The old `SSO_MODE=ldap` still works as a fallback.
- `LDAP_URL=ldap://ldap.example.com:389` is the URL of your LDAP server. Use `ldaps://` on port `636` for TLS.
- `LDAP_BIND_DN=cn=service,dc=example,dc=com` is the distinguished name of the service account Jotty uses to search the directory.
- `LDAP_BIND_PASSWORD=secret` is the service account password. See [Docker secrets](#docker-secrets) if you'd rather not keep it in plain sight.
- `LDAP_BASE_DN=ou=users,dc=example,dc=com` is the base DN Jotty searches for users.

### Optional

- `SSO_FALLBACK_LOCAL=yes` lets the login form accept both LDAP credentials and local accounts.
- `LDAP_USER_ATTRIBUTE=uid` is the LDAP attribute matched against the username someone types. Defaults to `uid`. Use `sAMAccountName` for Active Directory.
- `LDAP_ADMIN_GROUPS=cn=admins,ou=groups,dc=example,dc=com` is a pipe-separated list of group DNs. A user whose `memberOf` contains any of them becomes admin on first login. DNs contain commas, so separate groups with `|`, not `,`.
- `LDAP_USER_GROUPS=cn=jotty,ou=groups,dc=example,dc=com` is a pipe-separated list of group DNs. When set, only members of these groups (or of the admin groups) can log in. Anyone else gets an "unauthorized" error.
- `LDAP_BIND_PASSWORD_FILE=/run/secrets/ldap_password` is a path to a file holding the service account password. It wins over `LDAP_BIND_PASSWORD` if both are set. See [Docker secrets](#docker-secrets).

## Group-based access control

`LDAP_USER_GROUPS` and `LDAP_ADMIN_GROUPS` are both matched against the `memberOf` attribute on the user's LDAP entry. It's a multi-value attribute with one group DN per line, for example:

```
uid: alice
memberOf: cn=admins,ou=groups,dc=example,dc=com
memberOf: cn=jotty,ou=groups,dc=example,dc=com
```

How access is decided:
- With `LDAP_USER_GROUPS` set, the user has to be in at least one listed group **or** in an `LDAP_ADMIN_GROUPS` group. Admins skip the user group check.
- Without `LDAP_USER_GROUPS`, every LDAP user who authenticates gets in.
- Admin status from `LDAP_ADMIN_GROUPS` is applied on first login, and a user can be promoted later by adding them to the admin group. Jotty never revokes it automatically.

> [!IMPORTANT]
> None of this works without the `memberof` overlay on your LDAP server. On OpenLDAP that's the `memberof` module, FreeIPA has a `memberof` plugin, and Active Directory has it built in. Without the overlay, `memberOf` never shows up on user entries and group checks do nothing.

## Active Directory notes

For Active Directory, set:

```yaml
- LDAP_USER_ATTRIBUTE=sAMAccountName
- LDAP_URL=ldap://dc.example.com:389
- LDAP_BASE_DN=CN=Users,DC=example,DC=com
- LDAP_BIND_DN=CN=service,CN=Users,DC=example,DC=com
```

Active Directory has `memberOf` built in, so group-based access control needs no extra setup.

## LDAPS (TLS)

Use `ldaps://` and port `636`:

```yaml
- LDAP_URL=ldaps://ldap.example.com:636
```

`ldapts` checks the server certificate against the system CA store by default. With a self-signed certificate you need to get your CA certificate into the container. The easiest way is to mount it and set `NODE_EXTRA_CA_CERTS`:

```yaml
services:
  jotty:
    environment:
      - NODE_EXTRA_CA_CERTS=/app/config/ldap-ca.crt
    volumes:
      - ./ldap-ca.crt:/app/config/ldap-ca.crt:ro
```

## Docker secrets

<details>
<summary>Keeping the service account password out of the environment</summary>

To keep the service account password out of `docker inspect` output, put it in a secrets file:

```yaml
services:
  jotty:
    environment:
      - AUTH_MODE=ldap
      - LDAP_URL=ldap://ldap.example.com:389
      - LDAP_BIND_DN=cn=service,dc=example,dc=com
      - LDAP_BIND_PASSWORD_FILE=/run/secrets/ldap_password
      - LDAP_BASE_DN=ou=users,dc=example,dc=com
    secrets:
      - ldap_password

secrets:
  ldap_password:
    file: ./secrets/ldap_password.txt
```

```bash
mkdir secrets
echo "your-service-account-password" > secrets/ldap_password.txt
chmod 600 secrets/ldap_password.txt
```

</details>

## Limitations

jotty·page keeps a **local copy** of each user account and only talks to LDAP at login. So:

- Changing a password or deleting a user in jotty's admin panel does **not** reach the LDAP server.
- Changing a password in jotty's personal settings does nothing for LDAP login. The user always authenticates against LDAP.
- Deleting a user in jotty removes their local notes and checklists, but leaves them in the directory.
- Admin status comes from `LDAP_ADMIN_GROUPS` on first login. Taking someone out of the admin group in LDAP won't revoke their admin status in jotty. A jotty admin has to do that by hand.

## Troubleshooting

### Disclaimer

LDAP support was built with the help of Claude Code. Here's what has actually been tested:
  * The LDAP server was [lldap](https://github.com/lldap/lldap).
  * Every environment variable except `LDAP_BIND_PASSWORD_FILE` and `LDAP_USER_ATTRIBUTE`.
  * The group-based access logic described above.
  * First start behaviour.

No other LDAP server has been tested yet.

### Login fails with "Authentication service unavailable"

Either the service account bind or the LDAP search failed. Usually that's a refused connection, a DNS failure or a wrong URL. Set `DEBUGGER=true` to log the real error to stdout:

```yaml
- DEBUGGER=true
```

### Login fails with "Invalid username or password" but credentials are correct

- Check that `LDAP_USER_ATTRIBUTE` matches the attribute used for login. OpenLDAP typically uses `uid`; Active Directory uses `sAMAccountName`.
- Check that the user sits somewhere under `LDAP_BASE_DN`.
- Check that the service account can read the base DN.

### Login fails with "You are not authorized"

The password was right, but the user isn't in any group listed in `LDAP_USER_GROUPS`. Add them to one of those groups in the directory, or remove `LDAP_USER_GROUPS` to let every authenticated user in.

### Group membership is not being detected

Check that the `memberof` overlay is enabled on your LDAP server. You can look at the user's entry directly:

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=service,dc=example,dc=com" -w secret \
  -b "ou=users,dc=example,dc=com" "(uid=alice)" memberOf
```

If `memberOf` does not appear in the output, the overlay is not active.

### First LDAP user is not getting admin rights

`LDAP_ADMIN_GROUPS` only kicks in when a user's `memberOf` contains a matching DN. With no admin groups configured, no LDAP user becomes admin automatically. Grant admin rights by hand in jotty's admin panel, or set `SSO_FALLBACK_LOCAL=yes` and create a local admin account during initial setup.
