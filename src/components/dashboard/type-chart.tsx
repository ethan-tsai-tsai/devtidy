import { useMemo } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"
import { formatBytes, formatEnvType } from "@/lib/format"
import type { EnvEntry, EnvType } from "@/types/scan"

interface TypeChartProps {
  data: EnvEntry[]
}

const COLORS: Record<string, string> = {
  "Python venv": "var(--color-chart-1, oklch(0.646 0.222 41.116))",
  virtualenv: "var(--color-chart-2, oklch(0.6 0.118 184.704))",
  Conda: "var(--color-chart-3, oklch(0.398 0.07 227.392))",
  uv: "var(--color-chart-4, oklch(0.828 0.189 84.429))",
  Poetry: "var(--color-chart-5, oklch(0.769 0.188 70.08))",
  Pipenv: "var(--color-chart-1, oklch(0.646 0.222 41.116))",
  pyenv: "var(--color-chart-2, oklch(0.6 0.118 184.704))",
  node_modules: "var(--color-chart-3, oklch(0.398 0.07 227.392))",
}

function getColor(label: string, index: number): string {
  return COLORS[label] ?? `hsl(${index * 45}, 60%, 55%)`
}

export function TypeChart({ data }: TypeChartProps) {
  const chartData = useMemo(() => {
    const sizeByType = new Map<EnvType, number>()
    for (const entry of data) {
      sizeByType.set(entry.envType, (sizeByType.get(entry.envType) ?? 0) + entry.sizeBytes)
    }

    return Array.from(sizeByType.entries())
      .map(([envType, totalSize]) => ({
        name: formatEnvType(envType),
        value: totalSize,
      }))
      .sort((a, b) => b.value - a.value)
  }, [data])

  if (chartData.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-medium">Size by Type</h3>
      <div className="flex items-center gap-4">
        <div className="size-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="90%"
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={entry.name} fill={getColor(entry.name, index)} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatBytes(Number(value))}
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid var(--color-border, #e5e7eb)",
                  background: "var(--color-card, #fff)",
                  fontSize: "12px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-1.5">
          {chartData.map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{ backgroundColor: getColor(entry.name, index) }}
              />
              <span className="text-muted-foreground">{entry.name}</span>
              <span className="ml-auto tabular-nums font-medium">{formatBytes(entry.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
