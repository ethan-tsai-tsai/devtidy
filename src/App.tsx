import { Component, useEffect, useMemo, useState, type ReactNode } from "react"
import { homeDir } from "@tauri-apps/api/path"
import { open, save } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { FolderSearch, Loader2, XCircle, AlertTriangle, Home, ShieldAlert, X, Download, RefreshCw, FileDown, ChevronDown, AlertCircle } from "lucide-react"
import { toast, Toaster } from "sonner"
import { useTranslation } from "react-i18next"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeProvider, useTheme } from "@/hooks/use-theme"
import { useUpdater } from "@/hooks/use-updater"
import { useScan } from "@/hooks/use-scan"
import { AppShell } from "@/components/app-shell"
import { StatCards } from "@/components/dashboard/stat-cards"
import { TypeChart } from "@/components/dashboard/type-chart"
import { SizeRanking } from "@/components/dashboard/size-ranking"
import { EnvTable } from "@/components/env-table/env-table"
import { SettingsPage } from "@/components/settings/settings-page"
import { Button } from "@/components/ui/button"
import { formatBytes } from "@/lib/format"

type AppTab = "scan" | "settings"

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div>
        <p className="font-medium text-destructive">{t("errors.somethingWentWrong")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onReset}>
        {t("errors.tryAgain")}
      </Button>
    </div>
  )
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => this.setState({ error: null })}
        />
      )
    }
    return this.props.children
  }
}

function UpdateBanner() {
  const { status, version, downloaded, total, installUpdate } = useUpdater()
  const { t } = useTranslation()

  if (status === "idle" || status === "checking") return null

  if (status === "available") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
        <Download className="size-4 shrink-0 text-blue-500" />
        <div className="flex-1">
          <span className="font-medium text-blue-700 dark:text-blue-400">
            {t("update.available", { version })}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">{t("update.restartHint")}</span>
        </div>
        <button
          onClick={() => void installUpdate()}
          className="rounded-sm text-xs font-medium text-blue-700 underline underline-offset-2 opacity-80 hover:opacity-100 dark:text-blue-400"
        >
          {t("update.installRestart")}
        </button>
      </div>
    )
  }

  if (status === "downloading") {
    const percent = total ? Math.round((downloaded / total) * 100) : null
    return (
      <div className="flex items-center gap-3 rounded-lg border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm">
        <Loader2 className="size-4 shrink-0 animate-spin text-blue-500" />
        <span className="text-blue-700 dark:text-blue-400">
          {percent !== null
            ? t("update.downloading", { percent })
            : t("update.downloadingNoPercent")}
        </span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm">
        <RefreshCw className="size-4 shrink-0 text-destructive" />
        <span className="flex-1 text-destructive">{t("update.checkFailed")}</span>
      </div>
    )
  }

  return null
}

function DiskAccessBanner() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    invoke<boolean>("check_full_disk_access")
      .then(setHasAccess)
      .catch(() => setHasAccess(true))
  }, [])

  if (hasAccess !== false || dismissed) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-yellow-500" />
      <div className="flex-1">
        <p className="font-medium text-yellow-700 dark:text-yellow-400">{t("diskAccess.title")}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{t("diskAccess.description")}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => void invoke("open_full_disk_access_settings")}
          className="rounded-sm text-xs font-medium text-yellow-700 underline underline-offset-2 opacity-80 hover:opacity-100 dark:text-yellow-400"
        >
          {t("diskAccess.openSettings")}
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="rounded-sm opacity-60 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}

