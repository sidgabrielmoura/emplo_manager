import { AppLayout } from "@/components/app-layout"
import { CostCenterDetails } from "@/components/cost-center-details"
import { Suspense } from "react"

export default async function CostCenterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <CostCenterDetails id={id} />
      </Suspense>
    </AppLayout>
  )
}
