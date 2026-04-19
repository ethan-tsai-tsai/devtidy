import { HardDrive } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"

interface AppShellProps {
  children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <HardDrive className="size-5 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight">DevTidy</h1>
        </div>
        <ThemeToggle />
      </header>
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  )
}
