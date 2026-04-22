"use client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { login } from "@/actions/requests"
import { useState } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { LoginBackground } from "@/components/login-background"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login({ email, password })
      toast.success("login realizado com sucesso")
      router.push("/")
    } catch (error: any) {
      console.log(error)
      toast.error(error?.response?.data?.error || "Erro ao realizar login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-white font-sans overflow-hidden">
      {}
      <div className="hidden lg:flex lg:w-1/2 relative bg-slate-950 items-center justify-center p-12 overflow-hidden">
        {}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-600 rounded-full blur-[120px] opacity-20 animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-teal-600 rounded-full blur-[100px] opacity-10 animate-pulse delay-700" />

        {}
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

        <div className="relative z-10 w-full max-w-lg">
          <div className="mb-12">
            <Image
              src="/ETX-GESTAO-5.png"
              alt="ETX GESTÃO"
              width={160}
              height={160}
              className="w-auto h-24 brightness-0 invert opacity-90"
            />
          </div>

          <div className="space-y-6">
            <h1 className="text-5xl font-black text-white leading-tight tracking-tighter">
              Gestão Inteligente.<br />
              <span className="text-emerald-500">Pessoas</span> em Primeiro Lugar.
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-md">
              A plataforma definitiva para controle de conformidade e gestão de equipe em tempo real.
            </p>
          </div>

          <div className="mt-20 flex items-center gap-4 text-slate-500 font-bold uppercase tracking-widest text-xs">
            <div className="w-12 h-1 bg-emerald-600 rounded-full" />
            <span>Versão Profissional 2.0</span>
          </div>
        </div>
      </div>

      {}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 md:p-20 relative bg-white overflow-y-auto">
        <div className="w-full max-w-md space-y-12">
          {}
          <div className="lg:hidden flex justify-center mb-8">
            <Image src="/ETX-GESTAO-5.png" alt="ETX GESTÃO" width={120} height={120} className="w-auto h-16" />
          </div>

          <div className="space-y-2">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              Bem-vindo de volta!
            </h2>
            <p className="text-slate-500 font-medium italic">
              Acesse sua conta para gerenciar sua equipe.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest ml-1">
                  Seu E-mail
                </Label>
                <Input
                  onChange={(e) => setEmail(e.target.value)}
                  id="email"
                  type="email"
                  placeholder="seu@exemplo.com"
                  required
                  className="h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-emerald-100 rounded-2xl transition-all font-medium text-lg px-6"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <Label htmlFor="password" className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                    Sua Senha
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-black uppercase tracking-widest"
                  >
                    Esqueceu?
                  </Link>
                </div>
                <div className="relative group">
                  <Input
                    onChange={(e) => setPassword(e.target.value)}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    className="h-14 bg-slate-50 border-slate-100 focus:bg-white focus:ring-4 focus:ring-emerald-100 rounded-2xl transition-all font-medium text-lg px-6 pr-14"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              disabled={loading}
              type="submit"
              className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black text-xl rounded-2xl shadow-2xl shadow-slate-200 hover:scale-[1.01] active:scale-[0.99] transition-all cursor-pointer"
            >
              {loading ? (
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span>Entrando...</span>
                </div>
              ) : (
                "Entrar no Sistema"
              )}
            </Button>
          </form>

          <div className="pt-8 border-t border-slate-50 text-center">
            <p className="text-sm font-medium text-slate-400 flex items-center justify-center gap-2">
              Ainda não tem acesso personalizado?{" "}
              <h1
                className="text-slate-900 font-black hover:text-emerald-600 transition-colors"
              >
                Fale conosco
              </h1>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}