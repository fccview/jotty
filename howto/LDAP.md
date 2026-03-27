# LDAP Authentication

`jotty·page` supports authenticating users directly against an LDAP or Active Directory server. Users enter their usual username and password in the standard login form — no browser redirects.

## Requirements

- An LDAP server reachable from the container (OpenLDAP, LLDAP, Active Directory, FreeIPA, etc.)
- A service account DN ("bind user") and password with search access to the user tree
- For group-based access control or admin promotion: the **`memberof` overlay** must be enabled on the LDAP server. Without it, `LDAP_USER_GROUPS` and `LDAP_ADMIN_GROUPS` will silently have no effect (all authenticated users will be allowed in, none will be promoted to admin).

## Quick Start

```yaml
services:
  jotty:
    environment:
      - SSO_MODE=ldap
      - LDAP_URL=ldap://ldap.example.com:389
      - LDAP_BIND_DN=cn=service,dc=example,dc=com
      - LDAP_BIND_PASSWORD=service-account-password
      - LDAP_BASE_DN=ou=users,dc=example,dc=com
```

## Environment Variables

### Required

- `SSO_MODE=ldap` — Enables LDAP authentication. The standard username/password form is used; the OIDC "Sign in with SSO" button is not shown.
- `LDAP_URL=ldap://ldap.example.com:389` — URL of your LDAP server. Use `ldaps://` on port `636` for TLS.
- `LDAP_BIND_DN=cn=service,dc=example,dc=com` — Distinguished name of the service account used to search the directory.
- `LDAP_BIND_PASSWORD=secret` — Password of the service account. See [Docker Secrets](#docker-secrets) for storing this securely.
- `LDAP_BASE_DN=ou=users,dc=example,dc=com` — Base DN under which to search for users.

### Optional

- `SSO_FALLBACK_LOCAL=yes` — Allow both LDAP and local password login simultaneously. When set, the standard form accepts both LDAP credentials and local accounts. Useful for a local admin fallback.
- `LDAP_USER_ATTRIBUTE=uid` — The LDAP attribute matched against the submitted username. Defaults to `uid`. Use `sAMAccountName` for Active Directory.
- `LDAP_ADMIN_GROUPS=cn=admins,ou=groups,dc=example,dc=com` — Pipe-separated list of group DNs. Users whose `memberOf` attribute contains any of these DNs are granted admin rights on first login. **Note:** DNs contain commas, so groups must be separated with `|`, not `,`.
- `LDAP_USER_GROUPS=cn=jotty,ou=groups,dc=example,dc=com` — Pipe-separated list of group DNs. When set, only members of these groups (or admin groups) can log in. Users not in any listed group are rejected with an "unauthorized" error.
- `LDAP_BIND_PASSWORD_FILE=/run/secrets/ldap_password` — Path to a file containing the service account password. Takes priority over `LDAP_BIND_PASSWORD` if both are set. See [Docker Secrets](#docker-secrets).

## Group-Based Access Control

Both `LDAP_USER_GROUPS` and `LDAP_ADMIN_GROUPS` are matched against the `memberOf` attribute of the authenticated user's LDAP entry. This is a multi-value attribute listing all group DNs the user belongs to, for example:

```
uid: alice
memberOf: cn=admins,ou=groups,dc=example,dc=com
memberOf: cn=jotty,ou=groups,dc=example,dc=com
```

**Access logic:**
- If `LDAP_USER_GROUPS` is set: the user must be in at least one listed group, **or** in an `LDAP_ADMIN_GROUPS` group. Admin group membership bypasses the user group check.
- If `LDAP_USER_GROUPS` is not set: all successfully authenticated LDAP users are allowed in.
- Admin status (`LDAP_ADMIN_GROUPS`) is applied on first login and can be promoted later (e.g. by also adding the user to the admin group). It is never automatically revoked.

**Requirement:** The `memberof` overlay must be enabled on your LDAP server. On OpenLDAP this is the `memberof` module. Active Directory supports this natively. FreeIPA supports it with the `memberof` plugin. If the overlay is absent, `memberOf` will not appear on user entries and group checks will not work.

## Active Directory Notes

For Active Directory, set:

```yaml
- LDAP_USER_ATTRIBUTE=sAMAccountName
- LDAP_URL=ldap://dc.example.com:389
- LDAP_BASE_DN=CN=Users,DC=example,DC=com
- LDAP_BIND_DN=CN=service,CN=Users,DC=example,DC=com
```

`memberOf` is supported natively in Active Directory — no extra configuration needed for group-based access control.

## LDAPS (TLS)

Use `ldaps://` and port `636`:

```yaml
- LDAP_URL=ldaps://ldap.example.com:636
```

`ldapts` validates the server certificate against the system CA store by default. If you are using a self-signed certificate, you need to add your CA certificate to the container. The recommended approach is to mount it and set `NODE_EXTRA_CA_CERTS`:

```yaml
services:
  jotty:
    environment:
      - NODE_EXTRA_CA_CERTS=/app/config/ldap-ca.crt
    volumes:
      - ./ldap-ca.crt:/app/config/ldap-ca.crt:ro
```

## Docker Secrets

<details>
<summary>Storing the service account password securely</summary>

To prevent the service account password from appearing in `docker inspect` output, use a secrets file:

```yaml
services:
  jotty:
    environment:
      - SSO_MODE=ldap
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

jotty·page manages a **local copy** of user accounts. LDAP is only consulted at login time. This means:

- Changing a user's password or deleting a user in jotty's admin panel does **not** propagate to the LDAP server.
- Changing a password in jotty's personal settings has no effect on LDAP login — the user always authenticates against LDAP.
- Deleting a user in jotty removes their local notes and checklists, but does not remove them from the directory.
- Admin status is set from `LDAP_ADMIN_GROUPS` on first login. Removing a user from the admin group in LDAP will not revoke their admin status in jotty (though a jotty admin can do so manually).

## Troubleshooting

### Disclaimer

LDAP support was implemented with the help of Claude code. It was tested under the following conditions:
  * LDAP server: [lldap](https://github.com/lldap/lldap)
  * Environment variables: all where tested except `LDAP_BIND_PASSWORD_FILE` and `LDAP_USER_ATTRIBUTE`.
  * Group-based access control: the logic described above was verified.
  * Correct first start behaviour was verified.

Other LDAP servers have not been tested, yet.

### Login fails with "Authentication service unavailable"

The service account bind or the LDAP search failed (connection refused, DNS failure, wrong URL). Set `DEBUGGER=true` in your environment to log the underlying error to stdout:

```yaml
- DEBUGGER=true
```

### Login fails with "Invalid username or password" but credentials are correct

- Check that `LDAP_USER_ATTRIBUTE` matches the attribute used for login. OpenLDAP typically uses `uid`; Active Directory uses `sAMAccountName`.
- Check that `LDAP_BASE_DN` covers the user's location in the directory tree.
- Verify the service account has read access to the base DN.

### Login fails with "You are not authorized"

The user authenticated successfully but is not a member of any group listed in `LDAP_USER_GROUPS`. Either add the user to a permitted group in the directory, or remove `LDAP_USER_GROUPS` to allow all authenticated users.

### Group membership is not being detected

Ensure the `memberof` overlay is enabled on your LDAP server. You can verify by checking the user's entry directly:

```bash
ldapsearch -x -H ldap://ldap.example.com \
  -D "cn=service,dc=example,dc=com" -w secret \
  -b "ou=users,dc=example,dc=com" "(uid=alice)" memberOf
```

If `memberOf` does not appear in the output, the overlay is not active.

### First LDAP user is not getting admin rights

`LDAP_ADMIN_GROUPS` is only evaluated when a user's `memberOf` contains a matching DN. If no admin groups are configured, no LDAP user will be automatically promoted to admin. You can manually grant admin rights from jotty's admin panel, or set `SSO_FALLBACK_LOCAL=yes` and create a local admin account during initial setup.
