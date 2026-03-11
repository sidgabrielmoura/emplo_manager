import { Prisma } from '@/lib/generated/prisma/client'
import { proxy } from 'valtio'

type CompanyDashboardDTO = {
  id: string
  name: string
  imageUrl: string | null
  status: string
  role: string
  totalEmployees: number
  totalDocuments: number
}

type companyInterface = Prisma.CompanyGetPayload<{ select: { name: true, imageUrl: true, id: true, cnpj: true, email: true, phone: true, address: true, state: true, city: true, responsible: true } }>

export const useCompanyStore = proxy({
  companies: [] as CompanyDashboardDTO[],
  company_selected: null as companyInterface | null
})