import db from "@/lib/prisma"
import { addDays, startOfDay } from "date-fns"
import { NextRequest, NextResponse } from "next/server"
import { getServerUserId, unauthorizedResponse, validateCompanyAccess, forbiddenResponse } from "@/lib/auth"
import { updateExpiredStatuses } from "@/lib/docs"

export async function POST(req: NextRequest) {
  try {
    const userId = await getServerUserId(req)
    if (!userId) return unauthorizedResponse()

    const { company_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({ error: "ID da empresa é obrigatório" }, { status: 400 })
    }

    const hasAccess = await validateCompanyAccess(userId, company_id)
    if (!hasAccess) return forbiddenResponse()

    
    await updateExpiredStatuses(company_id)

    const today = startOfDay(new Date())
    const next30Days = addDays(today, 30)

    const [
      totalEmployees,
      activeEmployees,
      blockedEmployees,
      terminatedEmployees
    ] = await Promise.all([
      db.employee.count({
        where: { companyId: company_id }
      }),
      db.employee.count({
        where: {
          companyId: company_id,
          status: "ACTIVE"
        }
      }),
      db.employee.count({
        where: {
          companyId: company_id,
          status: "BLOCKED"
        }
      }),
      db.employee.count({
        where: {
          companyId: company_id,
          status: "TERMINATED"
        }
      })
    ])

    const [rawDocuments, companyInfo, requirements] = await Promise.all([
      db.document.findMany({
        where: { employee: { companyId: company_id }, deletedAt: null }
      }),
      db.company.findUnique({
        where: { id: company_id },
        select: { disabledDocuments: true }
      }),
      db.companyRequiredDocument.findMany({
        where: { companyId: company_id, target: { in: ["EMPLOYEE_DOC", "EMPLOYEE_TRAINING"] }, isEnabled: true }
      })
    ])

    const disabledDocs = (companyInfo?.disabledDocuments as string[]) || []

    const validDocuments = rawDocuments.filter(doc => {
      if (doc.type !== "CUSTOM") {
        return !disabledDocs.includes(doc.type)
      }
      return requirements.some(req => req.name === doc.name)
    })

    const approvedDocuments = validDocuments.filter(d => d.status === "APPROVED").length
    const pendingDocuments = validDocuments.filter(d => d.status === "PENDING").length
    const expiredDocuments = validDocuments.filter(d => d.status === "EXPIRED").length
    let expiredSoon = 0

    validDocuments.forEach(doc => {
      if (doc.expiresAt) {
        const dExp = new Date(doc.expiresAt)
        if (dExp >= today && dExp <= next30Days) expiredSoon++
      }
    })

    const recentEmployeesData = await db.employee.findMany({
      where: { companyId: company_id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, position: true, createdAt: true }
    });

    const recentDocsData = await db.document.findMany({
      where: {
        employee: { companyId: company_id },
        deletedAt: null
      },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { employee: { select: { name: true } } }
    });

    const activities: any[] = [];

    recentEmployeesData.forEach(e => {
      activities.push({
        id: `emp-${e.id}`,
        title: `Novo funcionário adicionado`,
        description: `${e.name} ingressou na área de ${e.position}`,
        date: e.createdAt.toISOString(),
        type: 'EMPLOYEE'
      });
    });

    recentDocsData.forEach(d => {
      let statusTexto = d.status === 'APPROVED' ? 'aprovado' : d.status === 'PENDING' ? 'enviado' : 'atualizado';
      activities.push({
        id: `doc-${d.id}`,
        title: `Documento ${statusTexto}`,
        description: `Documento de ${d.employee?.name || 'funcionário'}`,
        date: d.updatedAt.toISOString(),
        type: 'DOCUMENT'
      });
    });

    activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const recentActivities = activities.slice(0, 5);

    return NextResponse.json({
      employees: {
        total: totalEmployees,
        active: activeEmployees,
        blocked: blockedEmployees,
        terminated: terminatedEmployees
      },
      documents: {
        approved: approvedDocuments,
        pending: pendingDocuments,
        expired: expiredDocuments,
        expiredSoon
      },
      recentActivities: recentActivities,
      documentStats: [
        { name: "Aprovados", value: approvedDocuments, fill: "#22c55e" },
        { name: "Pendentes", value: pendingDocuments, fill: "#eab308" },
        { name: "Expirados", value: expiredDocuments, fill: "#ef4444" },
        { name: "Venc. em Breve", value: expiredSoon, fill: "#f97316" },
      ],
      employeeStats: [
        { name: "Ativos", value: activeEmployees, fill: "#22c55e" },
        { name: "Bloqueados", value: blockedEmployees, fill: "#eab308" },
        { name: "Demitidos", value: terminatedEmployees, fill: "#ef4444" }
      ]
    })
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Erro ao carregar dashboard" },
      { status: 500 }
    )
  }
}