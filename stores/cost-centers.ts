import { proxy } from "valtio"

export interface CostCenter {
  id: string
  name: string
  city: string | null
  state: string | null
  companyId: string
  isFavorite: boolean
  favoritedAt: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    employees: number
  }
}

interface CostCentersStore {
  costCenters: CostCenter[] | null
  selectedCostCenter: CostCenter | null
}

export const useCostCentersStore = proxy<CostCentersStore>({
  costCenters: null,
  selectedCostCenter: null,
})
