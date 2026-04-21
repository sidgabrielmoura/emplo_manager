"use client"

import { getDaysRemaining } from "@/lib/utils"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Mail, Calendar, Download, FileText, Upload, Loader2, Pencil, Eye, MapPin } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { getDocsOfEmployee, getTrainings, showEmployee, updateEmployeeData, updateEmployeeDocument, updateTraining, uploadImage, downloadFile, downloadTrainingsZip, getCostCenters } from "@/actions/requests"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useSnapshot } from "valtio"
import { useEmployeesStore } from "@/stores/employees"
import { useCostCentersStore } from "@/stores/cost-centers"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getPTBRDocuments } from "@/lib/constants/documents"
import { maskPhone } from "@/helpers"

export default function EmployeeProfilePage() {
  const employee = useSnapshot(useEmployeesStore).show_employee
  const params = useParams<{ id: string }>()
  const documents = useSnapshot(useEmployeesStore).employee_documents
  const trainings = useSnapshot(useEmployeesStore).employee_trainings
  const costCenters = useSnapshot(useCostCentersStore).costCenters
  const [pageLoading, setPageLoading] = useState(true)
  const closeUpdateEmployeeSheet = useRef<HTMLButtonElement>(null)
  const [docsLoading, setDocsLoading] = useState(true)
  const [trainingsLoading, setTrainingsLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const closeEditDocModal = useRef<HTMLButtonElement>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [form, setForm] = useState({
    name: '',
    email: '',
    cpf: '',
    rg: '',
    position: '',
    rotation: '' as string | null,
    gender: '',
    image_url: '',
    isTerminated: false,
    supervisor: '',
    registration: '',
    address: {
      city: '',
      district: '',
      street: '',
      number: '',
      cep: '',
      complement: ''
    },
    contactPhone: '',
    emergencyContact: '',
    dismissedAt: '',
    costCenterId: '',
    workStart: '',
    workEnd: ''
  })
  const [docIssuedAt, setDocIssuedAt] = useState('')
  const [docExpiresAt, setDocExpiresAt] = useState('')
  const [trainingIssuedAt, setTrainingIssuedAt] = useState('')
  const [trainingExpiresAt, setTrainingExpiresAt] = useState('')
  const [trainingExpire, setTrainingExpire] = useState(false)
  const [trainingsZipLoading, setTrainingsZipLoading] = useState(false)

  useEffect(() => {
    if (!params.id) return

    const companyId = localStorage.getItem('company_id')

    setPageLoading(true)
    showEmployee(params.id)
    setDocsLoading(true)
    getDocsOfEmployee(params.id).finally(() => setDocsLoading(false))
    setTrainingsLoading(true)
    getTrainings(params.id).finally(() => setTrainingsLoading(false))

    if (companyId) {
      getCostCenters(companyId)
    }
  }, [params.id])

  useEffect(() => {
    if (!employee?.id || documents?.length) return

    setForm({
      name: employee.name,
      email: employee.email,
      cpf: employee.cpf,
      rg: employee.rg || '',
      position: employee.position,
      rotation: employee.rotation,
      gender: employee.gender,
      image_url: employee.image || '',
      isTerminated: employee.status === "TERMINATED",
      supervisor: employee.supervisor || '',
      registration: employee.registration || '',
      address: {
        city: employee.address?.city || '',
        district: employee.address?.district || '',
        street: employee.address?.address || '',
        number: employee.address?.number || '',
        cep: employee.address?.cep || '',
        complement: employee.address?.complement || ''
      },
      contactPhone: employee.contact?.phone || '',
      emergencyContact: employee.contact?.emergencyContact || '',
      dismissedAt: employee.dismissedAt ? new Date(employee.dismissedAt).toISOString().split('T')[0] : '',
      costCenterId: employee.costCenterId || '',
      workStart: employee.workStart || '',
      workEnd: employee.workEnd || ''
    })
  }, [employee, params.id])

  if (!employee || employee.id !== params.id) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <div className="space-y-6">
            <section className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/employees">
                  <Button variant="outline" size="icon" className="cursor-pointer">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <div>
                  <p className="text-lg font-semibold">Perfil do Funcionário</p>
                </div>
              </div>
            </section>

            <div className="rounded-3xl border border-slate-100 bg-white p-6 lg:p-8 shadow-sm">
              <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between w-full gap-6">
                <div className="flex flex-col lg:flex-row items-center lg:items-start gap-5 text-center lg:text-left">
                  <Skeleton className="w-24 h-24 rounded-3xl shrink-0" />
                  <div className="space-y-3 mt-2">
                    <Skeleton className="h-8 w-48" />
                    <div className="flex flex-col items-center lg:items-start gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </div>
                <Skeleton className="h-10 w-32 rounded-xl" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-sm mt-8">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex justify-between border-b pb-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex border-b border-slate-100 mb-6 gap-6">
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-8 w-24 mb-2" />
              </div>
              <div className="rounded-3xl border border-slate-100 bg-white p-6 lg:p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-10 w-32 rounded-xl" />
                </div>
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full rounded-2xl" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    )
  }

  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "image/png",
    "image/jpeg",
  ]

  function handleSelect(fileList?: FileList | null) {
    if (!fileList?.[0]) return

    const selected = fileList[0]

    if (!allowedTypes.includes(selected.type)) {
      toast.error("Formato de arquivo não permitido")
      return
    }

    setFile(selected)
    setPreview(URL.createObjectURL(selected))
  }

  const handleUploadImage = async (id: string) => {

    setLoading(true)
    try {
      const uploaded: any = await uploadImage(file!).catch(() => {
        toast.error("O arquivo selecionado é muito grande ou ocorreu um erro no upload")
        return null
      })

      if (!uploaded) {
        setLoading(false)
        return
      }

      const response = await updateEmployeeDocument({
        fileUrl: uploaded.url,
        id,
        issuedAt: docIssuedAt || undefined,
        expiresAt: docExpiresAt || undefined,
      }, employee.id)

      if (response) {
        toast.success('arquivos enviados com sucesso')
        closeEditDocModal.current?.click()
      }

    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro no upload")
    } finally {
      setLoading(false)
    }
  }

  const handleUploadTraining = async (id: string) => {
    setLoading(true)
    try {
      const uploaded: any = await uploadImage(file!).catch(() => {
        toast.error("O arquivo selecionado é muito grande ou ocorreu um erro no upload")
        return null
      })

      if (!uploaded) {
        setLoading(false)
        return
      }

      const response = await updateTraining({
        fileUrl: uploaded.url,
        id,
        issuedAt: trainingIssuedAt || undefined,
        expiresAt: trainingExpiresAt || undefined,
      }, employee.id)

      if (response) {
        toast.success('Treinamento atualizado com sucesso')
        setTrainingIssuedAt('')
        setTrainingExpiresAt('')
        setTrainingExpire(false)
        closeEditDocModal.current?.click()
      }

    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Erro ao atualizar treinamento")
    } finally {
      setLoading(false)
    }
  }

  async function handleDownloadTrainingsZip() {
    if (!employee) return
    setTrainingsZipLoading(true)
    try {
      await downloadTrainingsZip(employee.id, employee.name)
      toast.success("Download iniciado!")
    } catch (error: any) {
      toast.error(error?.message || "Erro ao baixar treinamentos")
    } finally {
      setTrainingsZipLoading(false)
    }
  }

  async function handleUpdateEmployee(e: React.FormEvent) {
    e.preventDefault()
    let uploadedImage: any

    setLoading(true)
    try {
      if (imageFile) {
        uploadedImage = await uploadImage(imageFile)
      }

      await updateEmployeeData(employee?.id || '', {
        name: form.name,
        email: form.email,
        cpf: form.cpf,
        rg: form.rg,
        position: form.position,
        rotation: form.rotation as "MORNING" | "AFTERNOON" | "NIGHT" | undefined,
        gender: form.gender as "MALE" | "FEMALE" | undefined,
        image: (uploadedImage as any)?.url || form.image_url,
        supervisor: form.supervisor,
        registration: form.registration,
        address: form.address,
        contactPhone: form.contactPhone,
        emergencyContact: form.emergencyContact,
        dismissedAt: form.isTerminated ? form.dismissedAt : '',
        costCenterId: form.costCenterId || undefined,
        workStart: form.workStart,
        workEnd: form.workEnd
      } as any)

      toast.success("Funcionário atualizado com sucesso")
      closeUpdateEmployeeSheet.current?.click()
    } catch (error) {
      console.log(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="space-y-6">

          <section className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/employees">
                <Button variant="outline" size="icon" className="cursor-pointer">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>

              <div>
                <p className="text-lg font-semibold">Perfil do Funcionário</p>
              </div>
            </div>
          </section>

          <div className="rounded-3xl border border-slate-100 bg-white p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between w-full gap-6">
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-5 text-center lg:text-left">
                <div className="w-24 h-24 rounded-3xl overflow-hidden bg-slate-50 shrink-0 border border-slate-100 shadow-sm">
                  <img
                    src={employee.image || "/avatar-placeholder.jpeg"}
                    alt={employee.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-900 capitalize tracking-tight">{employee.name}</h2>
                  <div className="flex flex-col items-center lg:items-start gap-2 mt-2">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={employee.status} />
                      {employee.costCenter && (
                        <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {employee.costCenter.name}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest">
                      {employee.position}
                    </p>
                  </div>
                </div>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button onClick={() => {
                    setForm({
                      name: employee.name,
                      email: employee.email,
                      cpf: employee.cpf,
                      rg: employee.rg || '',
                      position: employee.position,
                      rotation: employee.rotation,
                      gender: employee.gender,
                      isTerminated: employee.status === "TERMINATED",
                      image_url: employee.image || '',
                      supervisor: employee.supervisor || '',
                      registration: employee.registration || '',
                      address: {
                        city: employee.address?.city || '',
                        district: employee.address?.district || '',
                        street: employee.address?.address || '',
                        number: employee.address?.number || '',
                        cep: employee.address?.cep || '',
                        complement: employee.address?.complement || ''
                      },
                      contactPhone: employee.contact?.phone || '',
                      emergencyContact: employee.contact?.emergencyContact || '',
                      dismissedAt: employee.dismissedAt ? new Date(employee.dismissedAt).toISOString().split('T')[0] : '',
                      costCenterId: employee.costCenterId || '',
                      workStart: employee.workStart || '',
                      workEnd: employee.workEnd || ''
                    })
                  }} className="cursor-pointer ">
                    <Pencil /> Atualizar
                  </Button>
                </SheetTrigger>

                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto px-4">
                  <SheetHeader>
                    <SheetTitle>Atualizar funcionário</SheetTitle>
                  </SheetHeader>

                  <form onSubmit={handleUpdateEmployee} className="mt-6 space-y-5 px-4 pb-5">
                    <div className="space-y-2">
                      <Label>Foto do funcionário</Label>

                      <div className="flex items-center gap-4">
                        <div className="h-24 w-24 rounded-xl border flex items-center justify-center overflow-hidden bg-muted">
                          {preview || form.image_url ? (
                            <img
                              src={preview ?? form.image_url}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground text-center px-2">
                              Sem imagem
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                          <Input
                            type="file"
                            accept="image/*"
                            className="cursor-pointer"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (!file) return

                              setImageFile(file)
                              setPreview(URL.createObjectURL(file))
                            }}
                          />

                          {preview && (
                            <Button
                              type="button"
                              variant="outline"
                              className="w-fit cursor-pointer"
                              onClick={() => {
                                setPreview(null)
                                setImageFile(null)
                                setForm(prev => ({ ...prev, imageUrl: '' }))
                              }}
                            >
                              Remover imagem
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Nome</Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                        className="capitalize"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label>E-mail</Label>
                      <Input
                        value={form.email}
                        onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>CPF</Label>
                        <Input
                          value={form.cpf}
                          onChange={(e) => setForm(prev => ({ ...prev, cpf: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>RG</Label>
                        <Input
                          value={form.rg}
                          onChange={(e) => setForm(prev => ({ ...prev, rg: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label>Cargo</Label>
                      <Input
                        value={form.position}
                        onChange={(e) => setForm(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Início do expediente</Label>
                        <Input
                          type="time"
                          value={form.workStart}
                          onChange={(e) => setForm(prev => ({ ...prev, workStart: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label>Fim do expediente</Label>
                        <Input
                          type="time"
                          value={form.workEnd}
                          onChange={(e) => setForm(prev => ({ ...prev, workEnd: e.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label>Sexo</Label>
                        <Select
                          value={form.gender}
                          onValueChange={(value) =>
                            setForm(prev => ({ ...prev, gender: value as any }))
                          }
                        >
                          <SelectTrigger className="cursor-pointer w-full">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MALE">Masculino</SelectItem>
                            <SelectItem value="FEMALE">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label>Centro de Custo</Label>
                        <Select
                          value={form.costCenterId || 'none'}
                          onValueChange={(value) =>
                            setForm(prev => ({ ...prev, costCenterId: value === 'none' ? '' : value }))
                          }
                        >
                          <SelectTrigger className="cursor-pointer w-full">
                            <SelectValue placeholder="Selecione o centro" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Nenhum</SelectItem>
                            {costCenters?.map((center) => (
                              <SelectItem key={center.id} value={center.id}>
                                {center.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <section className="flex flex-col justify-center">
                      <div className="flex items-center gap-1 ml-1">
                        <Switch
                          checked={form.isTerminated}
                          onCheckedChange={(checked) => setForm(prev => ({ ...prev, isTerminated: checked }))}
                          className="cursor-pointer"
                        />
                        <span className="text-sm text-muted-foreground ml-2">Funcionário demitido</span>
                      </div>

                      {form.isTerminated && (
                        <div className="mt-1 p-2 border border-dashed rounded-2xl">
                          <span className="text-xs text-muted-foreground ml-1">Data de demissão</span>
                          <Input type="date" value={form.dismissedAt} onChange={e => setForm(prev => ({ ...prev, dismissedAt: e.target.value }))} />
                        </div>
                      )}
                    </section>
                    <div className="space-y-2 mt-4">
                      <Label>Supervisor</Label>
                      <Input value={form.supervisor} onChange={e => setForm(prev => ({ ...prev, supervisor: e.target.value }))} />
                      <Label>Matrícula</Label>
                      <Input value={form.registration} onChange={e => setForm(prev => ({ ...prev, registration: e.target.value }))} />
                      <Label>Telefone</Label>
                      <Input value={maskPhone(form.contactPhone)} onChange={(e) => setForm(prev => ({ ...prev, contactPhone: e.target.value }))} />
                      <Label>Contato de Emergência</Label>
                      <Input value={maskPhone(form.emergencyContact)} onChange={(e) => setForm(prev => ({ ...prev, emergencyContact: e.target.value }))} />
                      <Label>CEP</Label>
                      <Input value={form.address.cep} onChange={e => setForm(prev => ({ ...prev, address: { ...prev.address, cep: e.target.value } }))} />
                      <Label>Rua</Label>
                      <Input value={form.address.street} onChange={e => setForm(prev => ({ ...prev, address: { ...prev.address, street: e.target.value } }))} />
                      <Label>Número</Label>
                      <Input value={form.address.number} onChange={e => setForm(prev => ({ ...prev, address: { ...prev.address, number: e.target.value } }))} />
                      <Label>Bairro</Label>
                      <Input value={form.address.district} onChange={e => setForm(prev => ({ ...prev, address: { ...prev.address, district: e.target.value } }))} />
                      <Label>Cidade</Label>
                      <Input value={form.address.city} onChange={e => setForm(prev => ({ ...prev, address: { ...prev.address, city: e.target.value } }))} />
                      <Label>Complemento</Label>
                      <Input value={form.address.complement} onChange={e => setForm(prev => ({ ...prev, address: { ...prev.address, complement: e.target.value } }))} />
                    </div>

                    <Button disabled={loading} type="submit" className="w-full cursor-pointer">
                      Salvar alterações {loading && <Loader2 className="animate-spin" />}
                    </Button>
                  </form>

                  <SheetClose ref={closeUpdateEmployeeSheet} />
                </SheetContent>
              </Sheet>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6 text-sm mt-8">

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">E-mail</span>
                <span className="font-medium">{employee.email}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Nascimento</span>
                <span className="font-medium">
                  {new Date(employee.birthDate).toLocaleDateString("pt-BR")}
                </span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">CPF</span>
                <span className="font-medium">{employee.cpf}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">RG</span>
                <span className="font-medium">{employee.rg}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Horário de Trabalho</span>
                <span className="font-medium">
                  {employee.workStart && employee.workEnd
                    ? `${employee.workStart} - ${employee.workEnd}`
                    : "—"}
                </span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Sexo</span>
                <span className="font-medium">
                  {employee.gender === "MALE" ? "Masculino" : "Feminino"}
                </span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Supervisor</span>
                <span className="font-medium">{employee.supervisor || "—"}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Matrícula</span>
                <span className="font-medium">{employee.registration || "—"}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Telefone</span>
                <span className="font-medium">{maskPhone(employee.contact?.phone || "")}</span>
              </div>

              <div className="flex justify-between border-b pb-2">
                <span className="text-muted-foreground">Contato de Emergência</span>
                <span className="font-medium">{maskPhone(employee.contact?.emergencyContact || "")}</span>
              </div>

              {employee.address && (
                <div className="flex flex-col space-y-1 border-b pb-2">
                  <span className="text-muted-foreground">Endereço</span>
                  <span className="font-medium">
                    {employee.address.address}, {employee.address.number}
                    {employee.address.complement && ` - ${employee.address.complement}`}
                    {` - ${employee.address.district}, ${employee.address.city}, ${employee.address.cep}`}
                  </span>
                </div>
              )}

              {employee.dismissedAt && (
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Data de demissão</span>
                  <span className="font-medium">
                    {new Date(employee.dismissedAt).toLocaleDateString("pt-BR", {
                      timeZone: 'UTC'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <Tabs defaultValue="documents" className="w-full">
          <div className="overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0">
            <TabsList className="w-full sm:w-auto h-12 p-1 bg-slate-100 rounded-xl inline-flex min-w-max sm:min-w-0">
              <TabsTrigger value="documents" className="cursor-pointer px-6 rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                Documentos do Funcionário
              </TabsTrigger>
              <TabsTrigger value="trainings" className="cursor-pointer px-6 rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm">
                Treinamentos de Segurança
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="documents" className="mt-6">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="px-6 lg:px-8 py-6 border-b border-slate-50">
                <CardTitle className="text-lg lg:text-xl font-bold text-slate-900">Documentação Obrigatória</CardTitle>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Gestão de arquivos e validades</p>
              </CardHeader>

              <CardContent className="p-0 px-8">
                {docsLoading ? (
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between border-b pb-4 mb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                ) : documents?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Documento</TableHead>
                          <TableHead className="w-40! text-center">Status</TableHead>
                          <TableHead className="w-40! text-center">Data de emissão</TableHead>
                          <TableHead className="w-40! text-center">Data de vencimento</TableHead>
                          <TableHead className="w-40! text-center">Última atualização</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {documents?.map((doc) => (
                          <TableRow key={doc.id}>
                            <TableCell className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              {getPTBRDocuments(doc.type, doc.name)}
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  doc.status === "APPROVED"
                                    ? "default"
                                    : doc.status === "PENDING"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {doc.status === "APPROVED"
                                  ? "Aprovado"
                                  : doc.status === "PENDING"
                                    ? "Pendente"
                                    : "Rejeitado"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                              {doc.issuedAt
                                ? new Date(doc.issuedAt).toLocaleDateString("pt-BR", {
                                  timeZone: 'UTC',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                                : "—"}
                            </TableCell>

                            <TableCell className="text-center">
                              {doc.expiresAt
                                ? new Date(doc.expiresAt).toLocaleDateString("pt-BR", {
                                  timeZone: 'UTC',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                                : "—"}
                            </TableCell>

                            <TableCell className="text-center">
                              {doc.updatedAt
                                ? new Date(doc.updatedAt).toLocaleDateString("pt-BR", {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                                : "—"}
                            </TableCell>

                            <TableCell className="text-right">
                              {doc.fileUrl ? (
                                <div className="flex items-center justify-end gap-2">
                                  <Link href={doc.fileUrl} target="_blank" rel="noreferrer">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Ver
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 cursor-pointer"
                                    onClick={() => downloadFile(doc.fileUrl!, `${getPTBRDocuments(doc.type, doc.name)}.${doc.fileUrl!.split('.').pop()?.split('?')[0] || 'pdf'}`)}
                                  >
                                    <Download className="w-4 h-4" />
                                    Baixar
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 cursor-pointer"
                                        onClick={() => {
                                          setDocIssuedAt(doc.issuedAt ? new Date(doc.issuedAt).toISOString().split('T')[0] : '')
                                          setDocExpiresAt(doc.expiresAt ? new Date(doc.expiresAt).toISOString().split('T')[0] : '')
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                        Editar
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl! w-full">
                                      <div className="space-y-5">
                                        <h3 className="text-lg font-semibold">Atualizar documento</h3>

                                        <input
                                          ref={inputRef}
                                          type="file"
                                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                          hidden
                                          onChange={(e) => handleSelect(e.target.files)}
                                        />

                                        <div className="flex flex-col gap-2">
                                          <Button
                                            variant="outline"
                                            className="w-fit cursor-pointer"
                                            onClick={() => inputRef.current?.click()}
                                          >
                                            Selecionar arquivo
                                          </Button>

                                          <p className="text-xs text-muted-foreground">
                                            Formatos aceitos: PDF, Word, Excel e PowerPoint
                                          </p>
                                        </div>

                                        {preview && file && (
                                          <div className="flex items-center justify-between gap-3 rounded-md border p-2">
                                            <span className="text-primary truncate">{file.name}</span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="cursor-pointer text-destructive"
                                              onClick={() => {
                                                setFile(null)
                                                setPreview(null)
                                              }}
                                            >
                                              Remover
                                            </Button>
                                          </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                          <div className="space-y-2">
                                            <Label>Data de emissão</Label>
                                            <Input
                                              type="date"
                                              value={docIssuedAt}
                                              onChange={e => setDocIssuedAt(e.target.value)}
                                            />
                                          </div>
                                          <div className="space-y-2">
                                            <Label>Data de vencimento</Label>
                                            <Input
                                              type="date"
                                              value={docExpiresAt}
                                              onChange={e => setDocExpiresAt(e.target.value)}
                                            />
                                          </div>
                                        </div>

                                        <div className="flex justify-end gap-2 pt-2">
                                          <Button variant="secondary" className="cursor-pointer" onClick={() => { setFile(null); setPreview(null); setDocIssuedAt(''); setDocExpiresAt(''); }}>Limpar</Button>
                                          <Button
                                            className="cursor-pointer gap-2"
                                            disabled={loading}
                                            onClick={() => handleUploadImage(doc.id)}
                                          >
                                            Salvar alterações
                                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                          </Button>
                                          <DialogClose ref={closeEditDocModal} />
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              ) : (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="gap-2 cursor-pointer"
                                      onClick={() => {
                                        setDocIssuedAt('')
                                        setDocExpiresAt('')
                                      }}
                                    >
                                      <Upload className="w-4 h-4" />
                                      Enviar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl! w-full">
                                    <div className="space-y-5">
                                      <h3 className="text-lg font-semibold">Enviar documento</h3>

                                      <div className="flex flex-col gap-2">
                                        <Button
                                          variant="outline"
                                          className="w-fit cursor-pointer"
                                          onClick={() => inputRef.current?.click()}
                                        >
                                          Selecionar arquivo
                                        </Button>

                                        <p className="text-xs text-muted-foreground">
                                          Formatos aceitos: PDF, Word, Excel e PowerPoint
                                        </p>
                                      </div>

                                      <input
                                        ref={inputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                        hidden
                                        onChange={(e) => handleSelect(e.target.files)}
                                      />

                                      {preview && file && (
                                        <div className="flex items-center justify-between gap-3 rounded-md border p-2">
                                          <a
                                            href={preview}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-primary line-clamp-1 underline underline-offset-4 hover:opacity-80"
                                          >
                                            {file.name}
                                          </a>

                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="cursor-pointer text-destructive"
                                            onClick={() => {
                                              setFile(null)
                                              setPreview(null)
                                            }}
                                          >
                                            Remover
                                          </Button>
                                        </div>
                                      )}

                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                          <Label>Data de emissão</Label>
                                          <Input
                                            type="date"
                                            value={docIssuedAt}
                                            onChange={e => setDocIssuedAt(e.target.value)}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label>Data de vencimento</Label>
                                          <Input
                                            type="date"
                                            value={docExpiresAt}
                                            onChange={e => setDocExpiresAt(e.target.value)}
                                          />
                                        </div>
                                      </div>

                                      <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                          variant="secondary"
                                          className="cursor-pointer"
                                          onClick={() => {
                                            setFile(null)
                                            setPreview(null)
                                          }}
                                        >
                                          Limpar
                                        </Button>

                                        <Button
                                          className="cursor-pointer gap-2"
                                          disabled={!file || loading}
                                          onClick={() => handleUploadImage(doc.id)}
                                        >
                                          Enviar documento
                                          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        </Button>
                                        <DialogClose ref={closeEditDocModal} />
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhum documento cadastrado para este funcionário.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trainings" className="mt-6">
            <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
              <CardHeader className="px-6 lg:px-8 py-6 border-b border-slate-50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg lg:text-xl font-bold text-slate-900">Treinamentos e Especializações</CardTitle>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mt-1">Controle de capacitação técnica</p>
                </div>
                {trainings && trainings.some((t: any) => t.fileUrl) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 cursor-pointer"
                    disabled={trainingsZipLoading}
                    onClick={handleDownloadTrainingsZip}
                  >
                    {trainingsZipLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Baixar todos
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-0 px-8">
                {trainingsLoading ? (
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between border-b pb-4 mb-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full rounded-xl" />
                    ))}
                  </div>
                ) : trainings?.length ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Treinamento</TableHead>
                          <TableHead className="w-40! text-center">Status</TableHead>
                          <TableHead className="w-40! text-center">Data de realização</TableHead>
                          <TableHead className="w-40! text-center">Dias para vencer</TableHead>
                          <TableHead className="w-40! text-center">Última atualização</TableHead>
                          <TableHead className="text-right">Ação</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {trainings.map((training) => (
                          <TableRow key={training.id}>
                            <TableCell className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary" />
                              {getPTBRDocuments(training.type)}
                            </TableCell>

                            <TableCell className="text-center">
                              <Badge
                                variant={
                                  training.status === "APPROVED"
                                    ? "default"
                                    : training.status === "PENDING"
                                      ? "secondary"
                                      : "destructive"
                                }
                              >
                                {training.status === "APPROVED"
                                  ? "Aprovado"
                                  : training.status === "PENDING"
                                    ? "Pendente"
                                    : "Rejeitado"}
                              </Badge>
                            </TableCell>

                            <TableCell className="text-center">
                              {training.issuedAt
                                ? new Date(training.issuedAt).toLocaleDateString("pt-BR", {
                                  timeZone: 'UTC',
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                                : "—"}
                            </TableCell>

                            <TableCell className="text-center">
                              {training.expiresAt ? getDaysRemaining(training.expiresAt) : "—"}
                            </TableCell>

                            <TableCell className="text-center">
                              {training.updatedAt
                                ? new Date(training.updatedAt).toLocaleDateString("pt-BR", {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric'
                                })
                                : "—"}
                            </TableCell>

                            <TableCell className="text-right">
                              {training.fileUrl ? (
                                <div className="flex justify-end gap-2">
                                  <Link href={training.fileUrl} target="_blank" rel="noreferrer">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="gap-2 cursor-pointer"
                                    >
                                      <Eye className="w-4 h-4" />
                                      Ver
                                    </Button>
                                  </Link>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="gap-2 cursor-pointer"
                                    onClick={() => downloadFile(training.fileUrl!, `${getPTBRDocuments(training.type)}.${training.fileUrl!.split('.').pop()?.split('?')[0] || 'pdf'}`)}
                                  >
                                    <Download className="w-4 h-4" />
                                    Baixar
                                  </Button>
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="gap-2 cursor-pointer"
                                        onClick={() => {
                                          setTrainingIssuedAt(training.issuedAt ? new Date(training.issuedAt).toISOString().split('T')[0] : '')
                                          setTrainingExpiresAt(training.expiresAt ? new Date(training.expiresAt).toISOString().split('T')[0] : '')
                                          setTrainingExpire(!!training.expiresAt)
                                        }}
                                      >
                                        <Pencil className="w-4 h-4" />
                                        Editar
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl! w-full">
                                      <div className="space-y-5">
                                        <h3 className="text-lg font-semibold">Atualizar treinamento</h3>

                                        <input
                                          ref={inputRef}
                                          type="file"
                                          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                          hidden
                                          onChange={(e) => handleSelect(e.target.files)}
                                        />

                                        <div className="flex flex-col gap-2">
                                          <Button
                                            variant="outline"
                                            className="w-fit cursor-pointer"
                                            onClick={() => inputRef.current?.click()}
                                          >
                                            Selecionar arquivo
                                          </Button>
                                          <p className="text-xs text-muted-foreground">
                                            Formatos aceitos: PDF, Word, Excel e PowerPoint
                                          </p>
                                        </div>

                                        {preview && file && (
                                          <div className="flex items-center justify-between gap-3 rounded-md border p-2">
                                            <span className="text-primary truncate">{file.name}</span>
                                            <Button
                                              size="sm"
                                              variant="ghost"
                                              className="cursor-pointer text-destructive"
                                              onClick={() => {
                                                setFile(null)
                                                setPreview(null)
                                              }}
                                            >
                                              Remover
                                            </Button>
                                          </div>
                                        )}

                                        <section>
                                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                              <label className="text-sm font-medium">Data de emissão</label>
                                              <Input
                                                type="date"
                                                value={trainingIssuedAt}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                onChange={(e) => setTrainingIssuedAt(e.target.value)}
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-sm font-medium">Data de vencimento</label>
                                              <Input
                                                disabled={!trainingExpire}
                                                type="date"
                                                value={trainingExpiresAt}
                                                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                                onChange={(e) => setTrainingExpiresAt(e.target.value)}
                                              />
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-3 mt-5 justify-end">
                                            <p className="text-sm text-muted-foreground">Este treinamento tem validade?</p>
                                            <Switch onCheckedChange={(value) => setTrainingExpire(value)} checked={trainingExpire} className="cursor-pointer" />
                                          </div>
                                        </section>

                                        <div className="flex justify-end gap-2 pt-2">
                                          <Button variant="secondary" className="cursor-pointer" onClick={() => { setFile(null); setPreview(null); setTrainingIssuedAt(''); setTrainingExpiresAt(''); }}>Limpar</Button>
                                          <Button
                                            className="cursor-pointer gap-2"
                                            disabled={loading}
                                            onClick={() => handleUploadTraining(training.id)}
                                          >
                                            Salvar alterações
                                            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                          </Button>
                                          <DialogClose ref={closeEditDocModal} />
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                </div>
                              ) : (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      className="gap-2 cursor-pointer"
                                      onClick={() => {
                                        setTrainingIssuedAt('')
                                        setTrainingExpiresAt('')
                                        setTrainingExpire(false)
                                      }}
                                    >
                                      <Upload className="w-4 h-4" />
                                      Enviar
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl! w-full">
                                    <div className="space-y-5">
                                      <h3 className="text-lg font-semibold">Enviar comprovante de treinamento</h3>

                                      <input
                                        ref={inputRef}
                                        type="file"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                                        hidden
                                        onChange={(e) => handleSelect(e.target.files)}
                                      />

                                      <div className="flex flex-col gap-2">
                                        <Button
                                          variant="outline"
                                          className="w-fit cursor-pointer"
                                          onClick={() => inputRef.current?.click()}
                                        >
                                          Selecionar arquivo
                                        </Button>

                                        <p className="text-xs text-muted-foreground">
                                          Formatos aceitos: PDF, Word, Excel e PowerPoint
                                        </p>
                                      </div>

                                      {preview && file && (
                                        <div className="flex items-center justify-between gap-3 rounded-md border p-2">
                                          <span className="text-primary line-clamp-1">{file.name}</span>
                                          <Button
                                            size="sm"
                                            variant="ghost"
                                            className="cursor-pointer text-destructive"
                                            onClick={() => {
                                              setFile(null)
                                              setPreview(null)
                                            }}
                                          >
                                            Remover
                                          </Button>
                                        </div>
                                      )}

                                      <section>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div className="space-y-1">
                                            <label className="text-sm font-medium">Data de emissão</label>
                                            <Input
                                              type="date"
                                              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                              onChange={(e) => setTrainingIssuedAt(e.target.value)}
                                            />
                                          </div>

                                          <div className="space-y-1">
                                            <label className="text-sm font-medium">Data de vencimento</label>
                                            <Input
                                              disabled={!trainingExpire}
                                              type="date"
                                              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                                              onChange={(e) => setTrainingExpiresAt(e.target.value)}
                                            />
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-3 mt-5 justify-end">
                                          <p className="text-sm text-muted-foreground">Este treinamento tem validade?</p>
                                          <Switch onCheckedChange={(value) => setTrainingExpire(value)} checked={trainingExpire} className="cursor-pointer" />
                                        </div>
                                      </section>

                                      <div className="flex justify-end gap-2 pt-2">
                                        <Button
                                          variant="secondary"
                                          className="cursor-pointer"
                                          onClick={() => {
                                            setFile(null)
                                            setPreview(null)
                                            setTrainingIssuedAt('')
                                            setTrainingExpiresAt('')
                                          }}
                                        >
                                          Limpar
                                        </Button>

                                        <Button
                                          className="cursor-pointer gap-2"
                                          disabled={!file || loading}
                                          onClick={() => handleUploadTraining(training.id)}
                                        >
                                          Enviar treinamento
                                          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                        </Button>
                                        <DialogClose ref={closeEditDocModal} />
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Nenhum treinamento cadastrado para este funcionário.
                  </p>
                )}

              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}