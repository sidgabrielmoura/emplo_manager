import { cn } from "@/lib/utils"

type StatusVariant = "ACTIVE" | "BLOCKED" | "TERMINATED" | "PENDING"

interface StatusBadgeProps {
  status: StatusVariant | string
  className?: string
}

const statusConfig: Record<StatusVariant, { label: string; className: string }> = {
  ACTIVE: {
    label: "Ativo",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  BLOCKED: {
    label: "Inativo",
    className: "bg-red-100 text-red-800 border-red-200",
  },
  TERMINATED: {
    label: "Demitido",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
  PENDING: {
    label: "Pendente",
    className: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status?.toString().toUpperCase() as StatusVariant
  const config = statusConfig[normalizedStatus]

  if (!config) {
    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
          "bg-muted text-muted-foreground border-border",
          className
        )}
      >
        Status desconhecido
      </span>
    )
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
