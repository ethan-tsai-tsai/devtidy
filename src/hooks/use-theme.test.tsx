import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider, useTheme } from "./use-theme"
import type { Theme } from "./use-theme"

const store = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() { return store.size },
  key: (_index: number) => null,
}

function ThemeDisplay() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme("light")}>Light</button>
      <button onClick={() => setTheme("dark")}>Dark</button>
      <button onClick={() => setTheme("system")}>System</button>
    </div>
  )
}

function renderWithProvider(defaultTheme?: Theme) {
  return render(
    <ThemeProvider defaultTheme={defaultTheme}>
      <ThemeDisplay />
    </ThemeProvider>,
  )
}

describe("useTheme", () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal("localStorage", mockLocalStorage)
    document.documentElement.classList.remove("dark")
    document.documentElement.removeAttribute("data-theme")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("defaults to system theme", () => {
    renderWithProvider()
    expect(screen.getByTestId("theme")).toHaveTextContent("system")
  })

  it("accepts a default theme override", () => {
    renderWithProvider("dark")
    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
  })

  it("switches to dark theme", async () => {
    const user = userEvent.setup()
    renderWithProvider()

    await user.click(screen.getByRole("button", { name: "Dark" }))

    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("switches to light theme", async () => {
    const user = userEvent.setup()
    renderWithProvider("dark")

    await user.click(screen.getByRole("button", { name: "Light" }))

    expect(screen.getByTestId("theme")).toHaveTextContent("light")
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("persists theme to localStorage", async () => {
    const user = userEvent.setup()
    renderWithProvider()

    await user.click(screen.getByRole("button", { name: "Dark" }))

    expect(localStorage.getItem("devtidy-theme")).toBe("dark")
  })

  it("restores theme from localStorage", () => {
    localStorage.setItem("devtidy-theme", "dark")
    renderWithProvider()

    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("resolves system theme based on prefers-color-scheme", () => {
    const matchMediaSpy = vi.spyOn(window, "matchMedia")
    matchMediaSpy.mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)

    renderWithProvider()

    expect(screen.getByTestId("resolved")).toHaveTextContent("dark")

    matchMediaSpy.mockRestore()
  })

  it("sets data-theme attribute on html element", async () => {
    const user = userEvent.setup()
    renderWithProvider()

    await user.click(screen.getByRole("button", { name: "Dark" }))

    expect(document.documentElement.getAttribute("data-theme")).toBe("dark")
  })

  it("throws when used outside ThemeProvider", () => {
    function BareConsumer() {
      useTheme()
      return null
    }

    const spy = vi.spyOn(console, "error").mockImplementation(() => {})
    expect(() => render(<BareConsumer />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    )
    spy.mockRestore()
  })

  it("survives localStorage write failure", async () => {
    const failingStorage = {
      ...mockLocalStorage,
      setItem: () => { throw new DOMException("QuotaExceededError") },
    }
    vi.stubGlobal("localStorage", failingStorage)

    const user = userEvent.setup()
    renderWithProvider()

    await user.click(screen.getByRole("button", { name: "Dark" }))

    expect(screen.getByTestId("theme")).toHaveTextContent("dark")
  })
})
