"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createUserSchema } from "@/schemas/create-user"
import { z } from "zod"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Loader2, UserPlus } from "lucide-react"

type FormData = z.infer<typeof createUserSchema>

export default function AddEmployeeComponent() {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createUserSchema),
  })

  async function onSubmit(data: FormData) {
    console.log(data)
  }

  return (
    <main className="flex-1 p-6 flex items-center justify-center w-full h-full">
      <Card className="w-full max-w-2xl mx-auto shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Criar novo usuário
          </CardTitle>
          <CardDescription>
            Preencha os dados para adicionar um usuário ao sistema
          </CardDescription>
        </CardHeader>

        <Separator />

        <CardContent className="pt-6">
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="grid gap-5"
          >
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input placeholder="Nome completo" {...register("name")} />
              {errors.name && (
                <span className="text-sm text-red-500">
                  {errors.name.message}
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                type="email"
                placeholder="email@empresa.com"
                {...register("email")}
              />
              {errors.email && (
                <span className="text-sm text-red-500">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Senha</Label>
              <Input
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <span className="text-sm text-red-500">
                  {errors.password.message}
                </span>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Perfil</Label>
              <Select onValueChange={(v) => setValue("role", v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SUPERADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Administrador</SelectItem>
                  <SelectItem value="RH">RH</SelectItem>
                </SelectContent>
              </Select>
              {errors.role && (
                <span className="text-sm text-red-500">
                  {errors.role.message}
                </span>
              )}
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-4"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar usuário"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
