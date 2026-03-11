import { DashboardInterface } from "@/interfaces";
import { proxy } from "valtio";

export const useDashboardStore = proxy({
    dashboard: null as DashboardInterface | null
})