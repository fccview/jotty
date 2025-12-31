import { getRequestConfig } from 'next-intl/server';
import path from 'path';
import fs from 'fs';

function _fallbackMerger(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = _fallbackMerger(target[key], source[key]);
        }
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

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

  const englishMessages = (await import(`./app/_translations/en.json`)).default;

  const localeMessages = locale !== 'en'
    ? (await import(`./app/_translations/${locale}.json`)).default
    : {};

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

  let messages = englishMessages;

  if (locale !== 'en') {
    messages = _fallbackMerger(englishMessages, localeMessages);
  }

  if (Object.keys(customMessages).length > 0) {
    messages = _fallbackMerger(messages, customMessages);
  }

  return {
    locale,
    messages,
  };
});
