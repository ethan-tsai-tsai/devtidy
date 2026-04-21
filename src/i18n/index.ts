import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import zhTW from "./locales/zh-TW.json"

export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "zh-TW", label: "繁體中文" },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]["code"]

const STORAGE_KEY = "devtidy-language"

function detectLanguage(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === "en" || stored === "zh-TW") return stored
  const browser = navigator.language
  if (browser.startsWith("zh")) return "zh-TW"
  return "en"
}

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-TW": { translation: zhTW },
  },
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
})

export function setLanguage(code: LanguageCode) {
  localStorage.setItem(STORAGE_KEY, code)
  void i18n.changeLanguage(code)
}

export default i18n
