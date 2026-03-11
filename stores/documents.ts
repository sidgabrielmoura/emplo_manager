import { DocumentsDashboard } from "@/interfaces";
import { Document, Prisma } from "@/lib/generated/prisma/client";
import { proxy } from "valtio";

type DocumentWithEmployee = Prisma.DocumentGetPayload<{
    include: {
        employee: true
    }
}>

export const useDocumentStore = proxy({
    dashboard: null as DocumentsDashboard | null,
    documents: [] as DocumentWithEmployee[]
})