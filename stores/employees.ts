import { Document, Employee, Prisma, Training } from "@/lib/generated/prisma/client";
import { proxy } from "valtio";

type EmployeeWithComplements = Prisma.EmployeeGetPayload<{
    include: {
        address: true,
        contact: true,
        contract: true,
        trainings: true,
        documents: true
    }
}>

export const useEmployeesStore = proxy({
    employees: [] as Employee[],
    employee_documents: [] as Document[],
    employee_trainings: [] as Training[],
    show_employee: null as EmployeeWithComplements | null,
})