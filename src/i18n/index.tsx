import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { en, type Translations } from "./en";
import { uk } from "./uk";

export type Language = "en" | "uk";

const translations: Record<Language, Translations> = { en, uk };

interface I18nContextType {
  lang: Language;
  t: Translations;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType>({
  lang: "uk",
  t: uk,
  setLanguage: () => {},
});

const STORAGE_KEY = "fittrack-lang";

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved === "en" ? "en" : "uk") as Language;
  });

  const setLanguage = useCallback((l: Language) => {
    setLang(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = translations[lang];

  return (
    <I18nContext.Provider value={{ lang, t, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useTranslation = () => useContext(I18nContext);
