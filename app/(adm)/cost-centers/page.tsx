import { AppLayout } from "@/components/app-layout"
import { CostCentersContent } from "@/components/cost-centers-content"
import { Suspense } from "react"
import { SpyPageGuard } from "@/components/spy-page-guard"

export default function CostCentersPage() {
    return (
        <AppLayout>
            <SpyPageGuard page="cost-centers">
                <Suspense fallback={null}>
                    <CostCentersContent />
                </Suspense>
            </SpyPageGuard>
        </AppLayout>
    )
}