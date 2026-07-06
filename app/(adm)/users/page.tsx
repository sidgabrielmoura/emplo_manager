import { Suspense } from "react"
import { UsersContent } from "@/components/users-content"
import { AppLayout } from "@/components/app-layout"
import { SpyPageGuard } from "@/components/spy-page-guard"

export default function UsersPage() {
  return (
    <AppLayout>
      <SpyPageGuard page="users">
        <Suspense fallback={null}>
          <UsersContent />
        </Suspense>
      </SpyPageGuard>
    </AppLayout>
  )
}
