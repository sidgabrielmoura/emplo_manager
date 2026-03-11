"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { ChevronLeft, Trash2, Upload } from "lucide-react"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

import { createEmployee, uploadImage } from "@/actions/requests"
import { useSnapshot } from "valtio"
import { useCompanyStore } from "@/stores/company"
import { toast } from "sonner"
import { maskCPF, maskPhone, maskRG } from "@/helpers"

function AvatarUpload({
  value,
  onChange
}: {
  value?: string
  onChange: (file: File | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSelect(file?: File) {
    if (!file) return
    onChange(file)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      className="relative group w-32 h-32 rounded-full overflow-hidden border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center cursor-pointer hover:border-primary transition"
    >
      {value ? (
        <img src={value} className="w-full h-full object-cover" />
      ) : (
        <div className="flex flex-col items-center text-xs text-zinc-400">
          <Upload className="size-5 mb-1" />
          Enviar foto
        </div>
      )}

      <input
        hidden
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleSelect(e.target.files?.[0])}
      />

      {value && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onChange(null)
          }}
          className="absolute top-1 right-1 bg-black/60 hover:bg-black text-white rounded-full p-1 cursor-pointer"
        >
          <Trash2 className="size-3" />
        </button>
      )}
    </div>
  )
}

export default function CreateEmployeeComponent() {
  const { company_selected } = useSnapshot(useCompanyStore)

  const [loading, setLoading] = useState(false)

  const [photo, setPhoto] = useState<string>()
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [cpf, setCpf] = useState("")
  const [rg, setRg] = useState("")
  const [position, setPosition] = useState("")
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "">("")
  const [rotation, setRotation] = useState<"MORNING" | "AFTERNOON" | "NIGHT" | "">("")
  const [birthDate, setBirthDate] = useState("")

  const [contact, setContact] = useState("")
  const [emergencyContact, setEmergencyContact] = useState("")

  const [admissionDate, setAdmissionDate] = useState("")
  const [contractEndDate, setContractEndDate] = useState("")
  const [isTemporaryContract, setIsTemporaryContract] = useState(false)

  const [cep, setCep] = useState("")
  const [address, setAddress] = useState("")
  const [number, setNumber] = useState("")
  const [city, setCity] = useState("")
  const [district, setDistrict] = useState("")
  const [complement, setComplement] = useState("")

  function handlePhoto(file: File | null) {
    if (!file) {
      setPhoto(undefined)
      setPhotoFile(null)
      return
    }

    setPhoto(URL.createObjectURL(file))
    setPhotoFile(file)
  }

  async function handleCreateEmployee() {
    try {
      setLoading(true)

      let imageUrl

      if (photoFile) {
        const upload = await uploadImage(photoFile)
        imageUrl = upload.url
      }

      await createEmployee({
        name,
        email,
        cpf,
        rg,
        gender: gender as any,
        image: imageUrl,
        position,
        rotation: rotation || undefined,
        birthDate,
        companyId: company_selected?.id || "",
        cep,
        address,
        number,
        city,
        district,
        complement,
        contact,
        emergencyContact,
        admissionDate,
        contractEndDate: isTemporaryContract ? contractEndDate : undefined
      })

      toast.success("Funcionário criado!")
    } catch (error: any) {
      toast.error(error.response.data.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto flex flex-col gap-8">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <Link href="/employees">
            <Button variant="outline" size="icon-lg" className="cursor-pointer size-12">
              <ChevronLeft />
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight">
              Novo Funcionário
            </h1>
            <p className="text-muted-foreground text-sm">
              Cadastre os dados do colaborador
            </p>
          </div>
        </div>

        <Button
          onClick={handleCreateEmployee}
          disabled={loading}
          className="cursor-pointer"
        >
          {loading ? "Criando..." : "Criar Funcionário"}
        </Button>
      </header>

      <Separator />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Dados pessoais</CardTitle>
            </CardHeader>

            <CardContent className="grid md:grid-cols-[140px_1fr] gap-6">
              <AvatarUpload value={photo} onChange={handlePhoto} />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label>CPF</Label>
                  <Input value={cpf} onChange={(e) => setCpf(maskCPF(e.target.value))} />
                </div>

                <div className="space-y-1">
                  <Label>RG</Label>
                  <Input value={rg} onChange={(e) => setRg(maskRG(e.target.value))} />
                </div>

                <div className="space-y-1">
                  <Label>Cargo</Label>
                  <Input value={position} onChange={(e) => setPosition(e.target.value)} />
                </div>

                <div className="space-y-1">
                  <Label>Gênero</Label>
                  <Select onValueChange={(v) => setGender(v as any)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Homem</SelectItem>
                      <SelectItem value="FEMALE">Mulher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Turno</Label>
                  <Select onValueChange={(v) => setRotation(v as any)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MORNING">Manhã</SelectItem>
                      <SelectItem value="AFTERNOON">Tarde</SelectItem>
                      <SelectItem value="NIGHT">Noite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Nascimento</Label>
                  <Input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contatos</CardTitle>
            </CardHeader>

            <CardContent className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contato</Label>
                <Input value={maskPhone(contact)} onChange={(e) => setContact(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Contato de emergência</Label>
                <Input value={maskPhone(emergencyContact)} onChange={(e) => setEmergencyContact(e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contrato</CardTitle>
            </CardHeader>

            <CardContent className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Admissão</Label>
                <Input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} />
              </div>

              <div className="space-y-1">
                <Label>Fim do contrato</Label>
                <Input
                  disabled={!isTemporaryContract}
                  type="date"
                  value={contractEndDate}
                  onChange={(e) => setContractEndDate(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 col-span-2">
                <Label>Contrato temporário?</Label>
                <Switch
                  checked={isTemporaryContract}
                  onCheckedChange={setIsTemporaryContract}
                  className="cursor-pointer"
                />
              </div>

            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">

              <Input
                placeholder="CEP"
                value={cep}
                onChange={(e) => setCep(e.target.value)}
              />

              <Input
                placeholder="Endereço"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />

              <Input
                placeholder="Número"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
              />

              <Input
                placeholder="Cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />

              <Input
                placeholder="Bairro"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
              />

              <Input
                placeholder="Complemento"
                value={complement}
                onChange={(e) => setComplement(e.target.value)}
              />

            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}