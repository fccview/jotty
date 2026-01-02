"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { updateUserSettings } from "@/app/_server/actions/users";
import { useAppMode } from "@/app/_providers/AppModeProvider";
import { getFlagPath } from '@/app/_utils/global-utils';
 
export const LanguageSelector = ({ currentLocale }: { currentLocale: string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [locales, setLocales] = useState<Array<{code: string, countryCode: string, name: string, flagPath: string}>>([]);
  const [currentFlagPath, setCurrentFlagPath] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { setUser, availableLocales } = useAppMode();

  useEffect(() => {
    const localesWithFlags = availableLocales.map((locale) => ({
      ...locale,
      flagPath: getFlagPath(locale.countryCode),
    }));
    setLocales(localesWithFlags);

    const current = localesWithFlags.find(l => l.code === currentLocale);
    if (current) setCurrentFlagPath(current.flagPath);
  }, [currentLocale, availableLocales]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleChange = async (locale: string) => {
    setIsOpen(false);
    const result = await updateUserSettings({ preferredLocale: locale });
    if (result.success && result.data?.user) {
      setUser(result.data.user);
    }
    router.refresh();
  };

  if (!currentFlagPath) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-6 w-6 rounded-full overflow-hidden hover:opacity-80 transition p-0 mt-2 border-0 flex-shrink-0"
      >
        <img 
          src={currentFlagPath} 
          alt="Current language" 
          className="w-full h-full object-cover"
        />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-card border rounded-jotty shadow-lg z-50">
          {locales.map(({ code, flagPath, name }) => (
            <button
              key={code}
              onClick={() => handleChange(code)}
              className="w-full flex items-center gap-3 px-4 py-2 hover:bg-accent"
            >
              <img src={flagPath} alt={name} className="w-5 h-4" />
              <span>{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

