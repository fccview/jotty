import { getRequestConfig } from "next-intl/server";
import { Locales } from "@/app/_consts/global";

const validLocales = Locales.map((item) => item.locale);

export default getRequestConfig(async ({ locale }) => {
  const safeLocale = locale && validLocales.includes(locale) ? locale : "en";

  try {
    return {
      locale: safeLocale,
      messages: (await import(`./_translations/${safeLocale}.json`)).default,
    };
  } catch (error) {
    console.error(
      `Failed to load translations for locale: ${safeLocale}`,
      error
    );
    return {
      locale: "en",
      messages: (await import("./_translations/en.json")).default,
    };
  }
});
