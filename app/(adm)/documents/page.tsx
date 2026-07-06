import { Suspense } from "react"
import { DocumentsContent } from "@/components/documents-content"
import { AppLayout } from "@/components/app-layout"
import { SpyPageGuard } from "@/components/spy-page-guard"

export default function DocumentsPage() {
  return (
    <AppLayout>
      <SpyPageGuard page="documents">
        <Suspense fallback={null}>
          <DocumentsContent />
        </Suspense>
      </SpyPageGuard>
    </AppLayout>
  )
}
