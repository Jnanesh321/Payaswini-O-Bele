import Link from "next/link"

export default function OperatorJobCompletePage() {
  return (
    <div className="min-h-screen bg-background px-0 sm:px-4 sm:py-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[430px] flex-col items-center justify-center gap-4 overflow-hidden bg-background px-6 py-24 text-center sm:min-h-[800px] sm:rounded-[32px] sm:border sm:border-border sm:shadow-xl">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-primary/10 text-3xl text-primary">✓</div>
        <h1 className="font-display text-2xl font-bold text-foreground">Pickup recorded</h1>
        <p className="max-w-xs text-sm text-muted-foreground">
          The brush cutter is ready for Sowmya&apos;s field job. Continue to the farm when you arrive.
        </p>
        <Link
          href="/operator"
          className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
        >
          Back to job details
        </Link>
      </div>
    </div>
  )
}
