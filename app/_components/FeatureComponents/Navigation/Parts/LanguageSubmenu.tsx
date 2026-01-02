"use client";

import { useState, useMemo } from "react";
import { Search01Icon, ArrowLeft01Icon, TranslateIcon } from "hugeicons-react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { getFlagPath } from "@/app/_utils/global-utils";
import { updateUserSettings } from "@/app/_server/actions/users";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

interface LanguageSubmenuProps {
  currentLocale: string;
  onClose: () => void;
  onBack: () => void;
}

export const LanguageSubmenu = ({ currentLocale, onClose, onBack }: LanguageSubmenuProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { availableLocales, setUser } = useAppMode();
  const router = useRouter();
  const t = useTranslations();

  const filteredLocales = useMemo(() => {
    if (!searchTerm.trim()) {
      return availableLocales;
    }

    const searchLower = searchTerm.toLowerCase();
    return availableLocales.filter(
      (locale) =>
        locale.name.toLowerCase().includes(searchLower) ||
        locale.code.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, availableLocales]);

  const handleLanguageChange = async (localeCode: string) => {
    const result = await updateUserSettings({ preferredLocale: localeCode });
    if (result.success && result.data?.user) {
      setUser(result.data.user);
    }
    router.refresh();
    onClose();
  };

  return (
    <div className="absolute right-0 top-0 w-56 bg-background border border-border rounded-jotty shadow-lg z-50">
      <div className="p-2 border-b border-border flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1 hover:bg-accent rounded-jotty transition-colors"
        >
          <ArrowLeft01Icon className="h-4 w-4" />
        </button>
        <span className="text-sm font-medium flex-1">{t("common.language")}</span>
      </div>
      
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search01Icon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("common.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full pl-7 pr-2 py-1 text-xs bg-input border border-border rounded-jotty focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {filteredLocales.length > 0 ? (
          filteredLocales.map((locale) => (
            <button
              key={locale.code}
              onClick={() => handleLanguageChange(locale.code)}
              className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent text-sm transition-colors ${
                locale.code === currentLocale ? "bg-accent/50" : ""
              }`}
            >
              <img
                src={getFlagPath(locale.countryCode)}
                alt={locale.name}
                className="w-5 h-4 rounded-sm flex-shrink-0"
              />
              <span className="flex-1">{locale.name}</span>
              {locale.code === currentLocale && (
                <span className="text-xs text-muted-foreground">✓</span>
              )}
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-sm text-muted-foreground text-center">
            {t("common.noResults")}
          </div>
        )}
      </div>
    </div>
  );
};
