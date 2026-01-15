"use server";

import path from 'path';
import fs from 'fs';

const _getLocaleName = (code: string): string => {
  try {
    const displayNames = new Intl.DisplayNames([code], { type: 'language' });
    return displayNames.of(code) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

const _getCountryCode = (locale: string): string => {
  const special: Record<string, string> = {
    en: 'GB',
    ja: 'JP',
    ko: 'KR',
    zh: 'CN',
    ar: 'SA',
    he: 'IL',
    uk: 'UA',
    cs: 'CZ',
    da: 'DK',
    el: 'GR',
    sv: 'SE',
    nb: 'NO',
    nn: 'NO',
    nl: 'NL',
    hi: 'IN',
    vi: 'VN',
    fa: 'IR',
    bn: 'BD',
  };
  return special[locale] || locale.toUpperCase();
}

export const getAvailableLocales = async (): Promise<string[]> => {
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

export const getAvailableLocalesWithNames = async (): Promise<{ code: string; countryCode: string; name: string }[]> => {
  const locales = await getAvailableLocales();
  return locales.map(code => ({
    code,
    countryCode: _getCountryCode(code),
    name: _getLocaleName(code),
  }));
}
