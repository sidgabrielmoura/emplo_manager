import { Suspense } from "react"
import { UsersContent } from "@/components/users-content"
import { AppLayout } from "@/components/app-layout"

export default function UsersPage() {
  return (
    <AppLayout>
      <Suspense fallback={null}>
        <UsersContent />
      </Suspense>
    </AppLayout>
  )
}
