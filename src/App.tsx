import { Component, useMemo, useState, type ReactNode } from "react"
import { homeDir } from "@tauri-apps/api/path"
import { open } from "@tauri-apps/plugin-dialog"
import { FolderSearch, Loader2, XCircle, AlertTriangle, Home } from "lucide-react"
import { ThemeProvider } from "@/hooks/use-theme"
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

function ScanPage() {
  const { status, results, durationMs, error, currentPath, scanRoot, startScan, cancelScan, removeResult, renameResult } = useScan()

  const totalSize = useMemo(
    () => results.reduce((sum, r) => sum + r.sizeBytes, 0),
    [results]
  )

  const handleScanFolder = async () => {
    const selected = await open({
      directory: true,
      title: "Select folder to scan",
    })
    if (selected) void startScan(selected)
  }

  const handleScanHome = async () => {
    const home = await homeDir()
    void startScan(home)
  }

  return (
    <div className="space-y-6">
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
          <EnvTable data={results} scanRoot={scanRoot} onDeleted={removeResult} onRenamed={renameResult} />
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

export function App() {
  const [tab, setTab] = useState<AppTab>("scan")
  return (
    <ThemeProvider>
      <AppShell tab={tab} onTabChange={setTab}>
        <ErrorBoundary>
          {tab === "scan" ? <ScanPage /> : <SettingsPage />}
        </ErrorBoundary>
      </AppShell>
    </ThemeProvider>
  )
}