function ScanPage() {
  const { status, results, durationMs, skippedCount, error, errorKind, currentPath, scanRoot, startScan, cancelScan, removeResult } = useScan()
  const { t } = useTranslation()

  async function handleExport(format: "csv" | "json") {
    const defaultName = `devtidy-report.${format}`
    const filters = format === "csv"
      ? [{ name: "CSV", extensions: ["csv"] }]
      : [{ name: "JSON", extensions: ["json"] }]

    const filePath = await save({ defaultPath: defaultName, filters }).catch(() => null)
    if (!filePath) return

    let content: string
    if (format === "json") {
      content = JSON.stringify(results, null, 2)
    } else {
      const header = "Type,Category,Path,Size (bytes),Last Modified,Has Project,Project Path"
      const rows = results.map((r) => [
        r.envType,
        r.envType === "NodeModules" ? "Node.js" : "Python",
        `"${r.path}"`,
        r.sizeBytes,
        r.lastModified,
        r.hasProjectFile,
        r.projectPath ? `"${r.projectPath}"` : "",
      ].join(","))
      content = [header, ...rows].join("\n")
    }

    try {
      await invoke("write_export_file", { path: filePath, content })
      toast.success(t("export.success", { format: format.toUpperCase() }))
    } catch (err) {
      toast.error(t("export.error", { error: String(err) }))
    }
  }

  const totalSize = useMemo(
    () => results.reduce((sum, r) => sum + r.sizeBytes, 0),
    [results]
  )

  const handleScanFolder = async () => {
    try {
      const selected = await open({ directory: true, title: "Select folder to scan" })
      if (selected) void startScan(selected)
    } catch {
      // Dialog was dismissed or failed — no action needed
    }
  }

  const handleScanHome = async () => {
    try {
      const home = await homeDir()
      void startScan(home)
    } catch {
      // homeDir() unavailable — unlikely but safe to ignore
    }
  }

  const summaryText = (() => {
    if (status !== "completed") return null
    const count = results.length
    const size = formatBytes(totalSize)
    const duration = durationMs !== null ? (durationMs / 1000).toFixed(1) : null
    if (duration && scanRoot) return t("scan.summaryWithRoot", { count, size, duration, root: scanRoot })
    if (duration) return t("scan.summaryWithDuration", { count, size, duration })
    return t("scan.summary", { count, size })
  })()

  return (
    <div className="space-y-6">
      <UpdateBanner />
      <DiskAccessBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">{t("scan.title")}</h2>
          {summaryText && (
            <p className="text-sm text-muted-foreground">{summaryText}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "scanning" ? (
            <Button variant="outline" onClick={() => { void cancelScan() }}>
              <XCircle className="size-4" />
              {t("scan.cancel")}
            </Button>
          ) : (
            <>
              {(status === "completed" || status === "cancelled") && results.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger render={
                    <Button variant="outline" size="sm">
                      <FileDown className="size-4" />
                      {t("export.button")}
                      <ChevronDown className="size-3 opacity-60" />
                    </Button>
                  } />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { void handleExport("csv") }}>
                      <Download className="size-4" />
                      {t("export.csv")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { void handleExport("json") }}>
                      <Download className="size-4" />
                      {t("export.json")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <Button onClick={() => { void handleScanFolder() }}>
                <FolderSearch className="size-4" />
                {t("scan.scanFolder")}
              </Button>
              <Button variant="outline" onClick={() => { void handleScanHome() }}>
                <Home className="size-4" />
                {t("scan.scanHome")}
              </Button>
            </>
          )}
        </div>
      </div>

      {status === "scanning" && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-8">
          <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{t("scan.scanning")}</p>
            {currentPath && (
              <p className="truncate font-mono text-xs text-muted-foreground/60" title={currentPath}>
                {currentPath}
              </p>
            )}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">
              {errorKind === "permission"
                ? t("errors.scanPermission")
                : errorKind === "not_found"
                  ? t("errors.scanNotFound")
                  : t("errors.scanFailed")}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{error}</p>
          </div>
        </div>
      )}

      {(status === "completed" || status === "cancelled") && skippedCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-yellow-500" />
          <p className="text-yellow-700 dark:text-yellow-400">
            {t("errors.skippedDirs", { count: skippedCount })}
          </p>
        </div>
      )}

      {(status === "completed" || status === "cancelled") && (
        <>
          <StatCards data={results} />
          <div className="grid gap-4 lg:grid-cols-2">
            <TypeChart data={results} />
            <SizeRanking data={results} scanRoot={scanRoot} />
          </div>
          <EnvTable data={results} scanRoot={scanRoot} onDeleted={removeResult} />
        </>
      )}

      {status === "idle" && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-12 text-center">
          <FolderSearch className="size-10 text-muted-foreground/50" />
          <div>
            <p className="font-medium">{t("scan.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("scan.emptyDescription")}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function ToasterWithTheme() {
  const { theme } = useTheme()
  const resolved = theme === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : theme
  return <Toaster theme={resolved} richColors closeButton position="bottom-right" />
}

export function App() {
  const [tab, setTab] = useState<AppTab>("scan")
  return (
    <ThemeProvider>
      <AppShell tab={tab} onTabChange={setTab}>
        <ErrorBoundary>
          {tab === "scan" ? <ScanPage /> : <SettingsPage />}
        </ErrorBoundary>
      </AppShell>
      <ToasterWithTheme />
    </ThemeProvider>
  )
}
