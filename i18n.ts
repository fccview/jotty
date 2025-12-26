import { getRequestConfig } from 'next-intl/server';
import path from 'path';
import fs from 'fs';

export const getAvailableLocales = (): string[] => {
  const translationsDir = path.join(process.cwd(), 'app', '_translations');

  if (!fs.existsSync(translationsDir)) {
    return ['en'];
  }

  const files = fs.readdirSync(translationsDir);
  const locales = files
    .filter(file => file.endsWith('.json'))
    .map(file => file.replace('.json', ''));

  return locales.length > 0 ? locales : ['en'];
};

export const locales = getAvailableLocales();
export type Locale = string;

export default getRequestConfig(async () => {
  const locale = process.env.LOCALE || 'en';

  const availableLocales = getAvailableLocales();
  if (!availableLocales.includes(locale)) {
    console.warn(`Locale "${locale}" not found, falling back to "en"`);
    const fallbackLocale = 'en';
    const defaultMessages = (await import(`./app/_translations/${fallbackLocale}.json`)).default;

    return {
      locale: fallbackLocale,
      messages: defaultMessages,
    };
  }

  const defaultMessages = (await import(`./app/_translations/${locale}.json`)).default;

  const customTranslationFile = process.env.CUSTOM_TRANSLATION_FILE;
  let customMessages = {};

  if (customTranslationFile) {
    const customTranslationPath = path.join(
      process.cwd(),
      'config',
      customTranslationFile || 'custom-translations.json'
    );

    try {
      if (fs.existsSync(customTranslationPath)) {
        const customFileContent = fs.readFileSync(customTranslationPath, 'utf-8');
        customMessages = JSON.parse(customFileContent);
        console.log(`Custom translations loaded from: ${customTranslationPath}`);
      }
    } catch (error) {
      console.error(`Error loading custom translation file: ${error}`);
    }
  }

  const messages = {
    ...defaultMessages,
    ...customMessages,
  };

  return {
    locale,
    messages,
  };
});
