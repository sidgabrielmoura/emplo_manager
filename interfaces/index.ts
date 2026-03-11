export interface DashboardInterface {
    employees: EmployeesInterface
    documents: DocumentsInterface
    recentActivities: ActivityInterface[]
    documentStats: { name: string, value: number, fill: string }[]
    employeeStats: { name: string, value: number, fill: string }[]
}

export interface ActivityInterface {
    id: string
    title: string
    description: string
    date: string
    type: 'EMPLOYEE' | 'DOCUMENT' | 'CONTRACT'
}

interface EmployeesInterface {
    total: number,
    active: number,
    blocked: number,
    terminated: number
}

interface DocumentsInterface {
    approved: number,
    pending: number,
    expired: number,
    expiredSoon: number
}

export interface DocumentsDashboard {
    total: number,
    approved: number,
    pending: number,
    expired: number,
    expiring_soon: number
}