"use client";

import { createContext, useContext } from "react";

import { i18nFor, type I18n } from ".";
import { DEFAULT_LOCALE, type Locale } from "./locales";

const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}

export function useI18n(): I18n {
  return i18nFor(useContext(LocaleContext));
}
