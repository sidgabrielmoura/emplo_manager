"use client"

import { useSearchParams, useRouter } from "next/navigation"
import { ShieldAlert, KeyRound, AlertTriangle, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import React, { Suspense, useEffect, useState } from "react"
import { toast } from "sonner"
import axios from "axios"

function ExpiradoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const error = searchParams.get("error")
  const token = searchParams.get("token")

  const [verifying, setVerifying] = useState(!!token)
  const [errorState, setErrorState] = useState<string | null>(error)

  useEffect(() => {
    // Delete any active spy token cookie to prevent infinite redirect loops for administrators
    document.cookie = "spy_access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"

    if (token) {
      setVerifying(true)
      axios.post("/api/infiltracao/validar-acesso", { token })
        .then((res) => {
          if (res.data?.success) {
            toast.success("Acesso autorizado! Redirecionando...")
            // Small delay to ensure cookies are processed by browser
            setTimeout(() => {
              router.push("/dashboard")
            }, 300)
          } else {
            setVerifying(false)
            setErrorState(res.data?.error || "expired")
          }
        })
        .catch((err) => {
          console.error(err)
          setVerifying(false)
          setErrorState(err.response?.data?.error || "expired")
        })
    }
  }, [token, router])

  let title = "Acesso Restrito"
  let description = "Não foi possível validar o seu acesso temporário ao painel."
  let icon = <ShieldAlert className="w-10 h-10 text-rose-500" />
  let iconBg = "bg-rose-50 ring-rose-50/50"

  if (errorState === "blocked") {
    title = "Acesso Bloqueado"
    description = "Este link de infiltração temporária foi bloqueado manualmente pelo administrador da empresa."
    icon = <ShieldAlert className="w-10 h-10 text-rose-600 animate-pulse" />
    iconBg = "bg-rose-50 ring-rose-50/50"
  } else if (errorState === "expired") {
    title = "Acesso Expirado"
    description = "O período de validade desta autorização temporária encerrou. Solicite um novo link ao administrador."
    icon = <KeyRound className="w-10 h-10 text-amber-500" />
    iconBg = "bg-amber-50 ring-amber-50/50"
  } else if (errorState === "not_found" || errorState === "token_missing") {
    title = "Link Inválido"
    description = "O link de acesso fornecido é inválido, foi digitado incorretamente ou não existe em nosso registro."
    icon = <AlertTriangle className="w-10 h-10 text-slate-500" />
    iconBg = "bg-slate-100 ring-slate-100/50"
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 selection:bg-rose-500 selection:text-white font-sans relative overflow-hidden">
      {/* Background decorations matching the premium login screen */}
      <div className="absolute top-[-10%] right-[-10%] w-125 h-125 bg-purple-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-125 h-125 bg-emerald-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: `radial-gradient(circle at 2px 2px, #000 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

      <div className="relative w-full max-w-md flex flex-col items-center">
        {/* Logo in top */}
        <div className="mb-8 flex justify-center">
          <Image
            src="/ETX-GESTAO-5.png"
            alt="ETX GESTÃO"
            width={130}
            height={130}
            className="w-auto h-14"
            priority
          />
        </div>

        {/* Main Card */}
        <div className="w-full bg-white border border-slate-100 p-8 rounded-b-4xl shadow-xl shadow-slate-100/55 text-center flex flex-col items-center relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-purple-500 to-rose-400 rounded-t-4xl" />

          {verifying ? (
            <div className="py-6 space-y-6 flex flex-col items-center w-full">
              <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl ring-4 ring-purple-50/50 flex items-center justify-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                  Verificando Acesso
                </h1>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed px-4">
                  Aguarde enquanto consultamos o prazo e a validade das credenciais temporárias de infiltração.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className={`p-4 ${iconBg} rounded-2xl ring-4 mb-6 flex items-center justify-center`}>
                {icon}
              </div>

              <h1 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                {title}
              </h1>

              <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-6 px-2">
                {description}
              </p>

              <div className="w-full h-px bg-slate-100 mb-6" />

              <Link href="/login" className="w-full block">
                <button className="w-full h-12 bg-slate-900 hover:bg-black text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-slate-200 hover:scale-[1.01] active:scale-[0.99]">
                  <ArrowLeft className="w-4 h-4 text-slate-300" /> Voltar ao Login
                </button>
              </Link>
            </>
          )}
        </div>

        {/* Footer text */}
        <p className="mt-8 text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
          Escudo de segurança ETXGestão
        </p>
      </div>
    </div>
  )
}

export default function ExpiradoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-slate-100 p-8 rounded-4xl shadow-xl shadow-slate-100/55 text-center flex flex-col items-center">
          <p className="text-slate-400 text-sm font-semibold leading-relaxed">Carregando status do acesso...</p>
        </div>
      </div>
    }>
      <ExpiradoContent />
    </Suspense>
  )
}
