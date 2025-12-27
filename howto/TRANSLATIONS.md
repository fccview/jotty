# Translations

Jotty uses [next-intl](https://next-intl-docs.vercel.app/) for internationalization, providing a pretty flexible translation system.

## How Translation Works

### Translation System

1. **Locale Detection**: The application reads the `LOCALE` environment variable to determine which language to use (defaults to `en` if not set)
2. **Translation Loading**: The corresponding JSON file is loaded from `app/_translations/`
3. **Custom Overrides**: If a custom translation file is added in your `config/` directory and specified using the `CUSTOM_TRANSLATION_FILE` environment variable, it will be used instead of the default translations, allowing you to override specific strings. This should allow users who are not comfortable in making pull requests to still be able to have Jotty in their native language.

## Creating Custom Translations

### Option 1: Local Custom Translation File

You can create a custom translation file to override or extend the default translations without modifying the core files:

1. **Create a custom translation file** in the `config/` directory (e.g., `config/custom-translations.json`)

2. **Copy the structure** from the base translation file you want to customize:
   - View the [English translation file](../app/_translations/en.json) for the complete structure
   - You only need to include the keys you want to override, not the entire file

3. **Enable your custom translations** by setting the environment variable:
   ```bash
   CUSTOM_TRANSLATION_FILE=custom-translations.json
   ```

4. **Restart the application** for changes to take effect

### Option 2: Create a New Language

To add a completely new language to the application:

1. **Copy the English translation file**:
   ```bash
   cp app/_translations/en.json app/_translations/[language-code].json
   ```
   Replace `[language-code]` with the appropriate ISO 639-1 language code (e.g., `fr` for French, `de` for German, `es` for Spanish)

2. **Translate all strings** in the new file to your target language, make sure to keep the variable placeholders in english (e.g., `{count}`)

3. **Create a pull request** with your new translation file

## Contributing Translations

We welcome and encourage community translations! If you've translated the application into a new language, please consider contributing it back to the project.

## Translation File Structure

The translation files are organized into logical sections:

- `common` - Shared UI elements (buttons, labels, etc.)
- `auth` - Authentication and login
- `notes` - Notes feature
- `checklists` - Checklists feature
- `tasks` - Task management
- `profile` - User profile and settings
- And so on...

Please use common sense when creating new strings if you plan on creating new features.