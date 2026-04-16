import { AppLayout } from "@/components/app-layout"
import { CostCentersContent } from "@/components/cost-centers-content"
import { Suspense } from "react"

export default function CostCentersPage() {
    return (
        <AppLayout>
            <Suspense fallback={null}>
                <CostCentersContent />
            </Suspense>
        </AppLayout>
    )
}