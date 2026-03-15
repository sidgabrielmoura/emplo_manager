"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, User, Calendar, Eye, Search } from "lucide-react"
import { useSnapshot } from "valtio"
import { usePassportStore } from "@/stores/passport"
import { getPassportHistory } from "@/actions/requests"
import { useCompanyStore } from "@/stores/company"
import { AppLayout } from "@/components/app-layout"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"

export default function PassportHistoryPage() {
    const passportStore = useSnapshot(usePassportStore)
    const companyStore = useSnapshot(useCompanyStore)
    const [searchQuery, setSearchQuery] = useState("")

    useEffect(() => {
        if (companyStore.company_selected?.id) {
            getPassportHistory(companyStore.company_selected.id)
        }
    }, [companyStore.company_selected?.id])

    const filteredEmissions = passportStore.emissions?.filter(emission =>
        emission.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emission.employee.cpf.includes(searchQuery)
    )

    return (
        <AppLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/passport">
                        <Button variant="outline" size="icon" className="cursor-pointer">
                            <ArrowLeft className="w-4 h-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold">Histórico de Emissões</h1>
                        <p className="text-muted-foreground mt-1">
                            Acompanhe todas as emissões de passaportes de segurança.
                        </p>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <span>Emissões Recentes</span>
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Buscar funcionário..."
                                    className="pl-9"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {filteredEmissions?.length === 0 ? (
                            <div className="py-12 text-center text-muted-foreground">
                                Nenhuma emissão encontrada.
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Funcionário</TableHead>
                                            <TableHead>CPF</TableHead>
                                            <TableHead>Data de Emissão</TableHead>
                                            <TableHead>Horário</TableHead>
                                            <TableHead className="text-right">Ação</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredEmissions?.map((emission) => (
                                            <TableRow key={emission.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full overflow-hidden bg-muted">
                                                            <img
                                                                src={emission.employee.image || "/avatar-placeholder.jpeg"}
                                                                alt={emission.employee.name}
                                                                className="object-cover w-full h-full"
                                                            />
                                                        </div>
                                                        <span className="font-medium capitalize">{emission.employee.name}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{emission.employee.cpf}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Calendar className="w-4 h-4 text-muted-foreground" />
                                                        {new Date(emission.issuedAt).toLocaleDateString('pt-BR')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {new Date(emission.issuedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Link href={`/passport/view/${emission.employee.id}`}>
                                                        <Button variant="ghost" size="sm" className="gap-2 cursor-pointer">
                                                            <Eye className="w-4 h-4" />
                                                            Ver Passaporte
                                                        </Button>
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    )
}
