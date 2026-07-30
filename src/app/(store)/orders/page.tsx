"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Package, ArrowRight } from "lucide-react"
import { Button, Card } from "@/components/ui"

export default function OrdersPage() {
  return (
    <div className="container py-8">
      <h1 className="mb-8 text-3xl font-bold">My Orders</h1>
      <Card className="p-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Package className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">No orders yet</h2>
        <p className="mt-2 text-muted-foreground">Your rental orders will appear here</p>
        <Link href="/tools">
          <Button className="mt-6 gap-2">
            Browse Tools <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </Card>
    </div>
  )
}
