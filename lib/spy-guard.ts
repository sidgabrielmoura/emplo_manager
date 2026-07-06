import db from "./prisma"
import { getSessionUser } from "./auth"
import { NextRequest } from "next/server"

export interface SpyValidationResult {
  authorized: boolean
  isSpy: boolean
  reason?: string
  spyAccessId?: string
  spySessionId?: string
  costCenters?: string[]
}

/**
 * Validates a request against Espião restrictions.
 * If the user is not a spy, it passes automatically.
 * If the user is a spy, it checks:
 * 1. Page permissions (view or edit).
 * 2. Cost center restrictions for employees or cost centers.
 */
export async function validateSpyAction(
  req: NextRequest,
  page: string,
  action: "view" | "edit",
  options?: {
    costCenterId?: string
    employeeId?: string
  }
): Promise<SpyValidationResult> {
  try {
    const user = await getSessionUser(req)
    if (!user) {
      return { authorized: false, isSpy: false, reason: "Usuário não autenticado" }
    }

    if (user.role !== "ESPIAO") {
      return { authorized: true, isSpy: false }
    }

    const spyAccessId = (user as any).id
    const spySessionId = (user as any).spySessionId
    
    // Defensive JSON parsing for permissions and costCenters
    let permissions: Record<string, { view: boolean; edit: boolean }> = {}
    const rawPerms = (user as any).permissions
    if (rawPerms) {
      if (typeof rawPerms === "object" && !Array.isArray(rawPerms)) {
        permissions = rawPerms as Record<string, { view: boolean; edit: boolean }>
      } else if (typeof rawPerms === "string") {
        try {
          permissions = JSON.parse(rawPerms)
        } catch {}
      }
    }

    let costCenters: string[] = []
    const rawCc = (user as any).costCenters
    if (rawCc) {
      if (Array.isArray(rawCc)) {
        costCenters = rawCc as string[]
      } else if (typeof rawCc === "string") {
        try {
          const parsed = JSON.parse(rawCc)
          if (Array.isArray(parsed)) {
            costCenters = parsed
          }
        } catch {}
      }
    }

    // 1. Check if we can bypass page view check using Cost Center options (view actions only)
    let hasCostCenterBypass = false

    if (action === "view") {
      if (options?.costCenterId) {
        if (costCenters.includes(options.costCenterId)) {
          hasCostCenterBypass = true
        }
      } else if (options?.employeeId) {
        const employee = await db.employee.findUnique({
          where: { id: options.employeeId },
          select: { costCenterId: true }
        })
        if (employee && employee.costCenterId && costCenters.includes(employee.costCenterId)) {
          hasCostCenterBypass = true
        }
      }
    }

    if (!hasCostCenterBypass) {
      // 2. Check page permissions (Normal flow if not bypassed by cost center check)
      const pagePerm = permissions[page]
      if (!pagePerm || !pagePerm[action]) {
        // Log blocked attempt
        await logSpyAction({
          spyAccessId,
          action: "BLOCKED_ATTEMPT",
          details: `Tentativa bloqueada de ${action === "view" ? "visualizar" : "editar"} a página: ${page}`,
          ip: getClientIp(req)
        })
        return {
          authorized: false,
          isSpy: true,
          reason: `Perfil espião sem permissão de ${action === "view" ? "visualização" : "edição"} para ${page}`,
          spyAccessId,
          spySessionId,
          costCenters
        }
      }

      // 3. Page permitted but check extra Cost Center constraints if options provided
      if (costCenters.length > 0) {
        if (options?.costCenterId) {
          if (!costCenters.includes(options.costCenterId)) {
            await logSpyAction({
              spyAccessId,
              action: "BLOCKED_ATTEMPT",
              details: `Tentativa bloqueada de acessar centro de custo não autorizado: ${options.costCenterId}`,
              ip: getClientIp(req)
            })
            return {
              authorized: false,
              isSpy: true,
              reason: "Centro de custo não autorizado para este perfil espião",
              spyAccessId,
              spySessionId,
              costCenters
            }
          }
        }

        if (options?.employeeId) {
          const employee = await db.employee.findUnique({
            where: { id: options.employeeId },
            select: { costCenterId: true, name: true }
          })

          if (!employee || !employee.costCenterId || !costCenters.includes(employee.costCenterId)) {
            await logSpyAction({
              spyAccessId,
              action: "BLOCKED_ATTEMPT",
              details: `Tentativa bloqueada de acessar dados do funcionário ${employee?.name || options.employeeId} (centro de custo não autorizado)`,
              ip: getClientIp(req)
            })
            return {
              authorized: false,
              isSpy: true,
              reason: "Funcionário pertence a um centro de custo não autorizado",
              spyAccessId,
              spySessionId,
              costCenters
            }
          }
        }
      }
    }

    return {
      authorized: true,
      isSpy: true,
      spyAccessId,
      spySessionId,
      costCenters
    }
  } catch (error) {
    console.error("validateSpyAction error:", error)
    return { authorized: false, isSpy: false, reason: "Erro ao validar permissões de espião" }
  }
}

/**
 * Registers an audit log for Spy activities.
 */
export async function logSpyAction(data: {
  spyAccessId: string
  action: string
  details?: string
  ip?: string
}) {
  try {
    await db.spyLog.create({
      data: {
        spyAccessId: data.spyAccessId,
        action: data.action,
        details: data.details || null,
        ip: data.ip || null
      }
    })
  } catch (e) {
    console.error("Failed to write spy audit log:", e)
  }
}

/**
 * Extracts client IP from headers.
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  return (req as any).ip || "127.0.0.1"
}
