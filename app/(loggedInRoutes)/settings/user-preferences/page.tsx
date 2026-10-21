import { UserPreferencesTab } from "@/app/_components/FeatureComponents/Profile/Parts/UserPreferencesTab";
import { getCategories } from "@/app/_server/actions/category";
import { Modes } from "@/app/_types/enums";
import { getAvailableLocalesWithNames } from '@/app/_utils/locale-utils';
import { getFlagPath } from '@/app/_utils/global-utils';
import { getCurrentUser } from "@/app/_server/actions/users";
import { isSpecialTranslation } from "@/app/_utils/special-translations-utils";

const FALLBACK_LOCALE = "en";

export default async function UserPreferencesPage() {
    const notesCategoriesResult = await getCategories(Modes.NOTES);
    const notesCategories = notesCategoriesResult.success ? notesCategoriesResult.data : [];
    const user = await getCurrentUser();
    const locales = await getAvailableLocalesWithNames();
    const wantedLocale = process.env.DEFAULT_LOCALE || FALLBACK_LOCALE;
    const instanceLocale = locales.find((locale) => locale.code === wantedLocale) || locales.find((locale) => locale.code === FALLBACK_LOCALE);
    const currentLocale = user?.preferredLocale || instanceLocale?.code || FALLBACK_LOCALE;

    const filteredLocales = locales.filter((locale) => {
        if (isSpecialTranslation(locale.code)) {
            return locale.code === currentLocale;
        }
        return true;
    });
    const localeOptions = filteredLocales.map(({ code, countryCode, name }) => {
        const flagPath = getFlagPath(countryCode);
        return {
            id: code,
            name: <><img src={flagPath} alt={name} className="w-5 h-4 inline mr-2" />{name}</>
        };
    });

    return (
        <UserPreferencesTab
            noteCategories={notesCategories || []}
            localeOptions={localeOptions}
            instanceLocale={instanceLocale?.code || FALLBACK_LOCALE}
            instanceLocaleName={instanceLocale?.name || FALLBACK_LOCALE}
        />
    );
}
