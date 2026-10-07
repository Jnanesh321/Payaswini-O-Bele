import { NextResponse } from "next/server"
import { isFirebaseAdminConfigured } from "@/lib/firebase/admin"
import { isFirebaseConfigured } from "@/lib/firebase/client"

export const dynamic = "force-dynamic"

export async function GET() {
  const status = {
    client: {
      configured: isFirebaseConfigured(),
      hasApiKey: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()),
      hasAuthDomain: Boolean(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim()),
      hasProjectId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()),
      hasStorageBucket: Boolean(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim()),
      hasMessagingSenderId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim()),
      hasAppId: Boolean(process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim()),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || null,
    },
    serverAdmin: {
      configured: isFirebaseAdminConfigured(),
      hasProjectId: Boolean((process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID)?.trim()),
      hasClientEmail: Boolean(process.env.FIREBASE_CLIENT_EMAIL?.trim()),
      hasPrivateKey: Boolean(process.env.FIREBASE_PRIVATE_KEY?.trim()),
      hasServiceAccountKey: Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()),
    },
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV || null,
  }

  return NextResponse.json(status)
}
