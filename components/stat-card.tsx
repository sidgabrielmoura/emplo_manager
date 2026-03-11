import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: string
    isPositive: boolean
  }
}

export function StatCard({ title, value, icon: Icon, description, trend }: StatCardProps) {
  return (
    <Card className="rounded-4xl border-slate-100 shadow-sm transition-all hover:shadow-md group">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
            <p className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">{value}</p>
            {(description || trend) && (
              <div className="flex items-center gap-2">
                {trend && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${trend.isPositive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                    {trend.isPositive ? "↑" : "↓"} {trend.value}
                  </span>
                )}
                {description && <p className="text-[11px] font-medium text-slate-400 truncate">{description}</p>}
              </div>
            )}
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-sm shadow-emerald-100">
            <Icon className="w-6 h-6 text-emerald-600" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
