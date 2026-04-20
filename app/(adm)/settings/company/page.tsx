"use client"

import { getDaysRemaining } from "@/lib/utils"

import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCompanyStore } from "@/stores/company"
import { useSnapshot } from "valtio"
import { useEffect, useState } from "react"
import { Building2, Save, Upload, Loader2, ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, Eye } from "lucide-react"
import { useRouter } from "next/navigation"
import { updateCompany, uploadImage, getCompanyDocuments, updateCompanyDocument, getCompanyData } from "@/actions/requests"
import { toast } from "sonner"
import Link from "next/link"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useRef } from "react"

const COMPANY_DOCS = [
    { type: 'CNPJ_SOCIAL_CONTRACT', label: 'Contrato Social' },
    { type: 'PGR_COMPANY', label: 'PGR' },
    { type: 'PCMSO_COMPANY', label: 'PCMSO' },
    { type: 'ALVARA_LOCALIZACAO', label: 'Alvará de localização e Funcionamento' },
    { type: 'AET_ERGONOMICA', label: 'AET – Análise Ergonômica' },
    { type: 'LICENCA_AMBIENTAL', label: 'Licença Ambiental ou Dispensa de Licenciamento' },
    { type: 'LTCAT', label: 'LTCAT' },
    { type: 'NR15_INSALUBRIDADE', label: 'NR-15 Laudo de insalubridade' },
    { type: 'NR16_PERICULOSIDADE', label: 'NR-16 Laudo de periculosidade' },
    { type: 'PCA_AUDITIVA', label: 'PCA (Programa de Conservação Auditiva)' },
    { type: 'PPR_RESPIRATORIA', label: 'PPR (Programa de Proteção Respiratória)' },
    { type: 'PGR_CPFL', label: 'PGR CPFL' },
    { type: 'PCMSO_CPFL', label: 'PCMSO CPFL' },
]

const LABOR_DOCS = [
    { type: 'CRF_FGTS', label: 'CRF - Certificado de regularidade do FGTS' },
    { type: 'GUIA_FGTS_DIGITAL', label: 'Guia do FGTS Digital + Comprovante de pagamento' },
    { type: 'GUIA_DARF_PREVIDENCIARIO', label: 'Guia do DARF Previdenciário + Comprovante de pagamento' },
    { type: 'CND_DIVIDA_ATIVA_UNIAO', label: 'CND Divida ativa da união' },
    { type: 'FOLHA_PAGAMENTO_RESUMO', label: 'Folha de pagamento e Resumo da Folha' },
    { type: 'COMPROVANTE_PAGAMENTO_SALARIO', label: 'Comprovante de pagamento de salário' },
    { type: 'CONVENCAO_COLETIVA', label: 'Convenção coletiva' },
    { type: 'ESPELHO_DE_PONTO', label: 'Espelho de ponto*' },
    { type: 'DECLARACAO_DCTFWEB', label: 'Declaração Completa - DCTFWeb' },
    { type: 'DECLARACAO_ALOCACAO', label: 'Declaração de alocação' },
    { type: 'DECLARACAO_DEMITIDOS_ESOCIAL', label: 'Declaração de demitidos + Relação de Trabalhadores - eSocial' },
    { type: 'DECLARACAO_MENSAL_FERIAS', label: 'Declaração mensal de férias' },
    { type: 'RECIBO_FERIAS_PAGAMENTO', label: 'Recibo de férias e comprovante de pagamento geral' },
    { type: 'CND_DEBITOS_TRABALHISTAS', label: 'CND - Débitos Trabalhistas' },
    { type: 'GUIA_DAS_PAGAMENTO', label: 'Guia do DAS + Comprovante de pagamento' }
]

