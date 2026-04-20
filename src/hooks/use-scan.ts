import { useCallback, useRef, useState } from "react"
import { invoke, Channel } from "@tauri-apps/api/core"
import type { EnvEntry, ScanEvent } from "@/types/scan"

export type ScanStatus = "idle" | "scanning" | "completed" | "cancelled" | "error"

interface ScanState {
  status: ScanStatus
  results: EnvEntry[]
  durationMs: number | null
  error: string | null
  currentPath: string | null
}

const INITIAL_STATE: ScanState = {
  status: "idle",
  results: [],
  durationMs: null,
  error: null,
  currentPath: null,
}

export function useScan() {
  const [state, setState] = useState<ScanState>(INITIAL_STATE)
  const scanningRef = useRef(false)

  const startScan = useCallback(async (root: string) => {
    if (scanningRef.current) return
    scanningRef.current = true

    setState({ status: "scanning", results: [], durationMs: null, error: null, currentPath: null })

    const onEvent = new Channel<ScanEvent>()
    onEvent.onmessage = (event) => {
      switch (event.event) {
        case "completed":
          setState({
            status: "completed",
            results: event.data.results,
            durationMs: event.data.durationMs,
            error: null,
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
      setState((prev) => ({ ...prev, status: "error", error: message }))
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

  return { ...state, startScan, cancelScan, removeResult }
}
