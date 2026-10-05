# Running more than one instance

Jotty can run as several instances against one shared `data/` directory, so live editing keeps working when one of them goes down. Nothing extra is installed: no database, no message broker. The instances talk to each other through small throwaway files in `data/.replica/`, and your notes stay the only thing that is ever stored.

## Setup

1. Mount the same `data/` directory into every instance.
2. Give every instance its own `JOTTY_NODE` name, for example `node1` and `node2`. That alone turns clustering on. Each instance also gets its own search index, `data/.relations_<name>.db`, rebuilt from your notes at startup, because two instances writing one index corrupts it.
3. Put every instance behind one address, and make your reverse proxy pass the `Host` header through untouched and forward WebSocket upgrades. If `Host` is rewritten, live editing quietly stops: the page loads and typing saves, but there are no avatars.

## What people see when an instance goes down

- The editor shows **Offline** and keeps accepting typing.
- The browser reconnects by itself, and the proxy sends it to a surviving instance.
- Typing done while offline is merged back in. If somebody saved the note in the meantime and nobody had it open, Jotty offers the offline text back with **Copy my changes** instead of overwriting.

Nobody has to do anything. Always use the same address, because the unsaved draft is kept per address.

## Limits

- Your servers' clocks and the shared storage's clock should agree within a few seconds.
