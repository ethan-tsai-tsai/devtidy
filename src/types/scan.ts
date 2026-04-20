/** Environment types matching Rust EnvType enum. */
export type EnvType =
  | "PythonVenv"
  | "PythonVirtualenv"
  | "Conda"
  | "Uv"
  | "Poetry"
  | "Pipenv"
  | "Pyenv"
  | "NodeModules"

/** Single scanned environment entry, mirrors Rust EnvEntry. */
export interface EnvEntry {
  path: string
  envType: EnvType
  sizeBytes: number
  lastModified: string
  projectPath: string | null
  hasProjectFile: boolean
}

/** Cached scan result loaded from SQLite on startup. */
export interface ScanCache {
  rootPath: string
  scannedAt: string
  durationMs: number
  results: EnvEntry[]
}

/** Application settings stored in SQLite. */
export interface AppSettings {
  scanDepth: number
  extraExcludes: string[]
}

/** Discriminated union of scan events streamed from backend via Channel. */
export type ScanEvent =
  | { event: "started"; data: { root: string } }
  | { event: "completed"; data: { results: EnvEntry[]; durationMs: number } }
  | { event: "progress"; data: { currentPath: string } }
  | { event: "cancelled" }
  | { event: "error"; data: { message: string } }
