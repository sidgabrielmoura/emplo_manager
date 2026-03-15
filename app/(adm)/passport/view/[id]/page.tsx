"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { showEmployee, GetCompanies, getTrainings } from "@/actions/requests"
import { useSnapshot } from "valtio"
import { useEmployeesStore } from "@/stores/employees"
import { useCompanyStore } from "@/stores/company"
import { useUserStore } from "@/stores/user"
import { QRCodeSVG } from "qrcode.react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Printer, Loader2, ShieldCheck, Mail, Phone, Calendar, MapPin } from "lucide-react"
import Link from "next/link"
import { Skeleton } from "@/components/ui/skeleton"

const TRAININGS_PT_BR: Record<string, string> = {
    NR10_SEGURANCA_ELETRICIDADE_40H: "NR-10 Segurança em Eletricidade 40 Horas",
    NR10_SEP_SISTEMA_ELETRICO_POTENCIA: "NR-10 SEP Sistema Elétrico de Potência",
    CARTA_ANUENCIA_SEP_208: "Carta de anuência SEP",
    CNH_CARTEIRA_NACIONAL_HABILITACAO: "CNH - Habitação Nacional",
    TREINAMENTO_DIRECAO_DEFENSIVA_208: "Direção defensiva",
    CURSO_MANUSEIO_EMERGENCIAS_QUIMICAS: "Emergências Químicas",
    CARTA_ANUENCIA_NR12_208: "Carta de anuência NR-12",
    NR12_OPERACAO_MANUTENCAO_MAQUINAS_EQUIPAMENTOS_208: "NR-12 Operação e Manutenção",
    NR35_TRABALHO_ALTURA_RESGATE_AEROGERADORES_16H: "NR-35 Trabalho em Altura",
    CARTA_ANUENCIA_NR35_208: "Carta de anuência NR-35",
    NR11_TALHA_ELETRICA_208: "NR-11 Talha Elétrica",
    COMPROVANTE_QUALIFICACAO: "Comprovante de Qualificação",
    GWO_CERTIFICADO_TREINAMENTO_WINDA_208: "GWO - Certificado WINDA",
    GWO_BST_TRABALHO_RESGATE_ALTURA_16H_208: "GWO - BST Altura",
    GWO_BST_PRIMEIROS_SOCORROS_208: "GWO - BST Primeiros Socorros",
    GWO_BST_MANUSEIO_MANUAL_208: "GWO - BST Manuseio Manual",
    GWO_BST_COMBATE_INCENDIO_208: "GWO - BST Combate a Incêndio",
    ADVANCED_RESCUE_TRAINING_ART: "Advanced Rescue Training (ART)",
}

