import type { EnvType } from "@/types/scan"

const SIZE_UNITS = ["B", "KB", "MB", "GB", "TB"] as const

export function formatBytes(bytes: number): string {
  if (bytes <= 0 || !Number.isFinite(bytes)) return "0 B"
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    SIZE_UNITS.length - 1
  )
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(exponent === 0 ? 0 : 1)} ${SIZE_UNITS[exponent]}`
}

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const seconds = Math.floor(diff / 1000)
  if (seconds < 60) return "just now"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo ago`
  return `${Math.floor(months / 12)}y ago`
}

const ENV_TYPE_LABELS: Record<EnvType, string> = {
  PythonVenv: "Python venv",
  PythonVirtualenv: "virtualenv",
  Conda: "Conda",
  Uv: "uv",
  Poetry: "Poetry",
  Pipenv: "Pipenv",
  Pyenv: "pyenv",
  NodeModules: "node_modules",
}

export function formatEnvType(envType: EnvType): string {
  return ENV_TYPE_LABELS[envType]
}

const ENV_CATEGORY: Record<EnvType, "python" | "node"> = {
  PythonVenv: "python",
  PythonVirtualenv: "python",
  Conda: "python",
  Uv: "python",
  Poetry: "python",
  Pipenv: "python",
  Pyenv: "python",
  NodeModules: "node",
}

export function getEnvCategory(envType: EnvType): "python" | "node" {
  return ENV_CATEGORY[envType]
}
