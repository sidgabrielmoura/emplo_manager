import { PassportEmission, Employee } from "@/lib/generated/prisma/client";
import { proxy } from "valtio";

export type PassportWithEmployee = PassportEmission & {
    employee: Employee
}

export const usePassportStore = proxy({
    emissions: [] as PassportWithEmployee[],
    loading: false,
    error: null as string | null
})