export default function PassportViewPage() {
    const params = useParams<{ id: string }>()
    const employee = useSnapshot(useEmployeesStore).show_employee
    const trainings = useSnapshot(useEmployeesStore).employee_trainings
    const company = useSnapshot(useCompanyStore).company_selected
    const user = useSnapshot(useUserStore).user
    const [loading, setLoading] = useState(true)
    const [pageUrl, setPageUrl] = useState("")

    useEffect(() => {
        if (typeof window !== "undefined") {
            setPageUrl(window.location.href)
        }
    }, [])

    useEffect(() => {
        if (!params.id) return

        const fetchData = async () => {
            setLoading(true)
            try {
                await showEmployee(params.id)
                await getTrainings(params.id)
                if (user?.id && !company) {
                    await GetCompanies(user.id)
                }
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [params.id, user?.id])

    if (loading || !employee) {
        return (
            <div className="min-h-screen w-full bg-slate-50 p-4 sm:p-10 font-sans text-slate-900 pb-20 flex flex-col items-center">
                <div className="mx-auto mb-8 w-full flex justify-between items-center print:hidden">
                    <Skeleton className="h-10 w-24 rounded-xl" />
                    <Skeleton className="h-10 w-32 rounded-xl" />
                </div>

                <div className="w-full mx-auto grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100">
                    <div className="bg-slate-50/50 border-r border-slate-100 flex flex-col pt-8 order-2 lg:order-1 h-[800px]">
                        <div className="px-8 mb-6 space-y-2">
                            <Skeleton className="h-6 w-64" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="flex-1 px-4 pb-8">
                            <Skeleton className="w-full h-full rounded-2xl" />
                        </div>
                    </div>

                    <div className="flex flex-col order-1 lg:order-2">
                        <div className="p-8 sm:p-12 space-y-10 flex-1">
                            <div className="flex flex-col items-center gap-6 text-center">
                                <Skeleton className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl" />
                                <div className="space-y-2 flex flex-col items-center">
                                    <Skeleton className="h-8 w-64" />
                                    <Skeleton className="h-4 w-40" />
                                </div>
                            </div>

                            <div className="space-y-4 pt-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                    <Skeleton className="h-24 w-full rounded-2xl" />
                                </div>
                                <Skeleton className="h-20 w-full rounded-2xl" />
                            </div>

                            <div className="flex items-center gap-8 pt-6 border-t border-slate-100">
                                <Skeleton className="w-[100px] h-[100px] rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-40" />
                                    <Skeleton className="h-4 w-56" />
                                </div>
                            </div>
                        </div>

                        <div className="px-8 pb-8">
                            <Skeleton className="h-14 w-full rounded-2xl" />
                            <Skeleton className="h-3 w-48 mx-auto mt-4" />
                        </div>
                    </div>
                </div>
            </div>
        )
    }


    const monitoringItems = (trainings || []).map(t => ({
        name: TRAININGS_PT_BR[t.type] || t.type.replaceAll("_", " "),
        status: t.status,
        expiry: t.expiresAt ? new Date(t.expiresAt).toLocaleDateString("pt-BR", { timeZone: 'UTC' }) : "—"
    }))

    const allApproved = monitoringItems.every(item => item.status === "APPROVED")

    return (
        <div className="min-h-screen bg-slate-50 p-4 sm:p-10 font-sans text-slate-900 pb-20">
            <div className="w-full mx-auto mb-8 flex justify-between items-center print:hidden">
                <Link href="/passport">
                    <Button variant="ghost" className="gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Voltar
                    </Button>
                </Link>
                <Button onClick={() => window.print()} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all shadow-slate-200 h-10 px-4 rounded-xl font-bold">
                    <Printer className="w-4 h-4" /> Imprimir
                </Button>
            </div>

            <div className="w-full mx-auto grid grid-cols-1 lg:grid-cols-2 bg-white rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-slate-100 passport-container">
                <div className="bg-slate-50/50 border-r border-slate-100 flex flex-col pt-8 order-2 lg:order-1">
                    <div className="px-8 mb-6">
                        <h3 className="text-slate-900 font-bold text-lg flex items-center gap-2">
                            Monitoramento de Treinamentos
                        </h3>
                        <p className="text-slate-400 text-xs mt-1 uppercase tracking-wider font-semibold">Validade e Capacitação Técnica</p>
                    </div>

                    <div className="flex-1 px-4 pb-8">
                        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                            <div className="grid grid-cols-12 bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider border-b border-slate-100">
                                <div className="col-span-7 p-3">Treinamento</div>
                                <div className="col-span-5 p-3 text-right">Vencimento</div>
                            </div>

                            <div className="max-h-[600px] overflow-auto print:max-h-none print:overflow-visible">
                                {monitoringItems.length > 0 ? monitoringItems.map((item, idx) => (
                                    <div key={idx} className="grid grid-cols-12 text-[11px] border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <div className="col-span-7 p-3 flex flex-col gap-1">
                                            <span className="font-semibold text-slate-700 capitalize line-clamp-1">{item.name}</span>
                                            <span className={`text-[9px] font-bold uppercase ${item.status === 'APPROVED' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                {item.status === 'APPROVED' ? '● Aprovado' : '● Pendente'}
                                            </span>
                                        </div>
                                        <div className="col-span-5 p-3 text-right font-medium text-slate-400 flex items-center justify-end">
                                            {item.expiry}
                                        </div>
                                    </div>
                                )) : (
                                    <p className="p-8 text-center text-slate-400 text-sm">Nenhum treinamento registrado.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col order-1 lg:order-2">
                    <div className="p-8 sm:p-12 space-y-10 flex-1">

                        <div className="flex flex-col items-center gap-6 text-center">
                            <div className="relative">
                                <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-2xl overflow-hidden ring-4 ring-white shadow-xl">
                                    <img
                                        src={employee?.image || "/avatar-placeholder.jpeg"}
                                        alt={employee?.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className={`absolute -bottom-2 -right-2 w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border-4 border-white ${allApproved ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                                    <ShieldCheck className="w-5 h-5 text-white" />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 capitalize tracking-tight">{employee?.name}</h2>
                                <p className="text-slate-400 font-medium text-sm uppercase tracking-widest">{employee?.position}</p>
                            </div>
                        </div>

                        <div className="space-y-4 pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">CPF</p>
                                    <p className="font-semibold text-slate-700">{employee?.cpf}</p>
                                </div>
                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100/50">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">Empresa</p>
                                    <p className="font-semibold text-slate-700 line-clamp-1">{company?.name || "—"}</p>
                                </div>
                            </div>

                            <div className="bg-slate-50/50 p-4 rounded-2xl border border-dashed border-red-200">
                                <p className="text-[10px] text-red-400 font-extrabold uppercase tracking-wider mb-1">Contato de Emergência</p>
                                <p className="font-bold text-red-600 flex items-center gap-2">
                                    <Phone className="w-3 h-3" /> {employee?.contact?.emergencyContact || "—"}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 pt-6 border-t border-slate-100">
                            <div className="p-3 bg-white rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-50">
                                <QRCodeSVG value={pageUrl} size={80} level="M" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                                <h4 className="text-slate-900 font-bold text-sm tracking-tight capitalize">
                                    Escaneie para validar
                                </h4>
                                <p className="text-slate-400 text-[11px] leading-relaxed">
                                    Utilize a câmera para acessar o cadastro em tempo real.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 pb-8">
                        <div className={`py-4 px-6 rounded-2xl text-center font-bold text-white text-sm uppercase tracking-widest shadow-lg shadow-opacity-20 ${allApproved ? "bg-emerald-500 shadow-emerald-200" : "bg-amber-500 shadow-amber-200"}`}>
                            {allApproved ? "Habilitado para o Trabalho" : "Apto com Restrições"}
                        </div>
                        <p className="text-center text-[10px] text-slate-400 mt-4 font-medium italic">
                            Documento emitido digitalmente em {new Date().toLocaleDateString("pt-BR")}
                        </p>
                    </div>
                </div>
            </div>

            <style jsx global>{`
                @media print {
                    @page { margin: 0; }
                    body { 
                        background: white !important;
                        padding: 0 !important;
                        margin: 0 !important; 
                    }
                    .passport-container {
                        box-shadow: none !important;
                        border: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        height: 100vh !important;
                        border-radius: 0 !important;
                    }
                    .bg-slate-50 {
                        background-color: transparent !important;
                    }
                }
            `}</style>
        </div>
    )
}
