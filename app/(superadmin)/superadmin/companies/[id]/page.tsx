import { AppLayout } from "@/components/app-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { StatusBadge } from "@/components/status-badge"
import { ArrowLeft, Building2, Mail, MapPin, Calendar, Ban } from "lucide-react"
import Link from "next/link"

export default function CompanyDetailsPage() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/companies">
            <Button variant="outline" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">Acme Corporation</h1>
            <p className="text-muted-foreground mt-1">Company Details</p>
          </div>
          <Button variant="outline" className="gap-2 bg-transparent text-destructive">
            <Ban className="w-4 h-4" />
            Block Company
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center pb-4">
                <div className="w-24 h-24 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <StatusBadge status="active" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Company Name</p>
                  <p className="text-sm font-medium">Acme Corporation</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Industry</p>
                  <p className="text-sm font-medium">Technology</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Tax ID</p>
                  <p className="text-sm font-medium">00.000.000/0000-00</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Company Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Primary Contact</p>
                    <p className="text-sm font-medium">contact@acmecorp.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium">United States</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Created</p>
                    <p className="text-sm font-medium">January 2023</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Employees</p>
                    <p className="text-sm font-medium">234 employees</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Active Employees</span>
                  <span className="text-sm font-medium">218</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Blocked Employees</span>
                  <span className="text-sm font-medium">8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Terminated</span>
                  <span className="text-sm font-medium">8</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Documents</span>
                  <span className="text-sm font-medium">1,313</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-green-600">Approved</span>
                  <span className="text-sm font-medium text-green-600">1,247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-yellow-600">Pending</span>
                  <span className="text-sm font-medium text-yellow-600">43</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-red-600">Expired</span>
                  <span className="text-sm font-medium text-red-600">23</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Total Users</span>
                  <span className="text-sm font-medium">12</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Admins</span>
                  <span className="text-sm font-medium">3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">HR Staff</span>
                  <span className="text-sm font-medium">9</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  action: "New employee added",
                  description: "Sarah Johnson joined Marketing department",
                  date: "2 hours ago",
                },
                {
                  action: "Document approved",
                  description: "Work permit for Michael Chen",
                  date: "4 hours ago",
                },
                {
                  action: "Contract signed",
                  description: "Employment agreement - Lisa Wong",
                  date: "Yesterday",
                },
                {
                  action: "User invited",
                  description: "New HR user added to the system",
                  date: "2 days ago",
                },
              ].map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0 last:pb-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.action}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
