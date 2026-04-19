import { describe, expect, it, vi, afterEach } from "vitest"
import { formatBytes, formatRelativeTime, formatEnvType, getEnvCategory } from "./format"

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B")
  })

  it("formats bytes under 1 KB", () => {
    expect(formatBytes(512)).toBe("512 B")
  })

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB")
    expect(formatBytes(1536)).toBe("1.5 KB")
  })

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB")
    expect(formatBytes(52428800)).toBe("50.0 MB")
  })

  it("formats gigabytes", () => {
    expect(formatBytes(1073741824)).toBe("1.0 GB")
  })

  it("returns 0 B for negative values", () => {
    expect(formatBytes(-100)).toBe("0 B")
  })

  it("returns 0 B for NaN", () => {
    expect(formatBytes(NaN)).toBe("0 B")
  })

  it("returns 0 B for Infinity", () => {
    expect(formatBytes(Infinity)).toBe("0 B")
  })
})

describe("formatRelativeTime", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns 'just now' for recent timestamps", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-19T12:00:30Z"))
    expect(formatRelativeTime("2026-04-19T12:00:00Z")).toBe("just now")
  })

  it("formats minutes", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-19T12:05:00Z"))
    expect(formatRelativeTime("2026-04-19T12:00:00Z")).toBe("5m ago")
  })

  it("formats hours", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-19T15:00:00Z"))
    expect(formatRelativeTime("2026-04-19T12:00:00Z")).toBe("3h ago")
  })

  it("formats days", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-04-26T12:00:00Z"))
    expect(formatRelativeTime("2026-04-19T12:00:00Z")).toBe("7d ago")
  })

  it("formats months", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"))
    expect(formatRelativeTime("2026-04-19T12:00:00Z")).toBe("3mo ago")
  })

  it("formats years", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2028-04-19T12:00:00Z"))
    expect(formatRelativeTime("2026-04-19T12:00:00Z")).toBe("2y ago")
  })
})

describe("formatEnvType", () => {
  it("formats Python venv", () => {
    expect(formatEnvType("PythonVenv")).toBe("Python venv")
  })

  it("formats NodeModules", () => {
    expect(formatEnvType("NodeModules")).toBe("node_modules")
  })

  it("formats Conda", () => {
    expect(formatEnvType("Conda")).toBe("Conda")
  })
})

describe("getEnvCategory", () => {
  it("returns python for Python types", () => {
    expect(getEnvCategory("PythonVenv")).toBe("python")
    expect(getEnvCategory("Conda")).toBe("python")
    expect(getEnvCategory("Uv")).toBe("python")
    expect(getEnvCategory("Poetry")).toBe("python")
  })

  it("returns node for NodeModules", () => {
    expect(getEnvCategory("NodeModules")).toBe("node")
  })
})
