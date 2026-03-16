"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building2, Loader2, Lock, User, ShieldCheck, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { superAdminLogin } from "@/actions/requests"
import { LoginBackground } from "@/components/login-background"
import Image from "next/image"
import { Badge } from "@/components/ui/badge"

export default function SuperAdminLoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await superAdminLogin({ email, password })
            toast.success("Login realizado com sucesso!")
            router.push("/superadmin/dashboard")
        } catch (error: any) {
            toast.error(error.response?.data?.error || "Erro ao realizar login")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
            {/* Left Panel - Master Control branding */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-emerald-950 items-center justify-center p-12 overflow-hidden">
                {/* Master Glow Effects */}
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-emerald-600 rounded-full blur-[150px] opacity-20 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-teal-600 rounded-full blur-[120px] opacity-10 animate-pulse delay-1000" />

                {/* Tech Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: `linear-gradient(rgba(16, 185, 129, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(16, 185, 129, 0.1) 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />

                <div className="relative z-10 w-full max-w-lg">
                    <div className="mb-12">
                        <Image src="/ETX-GESTAO-4.png" alt="ETX GESTÃO" width={220} height={55} className="w-auto h-14 brightness-0 invert opacity-90 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]" />
                    </div>

                    <div className="space-y-6">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 rounded-full border border-emerald-500/20 mb-4">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <span className="text-xs font-black text-emerald-400 uppercase tracking-[0.3em]">Acesso Master</span>
                        </div>
                        <h1 className="text-6xl font-black text-white leading-tight tracking-tighter">
                            Controle <span className="text-emerald-500">Global.</span><br />
                            Segurança Absoluta.
                        </h1>
                        <p className="text-xl text-emerald-100/40 font-medium leading-relaxed max-w-md">
                            Interface de administração master para gestão de ecossistemas corporativos e auditoria de conformidade.
                        </p>
                    </div>

                    <div className="mt-20 flex items-center gap-4 text-emerald-500/30 font-black uppercase tracking-[0.4em] text-[10px]">
                        <div className="w-16 h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] rounded-full" />
                        <span>Versão do sistema v1.0.0</span>
                    </div>
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-24 relative bg-white overflow-y-auto">
                <div className="w-full max-w-md space-y-12">
                    {/* Mobile Branding */}
                    <div className="lg:hidden flex flex-col items-center gap-6 mb-12">
                        <Image src="/ETX-GESTAO-4.png" alt="ETX GESTÃO" width={180} height={45} className="w-auto h-12" />
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 rounded-full py-1 font-bold">MASTER ADMIN</Badge>
                    </div>

                    <div className="space-y-3">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                            Master Portal
                        </h2>
                        <p className="text-slate-400 font-medium leading-relaxed">
                            Insira suas credenciais de nível master para acessar o painel de controle global.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 opacity-60">Identidade Master</Label>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="admin@master.com"
                                        className="pl-12 h-16 bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-emerald-100 rounded-3xl transition-all font-medium text-lg"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1 opacity-60">Código de Acesso</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-emerald-500 transition-colors" />
                                    <Input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        placeholder="••••••••"
                                        className="pl-12 h-16 bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-emerald-100 rounded-3xl transition-all font-medium text-lg"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                                    >
                                        {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-18 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xl rounded-3xl shadow-[0_20px_40px_-10px_rgba(16,185,129,0.3)] hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer border-t border-emerald-400/20"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center gap-3">
                                    <Loader2 className="w-8 h-8 animate-spin" />
                                    <span>Verificando...</span>
                                </div>
                            ) : (
                                "Liberar Acesso Master"
                            )}
                        </Button>
                    </form>

                    <div className="mt-12 text-center pt-8 border-t border-slate-50">
                        <p className="text-slate-300 text-[10px] font-black uppercase tracking-[0.4em] italic">Ambiente Seguro • Conexão Criptografada</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
