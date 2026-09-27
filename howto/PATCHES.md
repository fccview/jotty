# Runtime patches

Some upstream bugs can only be fixed by rewriting a file inside `node_modules` after install. Next.js standalone builds ignoring `serverActions.bodySizeLimit` is one of them. jotty·page has a small patch runner for this. It runs every time the container starts, before the server boots.

## Where patches live

- `patches/` holds the patches that ship with the image. Each one is a small JS module that exports `{ name, apply(ctx) }`. They run in alphabetical order.
- `user_patches/` is optional and mounted from your host. Any `.js` file you put here runs **after** the built-in patches, so you can add your own tweaks without rebuilding the image.

## Adding your own patches

1. Create a `user_patches/` folder next to your `docker-compose.yml`.
2. Put a `.js` file in it, e.g. `user_patches/my-tweak.js`:

   ```js
   const fs = require("fs");
   const path = require("path");

   module.exports = {
     name: "my-tweak",
     apply: (ctx) => {
       /* ctx.projectRoot points at /app inside the container
          do whatever you need; return a short status string */
       return "applied";
     },
   };
   ```

3. Mount it in `docker-compose.yml`:

   ```yaml
   volumes:
     - ./user_patches:/app/user_patches:ro
   ```

4. Restart the container. Each patch logs its result to stdout on every start.

Patches run on every restart, so write them to be **idempotent**. Check whether the file already has the value you want (an anchored regex or a lookahead does the job) before you write, and running the same patch twice changes nothing the second time.

## Built-in patches

<details>
<summary><code>body-size-limit_20260427.js</code>, raises the 1MB Server Actions body cap</summary>

In standalone builds Next.js 16 ignores `serverActions.bodySizeLimit` from `next.config` and keeps the hard-coded 1MB cap in `app-page*.runtime.prod.js`. This patch rewrites that cap, so server actions (file uploads, drawio attachments, avatar uploads, etc.) accept bigger payloads.

- Set it with the `JOTTY_BODY_SIZE_LIMIT` env var.
- Defaults to `100mb`.
- Accepts `b`, `kb`, `mb`, `gb` (e.g. `50mb`, `2gb`).
- Tracking issue: [#422](https://github.com/fccview/jotty/issues/422)

```yaml
environment:
  - JOTTY_BODY_SIZE_LIMIT=250mb
```

</details>

<details>
<summary><code>freebsd_20260427.js</code>, FreeBSD compatibility (stubs <code>@swc/core</code>, forces webpack)</summary>

`@swc/core` has no prebuilt native binary for FreeBSD and no published WASM fallback, so anything that imports it (next-intl, @serwist/turbopack) crashes on require. Turbopack doesn't work there for the same reason. The patch does two things:

1. Stubs `node_modules/@swc/core/binding.js`, both the hoisted and the nested copies, so the imports succeed. The stub methods only throw if something calls them, and nothing in jotty does.
2. Patches `parseBundlerArgs()` in `next/dist/lib/bundler.js` to force the webpack bundler, so Next never tries to load Turbopack.

- It only runs when `JOTTY_FREEBSD` is set. Without it the patch doesn't read or touch anything under `node_modules`.
- It's off by default. On Linux, macOS or Windows, leave it unset.

```yaml
environment:
  - JOTTY_FREEBSD=1
```

</details>
