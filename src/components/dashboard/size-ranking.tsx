import { useMemo } from "react"
import { formatBytes, formatEnvType } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import type { EnvEntry } from "@/types/scan"

interface SizeRankingProps {
  data: EnvEntry[]
  scanRoot: string | null
}

function toRelativePath(absolutePath: string, root: string | null): string {
  if (!root) return absolutePath
  const normalized = root.endsWith("/") ? root : `${root}/`
  return absolutePath.startsWith(normalized)
    ? absolutePath.slice(normalized.length)
    : absolutePath
}

export function SizeRanking({ data, scanRoot }: SizeRankingProps) {
  const top10 = useMemo(
    () => [...data].sort((a, b) => b.sizeBytes - a.sizeBytes).slice(0, 10),
    [data]
  )

  if (top10.length === 0) return null

  const maxSize = top10[0].sizeBytes

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Top 10 by Size</h3>
      <div className="space-y-2">
        {top10.map((entry, index) => {
          const ratio = maxSize > 0 ? (entry.sizeBytes / maxSize) * 100 : 0
          return (
            <div key={entry.path} className="space-y-1">
              <div className="flex items-center justify-between gap-2 text-xs">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 text-muted-foreground">{index + 1}.</span>
                  <span className="truncate font-mono" title={entry.path}>
                    {toRelativePath(entry.path, scanRoot)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">
                    {formatEnvType(entry.envType)}
                  </Badge>
                  <span className="tabular-nums font-medium">{formatBytes(entry.sizeBytes)}</span>
                </div>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary/60 transition-all"
                  style={{ width: `${ratio}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
