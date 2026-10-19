# End-to-end (e2e) tests for web

Browser tests written in plain English for [Kane CLI](https://www.testmuai.com/kane-cli/).

| Test | What it covers |
|---|---|
| `checklist_test.md` | Admin setup, creating a checklist, adding two items and ticking one off |
| `note_test.md` | Admin setup, writing a note and opening it from the sidebar |

## Run

Start a fresh instance on port 4812:

```bash
docker run -d --name jotty-e2e -p 4812:3000 ghcr.io/fccview/jotty:latest
npm install -g @testmuai/kane-cli
kane-cli login
kane-cli testmd run e2e/kane/checklist_test.md
kane-cli testmd run e2e/kane/note_test.md
```

Both tests start from the admin setup page, so recreate the container before each run.
