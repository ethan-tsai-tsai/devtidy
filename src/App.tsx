import { Component, useEffect, useMemo, useState, type ReactNode } from "react"
import { homeDir } from "@tauri-apps/api/path"
import { open } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { FolderSearch, Loader2, XCircle, AlertTriangle, Home, ShieldAlert, X } from "lucide-react"
import { Toaster } from "sonner"
import { ThemeProvider, useTheme } from "@/hooks/use-theme"
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

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-8 text-center">
          <AlertTriangle className="size-8 text-destructive" />
          <div>
            <p className="font-medium text-destructive">Something went wrong</p>
            <p className="mt-1 text-sm text-muted-foreground">{this.state.error.message}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => this.setState({ error: null })}>
            Try again
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}

function DiskAccessBanner() {
  const [hasAccess, setHasAccess] = useState<boolean | null>(null)
  const [dismissed, setDismissed] = useState(false)

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
        <p className="font-medium text-yellow-700 dark:text-yellow-400">Full Disk Access required</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Some directories may be skipped. Grant access in{" "}
          <strong>System Settings → Privacy & Security → Full Disk Access</strong>.
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={() => void invoke("open_full_disk_access_settings")}
          className="rounded-sm text-xs font-medium text-yellow-700 underline underline-offset-2 opacity-80 hover:opacity-100 dark:text-yellow-400"
        >
          Open Settings
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
  const { status, results, durationMs, error, currentPath, scanRoot, startScan, cancelScan, removeResult } = useScan()

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

  return (
    <div className="space-y-6">
      <DiskAccessBanner />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Environments</h2>
          {status === "completed" && (
            <p className="text-sm text-muted-foreground">
              {results.length} found &middot; {formatBytes(totalSize)} total
              {durationMs !== null && ` · ${(durationMs / 1000).toFixed(1)}s`}
              {scanRoot && ` · ${scanRoot}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {status === "scanning" ? (
            <Button variant="outline" onClick={() => { void cancelScan() }}>
              <XCircle className="size-4" />
              Cancel
            </Button>
          ) : (
            <>
              <Button onClick={() => { void handleScanFolder() }}>
                <FolderSearch className="size-4" />
                Scan Folder
              </Button>
              <Button variant="outline" onClick={() => { void handleScanHome() }}>
                <Home className="size-4" />
                Scan Home
              </Button>
            </>
          )}
        </div>
      </div>

      {status === "scanning" && (
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-8">
          <Loader2 className="size-5 shrink-0 animate-spin text-muted-foreground" />
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Scanning for environments...</p>
            {currentPath && (
              <p className="truncate font-mono text-xs text-muted-foreground/60" title={currentPath}>
                {currentPath}
              </p>
            )}
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{error}</p>
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
            <p className="font-medium">No scan results yet</p>
            <p className="text-sm text-muted-foreground">
              Click Scan to find virtual environments on this machine.
            </p>
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
