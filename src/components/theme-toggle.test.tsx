import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { ThemeProvider } from "@/hooks/use-theme"
import { ThemeToggle } from "./theme-toggle"

const store = new Map<string, string>()
const mockLocalStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => store.set(key, value),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
  get length() { return store.size },
  key: (_index: number) => null,
}

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  )
}

describe("ThemeToggle", () => {
  beforeEach(() => {
    store.clear()
    vi.stubGlobal("localStorage", mockLocalStorage)
    document.documentElement.classList.remove("dark")
    document.documentElement.removeAttribute("data-theme")
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("renders a toggle button", () => {
    renderToggle()
    expect(screen.getByRole("button", { name: /theme/i })).toBeInTheDocument()
  })

  it("cycles through themes on click", async () => {
    const user = userEvent.setup()
    renderToggle()

    const button = screen.getByRole("button", { name: /theme/i })

    // system -> light
    await user.click(button)
    expect(store.get("devtidy-theme")).toBe("light")

    // light -> dark
    await user.click(button)
    expect(store.get("devtidy-theme")).toBe("dark")

    // dark -> system
    await user.click(button)
    expect(store.get("devtidy-theme")).toBe("system")
  })
})
