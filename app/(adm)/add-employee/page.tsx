import CreateEmployeeComponent from "@/components/add-employee";
import { AppLayout } from "@/components/app-layout";
import { Suspense } from "react";

export default function AddEmployeePage() {
    return (
        <AppLayout>
            <Suspense fallback={null}>
                <CreateEmployeeComponent />
            </Suspense>
        </AppLayout>
    )
}