# Translations

Jotty uses [next-intl](https://next-intl-docs.vercel.app/) for translations. The language files live in `app/_translations/`, one JSON file per language, with English as the complete one.

## How Jotty picks a language

1. The language the user chose in their own settings.
2. Otherwise, the `DEFAULT_LOCALE` environment variable. This is also what guests see on the login page before anyone has logged in.
3. Otherwise, `en`.

Jotty loads the matching file from `app/_translations/`. Any key missing from it falls back to English, so a half-finished translation still works.

If you set `CUSTOM_TRANSLATION_FILE`, Jotty then applies that file from your `config/` directory on top. Only the keys in your file change. This is for people who want Jotty in their language, or want to reword a few strings, without opening a pull request.

## Custom translations

### Option 1: a local custom translation file

1. Create a JSON file in the `config/` directory, for example `config/custom-translations.json`.

2. Copy in the keys you want to change, using the same structure as the base file:
   - The [English translation file](https://github.com/fccview/jotty/blob/main/app/_translations/en.json) has every key
   - You only need the keys you want to override, not the whole file

3. Point Jotty at it with the environment variable:
   ```bash
   CUSTOM_TRANSLATION_FILE=custom-translations.json
   ```

4. Restart Jotty so it picks up the variable.

### Option 2: a new language

1. Copy the English file:
   ```bash
   cp app/_translations/en.json app/_translations/[language-code].json
   ```
   Replace `[language-code]` with the ISO 639-1 code for the language, e.g. `fr` for French, `de` for German, `es` for Spanish.

2. Translate the strings. Leave the placeholders in curly braces as they are, in English (e.g. `{count}`).

3. Open a pull request with the new file.

## Contributing translations

If you've translated Jotty into a new language, or filled in gaps in an existing one, please send it back as a pull request. We already ship Klingon and pirate, so no language is too silly.

## Translation file structure

The files are split into sections by feature:

- `common` - shared UI bits like buttons and labels
- `auth` - authentication and login
- `notes` - notes
- `checklists` - checklists
- `tasks` - task management
- `profile` - user profile and settings
- and so on

If you're adding strings for a new feature, put them in the section for that feature and name the keys so the next person can find them.
