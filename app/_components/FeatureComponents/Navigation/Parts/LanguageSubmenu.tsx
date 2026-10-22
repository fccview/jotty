"use client";

import { useState, useMemo } from "react";
import { Search01Icon, ArrowLeft01Icon, Tick02Icon } from "hugeicons-react";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { cn, getFlagPath } from "@/app/_utils/global-utils";
import {
  MENU_CLASS,
  MENU_ITEM_ACTIVE_CLASS,
  MENU_ITEM_CLASS,
} from "@/app/_consts/styling";
import { updateUserSettings } from "@/app/_server/actions/users";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { isSpecialTranslation } from "@/app/_utils/special-translations-utils";

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
    let locales = availableLocales.filter((locale) => {
      if (isSpecialTranslation(locale.code)) {
        return locale.code === currentLocale;
      }
      return true;
    });

    if (!searchTerm.trim()) {
      return locales;
    }

    const searchLower = searchTerm.toLowerCase();
    return locales.filter(
      (locale) =>
        locale.name.toLowerCase().includes(searchLower) ||
        locale.code.toLowerCase().includes(searchLower)
    );
  }, [searchTerm, availableLocales, currentLocale]);

  const handleLanguageChange = async (localeCode: string) => {
    const result = await updateUserSettings({ preferredLocale: localeCode });
    if (result.success && result.data?.user) {
      setUser(result.data.user);
    }
    router.refresh();
    onClose();
  };

  return (
    <div className={cn("absolute right-0 top-full mt-1 w-56 z-50", MENU_CLASS)}>
      <div className="p-2 border-b border-dashed border-border flex items-center gap-2">
        <button
          onClick={onBack}
          aria-label={t("common.back")}
          className="p-1 text-muted-foreground hover:bg-muted hover:text-foreground rounded-jotty transition-colors"
        >
          <ArrowLeft01Icon className="h-4 w-4" />
        </button>
        <span className="text-md lg:text-sm font-medium flex-1">{t("common.language")}</span>
      </div>

      <div className="p-2 border-b border-dashed border-border">
        <div className="relative">
          <Search01Icon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            placeholder={t("common.search")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-full pl-7 pr-2 py-1 text-sm lg:text-xs bg-input border border-border rounded-jotty focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      <div className="max-h-[300px] overflow-y-auto flex flex-col gap-px p-1">
        {filteredLocales.length > 0 ? (
          filteredLocales.map((locale) => (
            <button
              key={locale.code}
              onClick={() => handleLanguageChange(locale.code)}
              className={cn(MENU_ITEM_CLASS, locale.code === currentLocale && MENU_ITEM_ACTIVE_CLASS)}
            >
              <img
                src={getFlagPath(locale.countryCode)}
                alt={locale.name}
                className="w-5 h-4 rounded-sm flex-shrink-0"
              />
              <span className="flex-1">{locale.name}</span>

              {locale.code === currentLocale &&
                <span className="text-xs text-primary flex items-center gap-1">
                  <Tick02Icon className="h-4 w-4" />
                </span>}
            </button>
          ))
        ) : (
          <div className="px-3 py-4 text-md lg:text-sm text-muted-foreground text-center">
            {t("common.noResults")}
          </div>
        )}
      </div>
    </div>
  );
};
