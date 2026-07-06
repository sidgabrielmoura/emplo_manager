import CreateEmployeeComponent from "@/components/add-employee";
import { AppLayout } from "@/components/app-layout";
import { Suspense } from "react";
import { SpyPageGuard } from "@/components/spy-page-guard";

export default function AddEmployeePage() {
    return (
        <AppLayout>
            <SpyPageGuard page="employees">
                <Suspense fallback={null}>
                    <CreateEmployeeComponent />
                </Suspense>
            </SpyPageGuard>
        </AppLayout>
    )
}