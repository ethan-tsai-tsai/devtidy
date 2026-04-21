import { useMemo } from "react"
import { HardDrive, FolderX, Package } from "lucide-react"
import { useTranslation } from "react-i18next"
import { formatBytes, getEnvCategory } from "@/lib/format"
import type { EnvEntry } from "@/types/scan"

interface StatCardsProps {
  data: EnvEntry[]
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  detail?: string
}

function StatCard({ icon, label, value, detail }: StatCardProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-muted">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
        {detail && <p className="truncate text-xs text-muted-foreground">{detail}</p>}
      </div>
    </div>
  )
}

export function StatCards({ data }: StatCardsProps) {
  const { t } = useTranslation()
  const stats = useMemo(() => {
    const totalSize = data.reduce((sum, e) => sum + e.sizeBytes, 0)
    const orphanCount = data.filter((e) => !e.hasProjectFile).length
    const pythonCount = data.filter((e) => getEnvCategory(e.envType) === "python").length
    const nodeCount = data.filter((e) => getEnvCategory(e.envType) === "node").length

    return { totalSize, orphanCount, pythonCount, nodeCount }
  }, [data])

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard
        icon={<Package className="size-5 text-muted-foreground" />}
        label={t("stats.totalEnvironments")}
        value={String(data.length)}
        detail={t("stats.totalEnvironmentsDetail", { python: stats.pythonCount, node: stats.nodeCount })}
      />
      <StatCard
        icon={<HardDrive className="size-5 text-muted-foreground" />}
        label={t("stats.totalSize")}
        value={formatBytes(stats.totalSize)}
      />
      <StatCard
        icon={<FolderX className="size-5 text-destructive" />}
        label={t("stats.orphans")}
        value={String(stats.orphanCount)}
        detail={t("stats.orphansDetail")}
      />
      <StatCard
        icon={<HardDrive className="size-5 text-muted-foreground" />}
        label={t("stats.largest")}
        value={data.length > 0
          ? formatBytes(Math.max(...data.map((e) => e.sizeBytes)))
          : "—"}
      />
    </div>
  )
}
