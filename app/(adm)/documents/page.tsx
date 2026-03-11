import { Suspense } from "react"
import { DocumentsContent } from "@/components/documents-content"
import { AppLayout } from "@/components/app-layout"

export default function DocumentsPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <DocumentsContent />
      </Suspense>
    </AppLayout>
  )
}
