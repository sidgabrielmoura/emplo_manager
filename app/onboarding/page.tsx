"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2 } from "lucide-react"

export default function OnboardingPage() {
  const [step, setStep] = useState(1)

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Create your company</CardTitle>
              <CardDescription>Let's set up your company profile to get started</CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-muted"}`} />
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Acme Corporation" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input id="industry" placeholder="Technology" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companySize">Company Size</Label>
                  <Input id="companySize" placeholder="1-50 employees" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" placeholder="United States" />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" onClick={() => setStep(2)}>
                  Continue
                </Button>
              </div>
            </form>
          )}
          {step === 2 && (
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ / Tax ID</Label>
                <Input id="cnpj" placeholder="00.000.000/0000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" placeholder="123 Main Street" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" placeholder="San Francisco" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" placeholder="CA" />
                </div>
              </div>
              <div className="flex justify-between gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="button" onClick={() => setStep(3)}>
                  Continue
                </Button>
              </div>
            </form>
          )}
          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center space-y-3 py-6">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold">All set!</h3>
                <p className="text-muted-foreground">Your company profile has been created successfully</p>
              </div>
              <Button className="w-full" size="lg">
                Go to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
