"use client"

import React from "react"
import { cn } from "@/lib/utils"

interface LoginBackgroundProps {
    children: React.ReactNode
    variant?: "blue" | "emerald"
    className?: string
}

export function LoginBackground({ children, variant = "blue", className }: LoginBackgroundProps) {
    const isBlue = variant === "blue"

    return (
        <div className={cn(
            "min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-slate-950",
            className
        )}>
            {/* Animated Gradients */}
            <div className={cn(
                "absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 animate-pulse transition-colors duration-1000",
                isBlue ? "bg-blue-600" : "bg-emerald-600"
            )} />
            <div className={cn(
                "absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-30 animate-pulse delay-700 transition-colors duration-1000",
                isBlue ? "bg-indigo-600" : "bg-teal-600"
            )} />

            {/* Subtle Grid Pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{ backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`, backgroundSize: '40px 40px' }} />

            {/* Floating Shapes */}
            <div className="absolute top-1/4 left-10 w-20 h-20 border border-white/10 rounded-full animate-bounce animation-duration-[8s] opacity-20" />
            <div className="absolute bottom-1/4 right-10 w-32 h-32 border border-white/10 rounded-3xl rotate-12 animate-pulse animation-duration-[5s] opacity-20" />

            <div className="relative z-10 w-full max-w-xl">
                {children}
            </div>
        </div>
    )
}
