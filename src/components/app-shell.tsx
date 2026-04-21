import { Globe, HardDrive, ScanSearch, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import { LANGUAGES, setLanguage, type LanguageCode } from "@/i18n"

type AppTab = "scan" | "settings"

interface AppShellProps {
  children: React.ReactNode
  tab: AppTab
  onTabChange: (tab: AppTab) => void
}

function LanguageToggle() {
  const { i18n } = useTranslation()
  const current = i18n.language as LanguageCode
  const next = LANGUAGES.find((l) => l.code !== current) ?? LANGUAGES[0]

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={() => setLanguage(next.code)}
      aria-label={`Switch to ${next.label}`}
      title={next.label}
    >
      <Globe className="size-4" />
    </Button>
  )
}

export function AppShell({ children, tab, onTabChange }: AppShellProps) {
  const { t } = useTranslation()

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <HardDrive className="size-5 text-primary" />
            <h1 className="text-sm font-semibold tracking-tight">DevTidy</h1>
          </div>
          <nav className="flex items-center gap-1">
            <Button
              variant={tab === "scan" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-3 text-xs"
              onClick={() => onTabChange("scan")}
            >
              <ScanSearch className="size-3.5" />
              {t("nav.scan")}
            </Button>
            <Button
              variant={tab === "settings" ? "secondary" : "ghost"}
              size="sm"
              className="h-7 gap-1.5 px-3 text-xs"
              onClick={() => onTabChange("settings")}
            >
              <Settings className="size-3.5" />
              {t("nav.settings")}
            </Button>
          </nav>
        </div>
        <div className="flex items-center gap-1">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
