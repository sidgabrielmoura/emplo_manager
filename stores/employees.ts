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
    employees: null as Employee[] | null,
    employee_documents: null as Document[] | null,
    employee_trainings: null as Training[] | null,
    show_employee: null as EmployeeWithComplements | null,
})