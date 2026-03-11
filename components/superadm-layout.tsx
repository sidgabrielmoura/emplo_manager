"use client"

import type React from "react"
import { useState } from "react"
import { AppHeader } from "./app-header"
import { AppSidebar } from "./app-sidebar"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import Image from "next/image"
import { WarningMainCard } from "./warningMainCard"

interface SuperAdminAppLayoutProps {
    children: React.ReactNode
}

export function SuperAdminAppLayout({ children }: SuperAdminAppLayoutProps) {
    const [open, setOpen] = useState(false)

    return (
        <div className="h-screen w-full bg-slate-50 flex flex-col font-sans overflow-hidden">
            <WarningMainCard />
            <AppHeader onMenuClick={() => setOpen(true)} />

            <div className="flex flex-1 overflow-hidden">
                <div className="hidden lg:block">
                    <AppSidebar />
                </div>

                <Sheet open={open} onOpenChange={setOpen}>
                    <SheetContent side="left" className="p-0 w-64 border-r-0">
                        <AppSidebar onNavItemClick={() => setOpen(false)} />
                    </SheetContent>
                </Sheet>

                <main className="flex-1 p-4 lg:p-8 overflow-y-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    )
}
