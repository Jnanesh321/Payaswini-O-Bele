import { redirect } from "next/navigation"
import { getServerSession } from "@/server/lib/auth"

export const dynamic = "force-dynamic"

export default async function ProfileRedirectPage() {
  const session = await getServerSession()

  if (!session?.user) {
    redirect("/login?callbackUrl=/profile")
  }

  const caps = Array.isArray(session.user.capabilities) ? session.user.capabilities : []

  if (caps.includes("OPERATOR")) {
    redirect("/operator/profile")
  }

  if (caps.includes("TOOL_OWNER")) {
    redirect("/owner/profile")
  }

  redirect("/dashboard#account")
}
