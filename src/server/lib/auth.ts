import { NextAuthOptions } from "next-auth"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "@/server/db/prisma"

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-otp",
  },
  providers: [
    CredentialsProvider({
      id: "phone",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "tel" },
      },
      async authorize(credentials) {
        if (!credentials?.phone) return null
        const raw = credentials.phone.replace(/\D/g, "")
        const normalized = raw.length === 10 ? `91${raw}` : raw
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { phone: normalized },
              { phone: raw },
            ],
          },
        })
        if (!user) return null
        return { id: user.id, name: user.name, email: user.email, image: user.image, isAdmin: user.isAdmin }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ token, session }) {
      if (token) {
        session.user.id = token.id
        session.user.name = token.name
        session.user.email = token.email
        session.user.image = token.picture
        session.user.isAdmin = token.isAdmin
        session.user.capabilities = token.capabilities || []
      }
      return session
    },
    async jwt({ token, user }) {
      const targetId = user?.id || token.sub
      if (targetId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: targetId },
          include: { capabilities: true },
        })
        if (dbUser) {
          return {
            id: dbUser.id,
            name: dbUser.name,
            email: dbUser.email,
            picture: dbUser.image,
            isAdmin: dbUser.isAdmin,
            capabilities: dbUser.capabilities.map((c) => c.type),
          }
        }
      }
      return token
    },
  },
}

export async function getServerSession() {
  const { getServerSession } = await import("next-auth")
  return getServerSession(authOptions)
}
