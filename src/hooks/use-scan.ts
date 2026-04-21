import { useCallback, useEffect, useRef, useState } from "react"
import { invoke, Channel } from "@tauri-apps/api/core"
import type { EnvEntry, ScanCache, ScanEvent } from "@/types/scan"

export type ScanStatus = "idle" | "scanning" | "completed" | "cancelled" | "error"

interface ScanState {
  status: ScanStatus
  results: EnvEntry[]
  durationMs: number | null
  skippedCount: number
  error: string | null
  errorKind: "permission" | "not_found" | "unknown" | null
  currentPath: string | null
}

const INITIAL_STATE: ScanState = {
  status: "idle",
  results: [],
  durationMs: null,
  skippedCount: 0,
  error: null,
  errorKind: null,
  currentPath: null,
}

export function useScan() {
  const [state, setState] = useState<ScanState>(INITIAL_STATE)
  const [scanRoot, setScanRoot] = useState<string | null>(null)
  const scanningRef = useRef(false)

  // Load cached scan results on startup.
  useEffect(() => {
    invoke<ScanCache | null>("load_scan_cache")
      .then((cache) => {
        if (cache && cache.results.length > 0) {
          setScanRoot(cache.rootPath)
          setState({
            status: "completed",
            results: cache.results,
            durationMs: cache.durationMs,
            skippedCount: 0,
            error: null,
            errorKind: null,
            currentPath: null,
          })
        }
      })
      .catch(() => {
        // Silently ignore cache load failures.
      })
  }, [])

  const startScan = useCallback(async (root: string) => {
    if (scanningRef.current) return
    scanningRef.current = true
    setScanRoot(root)

    setState({ status: "scanning", results: [], durationMs: null, skippedCount: 0, error: null, errorKind: null, currentPath: null })

    const onEvent = new Channel<ScanEvent>()
    onEvent.onmessage = (event) => {
      switch (event.event) {
        case "completed":
          setState({
            status: "completed",
            results: event.data.results,
            durationMs: event.data.durationMs,
            skippedCount: event.data.skippedCount,
            error: null,
            errorKind: null,
            currentPath: null,
          })
          scanningRef.current = false
          break
        case "progress":
          setState((prev) => ({ ...prev, currentPath: event.data.currentPath }))
          break
        case "cancelled":
          setState((prev) => ({ ...prev, status: "cancelled", currentPath: null }))
          scanningRef.current = false
          break
        case "error":
          setState((prev) => ({
            ...prev,
            status: "error",
            error: event.data.message,
            errorKind: event.data.kind,
            currentPath: null,
          }))
          scanningRef.current = false
          break
        case "started":
          setState((prev) => ({ ...prev, currentPath: null }))
          break
      }
    }

    try {
      await invoke("scan_envs", { root, onEvent })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      setState((prev) => ({ ...prev, status: "error", error: message, errorKind: "unknown" }))
      scanningRef.current = false
    }
  }, [])

  const cancelScan = useCallback(async () => {
    try {
      await invoke("cancel_scan")
    } catch {
      // Best-effort cancellation
    }
  }, [])

  const removeResult = useCallback((path: string) => {
    setState((prev) => ({
      ...prev,
      results: prev.results.filter((r) => r.path !== path),
    }))
  }, [])

  return { ...state, scanRoot, startScan, cancelScan, removeResult }
}
