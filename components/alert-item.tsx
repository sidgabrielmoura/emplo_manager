import { AlertCircle, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface AlertItemProps {
  type: "warning" | "danger"
  title: string
  description: string
  time: string
}

export function AlertItem({ type, title, description, time }: AlertItemProps) {
  return (
    <div className="flex gap-3 p-3 rounded-lg hover:bg-accent transition-colors">
      <div
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          type === "danger" ? "bg-red-100" : "bg-yellow-100",
        )}
      >
        {type === "danger" ? (
          <AlertCircle className="w-5 h-5 text-red-600" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-yellow-600" />
        )}
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        <p className="text-xs text-muted-foreground">{time}</p>
      </div>
    </div>
  )
}
