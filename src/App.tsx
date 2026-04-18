import { ThemeProvider } from "@/hooks/use-theme"
import { ThemeToggle } from "@/components/theme-toggle"

export function App() {
  return (
    <ThemeProvider>
      <div className="flex min-h-screen items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">DevTidy</h1>
        <ThemeToggle />
      </div>
    </ThemeProvider>
  )
}