export default function CompanySettingsPage() {
    const router = useRouter()
    const { company_selected } = useSnapshot(useCompanyStore)
    const [loading, setLoading] = useState(false)
    const [documents, setDocuments] = useState<any[]>([])
    const [docsLoading, setDocsLoading] = useState(true)


    const [uploadLoading, setUploadLoading] = useState(false)
    const [selectedType, setSelectedType] = useState<string | null>(null)
    const [uploadFile, setUploadFile] = useState<File | null>(null)

    const docInputRef = useRef<HTMLInputElement>(null)
    const dialogCloseRef = useRef<HTMLButtonElement>(null)

    const [form, setForm] = useState({
        name: '', cnpj: '', email: '', phone: '', address: '', state: '', city: '', responsible: '', imageUrl: '', disabledDocuments: [] as string[]
    })

    useEffect(() => {
        const fetchCompanyData = async () => {
            const companyId = localStorage.getItem('company_id')

            if (!company_selected && !companyId) {
                router.push('/dashboard')
                return
            }

            let loadedCompany = company_selected

            try {
                if (!company_selected && companyId) {
                    loadedCompany = await getCompanyData(companyId)
                }

                if (loadedCompany) {
                    setForm({
                        name: loadedCompany.name || '',
                        cnpj: loadedCompany.cnpj || '',
                        email: loadedCompany.email || '',
                        phone: loadedCompany.phone || '',
                        address: loadedCompany.address || '',
                        state: loadedCompany.state || '',
                        city: loadedCompany.city || '',
                        responsible: loadedCompany.responsible || '',
                        imageUrl: loadedCompany.imageUrl || '',
                        disabledDocuments: (loadedCompany as any).disabledDocuments || []
                    })

                    setDocsLoading(true)
                    const updatedDocs = await getCompanyDocuments(loadedCompany.id)
                    setDocuments(updatedDocs)
                }
            } catch (error) {
                console.error("Failed to load company data", error)
                router.push('/dashboard')
            } finally {
                setDocsLoading(false)
            }
        }

        fetchCompanyData()
    }, [company_selected, router])

    const handleSave = async () => {
        setLoading(true)
        try {
            const companyId = company_selected?.id || localStorage.getItem('company_id')
            await updateCompany({ ...form, companyId })
            toast.success("Dados da empresa atualizados!")
        } catch (error) {
            toast.error("Erro ao atualizar empresa")
        } finally {
            setLoading(false)
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLoading(true)
            try {
                const uploaded: any = await uploadImage(e.target.files[0])
                setForm(prev => ({ ...prev, imageUrl: uploaded.url }))
                toast.success("Logo atualizada!")
            } catch (error) {
                toast.error("Erro ao subir imagem")
            } finally {
                setLoading(false)
            }
        }
    }

    const handleUploadDocument = async (virtualId?: string) => {
        const companyId = company_selected?.id || localStorage.getItem('company_id')
        if (!uploadFile || !companyId) return
        if (!selectedType && !virtualId) return

        setUploadLoading(true)
        try {
            const uploaded: any = await uploadImage(uploadFile).catch(() => {
                toast.error("Erro ao fazer upload do arquivo (pode ser muito grande).")
                return null
            })

            if (!uploaded) throw new Error("Upload failed")

            await updateCompanyDocument({
                id: virtualId,
                companyId: companyId,
                type: selectedType || 'CUSTOM',
                fileUrl: uploaded.url
            })

            toast.success("Documento enviado com sucesso!")

            setDocsLoading(true)
            const updatedDocs = await getCompanyDocuments(companyId)
            setDocuments(updatedDocs)

            setUploadFile(null)
            setSelectedType(null)
            dialogCloseRef.current?.click()
        } catch (error) {
            toast.error("Erro ao atualizar dados do documento.")
        } finally {
            setUploadLoading(false)
            setDocsLoading(false)
        }
    }

    const renderDocumentTable = (docList: { type: string, label: string }[], isAdditional?: boolean) => {
        const stats = {
            total: docList.length,
            approved: docList.filter(item => documents.find(d => d.type === item.type)?.status === 'APPROVED').length,
            pending: docList.length - docList.filter(item => documents.find(d => d.type === item.type)?.status === 'APPROVED').length
        }

        return (
            <div className="space-y-6 w-full">
                {!isAdditional && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-2xl">
                                <FileText className="w-5 h-5 text-slate-400" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total de Itens</p>
                                <p className="text-xl font-black text-slate-700">{stats.total}</p>
                            </div>
                        </Card>
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 rounded-2xl">
                                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Aprovados</p>
                                <p className="text-xl font-black text-emerald-700">{stats.approved}</p>
                            </div>
                        </Card>
                        <Card className="rounded-3xl border-slate-100 shadow-sm bg-white p-4 flex items-center gap-4">
                            <div className="p-3 bg-amber-50 rounded-2xl">
                                <Clock className="w-5 h-5 text-amber-500" />
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">Pendentes</p>
                                <p className="text-xl font-black text-amber-700">{stats.pending}</p>
                            </div>
                        </Card>
                    </div>
                )}

                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
                    <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                        <CardTitle className="text-slate-800 text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" /> {isAdditional ? "Documentos Adicionais" : "Referência de Documentos"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 px-8">
                        {docsLoading ? (
                            <div className="p-6 space-y-4">
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                                <Skeleton className="h-10 w-full rounded-xl" />
                            </div>
                        ) : (
                            <div className="overflow-x-auto py-4">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Documento</TableHead>
                                            <TableHead className="w-40! text-center">Status</TableHead>
                                            <TableHead className="w-40! text-center">Data de emissão</TableHead>
                                            <TableHead className="w-40! text-center">Dias para vencer</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {docList.map(({ type, label }) => {
                                            const docData = documents.find(d =>
                                                isAdditional
                                                    ? (d.type === "CUSTOM" && d.name === label)
                                                    : d.type === type
                                            )
                                            return (
                                                <TableRow key={type + label}>
                                                    <TableCell className="font-medium text-slate-700 max-w-[250px] truncate">{label}</TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant={!docData ? "secondary" : docData.status === "APPROVED" ? "default" : "destructive"}>
                                                            {!docData ? "Pendente" : docData.status === "APPROVED" ? "Aprovado" : "Pendência"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center text-slate-500">
                                                        {docData?.issuedAt ? new Date(docData.issuedAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-center text-slate-500">
                                                        {docData?.expiresAt ? getDaysRemaining(docData.expiresAt) : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {docData?.fileUrl ? (
                                                            <Link href={docData.fileUrl} target="_blank">
                                                                <Button variant="outline" size="sm" className="gap-2 cursor-pointer rounded-xl text-xs font-bold border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                                                                    <Eye className="w-4 h-4" /> Ver
                                                                </Button>
                                                            </Link>
                                                        ) : (
                                                            <Dialog>
                                                                <DialogTrigger asChild>
                                                                    <Button size="sm" onClick={() => setSelectedType(type)} className="gap-2 cursor-pointer rounded-xl bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold shadow-md shadow-slate-200">
                                                                        <Upload className="w-4 h-4" /> Enviar
                                                                    </Button>
                                                                </DialogTrigger>
                                                                <DialogContent className="max-w-2xl! w-full rounded-2xl">
                                                                    <div className="space-y-4 pt-4">
                                                                        <h3 className="font-bold text-lg text-slate-800">Enviar: {label}</h3>

                                                                        <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl p-6 bg-slate-50">
                                                                            <input
                                                                                type="file"
                                                                                className="hidden"
                                                                                ref={docInputRef}
                                                                                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                                                                                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                                                            />
                                                                            {uploadFile ? (
                                                                                <div className="flex flex-col items-center gap-2">
                                                                                    <FileText className="w-8 h-8 text-emerald-500" />
                                                                                    <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{uploadFile.name}</span>
                                                                                    <Button variant="link" onClick={() => setUploadFile(null)} className="text-red-500 h-auto p-0 text-xs">Remover arquivo</Button>
                                                                                </div>
                                                                            ) : (
                                                                                <Button variant="outline" className="cursor-pointer border-dashed border-2 rounded-xl text-slate-600 font-bold" onClick={() => docInputRef.current?.click()}>
                                                                                    <Upload className="w-4 h-4 mr-2" /> Selecionar Arquivo
                                                                                </Button>
                                                                            )}
                                                                        </div>


                                                                        <div className="flex gap-2 pt-4">
                                                                            <DialogTrigger asChild>
                                                                                <Button variant="outline" className="flex-1 rounded-xl cursor-pointer" ref={dialogCloseRef as any}>
                                                                                    Cancelar
                                                                                </Button>
                                                                            </DialogTrigger>
                                                                            <Button onClick={() => {
                                                                                if (isAdditional && docData?.id) {
                                                                                    handleUploadDocument(docData.id)
                                                                                } else {
                                                                                    handleUploadDocument()
                                                                                }
                                                                            }} disabled={!uploadFile || uploadLoading} className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer">
                                                                                {uploadLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                                                                Salvar
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                </DialogContent>
                                                            </Dialog>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!form.name && !company_selected) return null

    return (
        <AppLayout>
            <div className="space-y-6 w-full mx-auto">
                <div className="flex items-center gap-4">
                    <Link href="/settings">
                        <Button variant="outline" size="icon" className="cursor-pointer bg-white">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-linear-to-r from-emerald-800 to-emerald-600">
                            Configurações da Empresa
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Gerencie os dados e documentos corporativos
                        </p>
                    </div>
                </div>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="bg-white border shadow-sm p-1 rounded-2xl h-auto flex flex-wrap gap-1 sticky top-0 z-10">
                        <TabsTrigger value="details" className="rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold px-6 py-2.5">
                            Dados Gerais
                        </TabsTrigger>
                        <TabsTrigger value="company-docs" className="rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold px-6 py-2.5">
                            Documentos da Empresa
                        </TabsTrigger>
                        <TabsTrigger value="labor-docs" className="rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 font-bold px-6 py-2.5">
                            Documentos Trabalhistas
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="mt-8">
                        <Card className="rounded-[2.5rem] border-slate-100 shadow-sm overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                                <CardTitle className="flex items-center gap-3 text-slate-800 text-xl font-bold">
                                    <Building2 className="w-6 h-6 text-emerald-600" />
                                    Informações Cadastrais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2 flex items-center gap-6 mb-4">
                                        <div className="w-24 h-24 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0 relative group">
                                            {form.imageUrl ? (
                                                <img src={form.imageUrl} alt="Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <Building2 className="w-8 h-8 text-slate-300" />
                                            )}
                                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <Upload className="w-6 h-6 text-white" />
                                                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                            </label>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg">Logomarca</h3>
                                            <p className="text-slate-500 text-sm">Clique na imagem para alterar a logo da sua empresa.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <Label className="font-bold text-slate-700">Razão Social / Nome Fantasia</Label>
                                        <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">CNPJ</Label>
                                        <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Responsável Legal</Label>
                                        <Input value={form.responsible} onChange={e => setForm({ ...form, responsible: e.target.value })} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">E-mail</Label>
                                        <Input value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Telefone</Label>
                                        <Input value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2 md:col-span-2 mt-4 pt-6 border-t border-slate-100">
                                        <Label className="font-bold text-slate-700">Endereço Completo</Label>
                                        <Input value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Cidade</Label>
                                        <Input value={form.city} onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="font-bold text-slate-700">Estado (UF)</Label>
                                        <Input value={form.state} onChange={e => setForm(prev => ({ ...prev, state: e.target.value }))} className="rounded-xl h-11 bg-slate-50/50" />
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <Button onClick={handleSave} disabled={loading} className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 px-8 shadow-lg shadow-emerald-100 cursor-pointer">
                                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5 mr-2" />}
                                        Salvar Alterações
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="company-docs" className="mt-8 space-y-8">
                        {renderDocumentTable(COMPANY_DOCS.filter(d => !(form.disabledDocuments || []).includes(d.type)))}

                        {documents.filter(d => d.type === 'CUSTOM').length > 0 && (
                            renderDocumentTable(
                                documents
                                    .filter(d => d.type === 'CUSTOM')
                                    .map(d => ({ type: 'CUSTOM', label: d.name })),
                                true
                            )
                        )}
                    </TabsContent>

                    <TabsContent value="labor-docs" className="mt-8">
                        {renderDocumentTable(LABOR_DOCS.filter(d => !(form.disabledDocuments || []).includes(d.type)))}
                    </TabsContent>
                </Tabs>
            </div>
        </AppLayout>
    )
}
