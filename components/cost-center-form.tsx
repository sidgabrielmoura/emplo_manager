"use client"

import { useEffect, useState } from "react"
import { useSnapshot } from "valtio"
import { useCompanyStore } from "@/stores/company"
import { createCostCenter, updateCostCenter } from "@/actions/requests"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

interface CostCenterFormProps {
  costCenter?: {
    id: string
    name: string
    city: string | null
    state: string | null
  } | null
  onSuccess: () => void
}

export function CostCenterForm({ costCenter, onSuccess }: CostCenterFormProps) {
  const { company_selected } = useSnapshot(useCompanyStore)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(costCenter?.name || "")
  const [city, setCity] = useState(costCenter?.city || "")
  const [state, setState] = useState(costCenter?.state || "")

  useEffect(() => {
    if (costCenter) {
      setName(costCenter.name)
      setCity(costCenter.city || "")
      setState(costCenter.state || "")
    } else {
      setName("")
      setCity("")
      setState("")
    }
  }, [costCenter])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!company_selected?.id) return

    setLoading(true)
    try {
      if (costCenter) {
        await updateCostCenter(costCenter.id, {
          name,
          city: city || undefined,
          state: state || undefined,
          companyId: company_selected.id
        })
        toast.success("Centro de custo atualizado!")
      } else {
        await createCostCenter({
          name,
          city: city || undefined,
          state: state || undefined,
          companyId: company_selected.id
        })
        toast.success("Centro de custo criado!")
      }
      onSuccess()
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Erro ao salvar centro de custo")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DialogContent className="max-w-xl! rounded-3xl border-slate-100 shadow-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl font-black text-slate-900 tracking-tight">
          {costCenter ? "Editar Centro de Custo" : "Novo Centro de Custo"}
        </DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-6 py-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
              Nome do Centro
            </Label>
            <Input
              id="name"
              placeholder="Ex: Unidade São Paulo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                Cidade
              </Label>
              <Input
                id="city"
                placeholder="Ex: São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                Estado
              </Label>
              <Input
                id="state"
                placeholder="Ex: SP"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="h-11 rounded-xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all font-medium"
              />
            </div>
          </div>
        </div>
        <DialogFooter className="pt-2">
          <Button
            type="submit"
            disabled={loading}
            className="w-full gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-100 h-11 font-bold transition-all"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {costCenter ? "Salvar Alterações" : "Criar Centro"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
