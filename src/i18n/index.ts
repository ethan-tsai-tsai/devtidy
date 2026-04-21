import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import en from "./locales/en.json"
import zhTW from "./locales/zh-TW.json"
import zhCN from "./locales/zh-CN.json"
import ja from "./locales/ja.json"
import ko from "./locales/ko.json"
import es from "./locales/es.json"

export const LANGUAGES = [
  { code: "en",    label: "English" },
  { code: "zh-TW", label: "繁體中文" },
  { code: "zh-CN", label: "简体中文" },
  { code: "ja",    label: "日本語" },
  { code: "ko",    label: "한국어" },
  { code: "es",    label: "Español" },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]["code"]

const STORAGE_KEY = "devtidy-language"

function detectLanguage(): string {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && LANGUAGES.some((l) => l.code === stored)) return stored
  const browser = navigator.language
  if (browser.startsWith("zh-TW") || browser.startsWith("zh-Hant")) return "zh-TW"
  if (browser.startsWith("zh")) return "zh-CN"
  if (browser.startsWith("ja")) return "ja"
  if (browser.startsWith("ko")) return "ko"
  if (browser.startsWith("es")) return "es"
  return "en"
}

void i18n.use(initReactI18next).init({
  resources: {
    en:    { translation: en },
    "zh-TW": { translation: zhTW },
    "zh-CN": { translation: zhCN },
    ja:    { translation: ja },
    ko:    { translation: ko },
    es:    { translation: es },
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
