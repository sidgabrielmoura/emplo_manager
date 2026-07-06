import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> | { token: string } }
) {
  try {
    const resolvedParams = await params
    const { token } = resolvedParams

    if (!token) {
      return NextResponse.redirect(new URL("/infiltracao/expirado?error=token_missing", req.url))
    }

    // If an admin is already logged in on this browser, redirect them to the panel with warning
    const existingAdminToken =
      req.cookies.get("super_auth_token")?.value ||
      req.cookies.get("auth_token")?.value

    if (existingAdminToken) {
      return NextResponse.redirect(
        new URL("/settings/infiltration?notice=admin_session_active", req.url)
      )
    }

    // Redirect the spy to the expired/validation page, passing the token for verification
    return NextResponse.redirect(new URL(`/infiltracao/expirado?token=${token}`, req.url))
  } catch (error) {
    console.error("GET INFILTRACAO ACESSO ERROR:", error)
    return NextResponse.redirect(new URL("/infiltracao/expirado?error=internal_error", req.url))
  }
}
