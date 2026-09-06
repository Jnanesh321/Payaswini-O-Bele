"use client"

import { useState } from "react"
import { QrCode, Shield, CheckCircle2, AlertTriangle, XCircle, User, Wrench } from "lucide-react"

interface AssetQRCardProps {
  assetCode: string
  toolName: string
  status?: string
  custodianName?: string | null
  ownerName?: string | null
  conditionGrade?: string
  onConditionChange?: (grade: "GOOD" | "FAIR" | "DAMAGED") => void
  interactiveCondition?: boolean
  showQrDetails?: boolean
}

// Generate a deterministic SVG QR-like pattern based on string hash
function generatePseudoQrMatrix(code: string): boolean[][] {
  const size = 15
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false))

  // Fixed corner markers (QR finder patterns)
  const drawCorner = (r: number, c: number) => {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        const isBorder = i === 0 || i === 3 || j === 0 || j === 3
        const isCenter = i === 1 && j === 1 && false
        matrix[r + i][c + j] = isBorder || (i === 1 && j === 1) || (i === 2 && j === 2)
      }
    }
  }
  drawCorner(1, 1)
  drawCorner(1, 10)
  drawCorner(10, 1)

  // Pseudo-random data filling using code chars
  let hash = 0
  for (let i = 0; i < code.length; i++) {
    hash = (hash << 5) - hash + code.charCodeAt(i)
    hash |= 0
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Don't overwrite corners
      if ((r <= 5 && c <= 5) || (r <= 5 && c >= 9) || (r >= 9 && c <= 5)) continue
      const val = Math.abs(Math.sin((hash + r * 17 + c * 31) * 0.15))
      matrix[r][c] = val > 0.45
    }
  }

  return matrix
}

export function AssetQRCard({
  assetCode,
  toolName,
  status = "AVAILABLE",
  custodianName,
  ownerName,
  conditionGrade = "GOOD",
  onConditionChange,
  interactiveCondition = false,
  showQrDetails = true,
}: AssetQRCardProps) {
  const [selectedGrade, setSelectedGrade] = useState<"GOOD" | "FAIR" | "DAMAGED">(
    (conditionGrade as "GOOD" | "FAIR" | "DAMAGED") || "GOOD"
  )
  const [expanded, setExpanded] = useState(false)

  const matrix = generatePseudoQrMatrix(assetCode)

  const handleGrade = (grade: "GOOD" | "FAIR" | "DAMAGED") => {
    setSelectedGrade(grade)
    if (onConditionChange) onConditionChange(grade)
  }

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "AVAILABLE":
        return <span className="rounded-full bg-bele-green-muted px-2.5 py-0.5 text-[10px] font-bold text-primary">● Available</span>
      case "HANDED_OVER":
      case "IN_USE":
        return <span className="rounded-full bg-accent/20 px-2.5 py-0.5 text-[10px] font-bold text-accent">● In Custody</span>
      case "RETURNED":
      case "INSPECTION":
        return <span className="rounded-full bg-bele-soil-muted px-2.5 py-0.5 text-[10px] font-bold text-secondary">● Inspection</span>
      default:
        return <span className="rounded-full bg-muted px-2.5 py-0.5 text-[10px] font-bold text-muted-foreground">{st}</span>
    }
  }

  return (
    <div className="overflow-hidden rounded-[22px] border border-border bg-card p-4 shadow-[0_2px_12px_rgba(45,80,22,0.06)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <QrCode size={16} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold tracking-wide text-foreground">
                {assetCode}
              </span>
            </div>
            <p className="truncate text-[11px] text-muted-foreground">{toolName}</p>
          </div>
        </div>
        {getStatusBadge(status)}
      </div>

      {/* QR & Details */}
      {showQrDetails && (
        <div className="mt-3.5 flex items-center gap-3.5 rounded-2xl border border-border/80 bg-background/60 p-3">
          {/* QR Matrix SVG */}
          <div
            onClick={() => setExpanded(!expanded)}
            className="flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-white p-1.5 shadow-sm transition hover:scale-105"
            title="Click to zoom QR"
          >
            <svg viewBox="0 0 15 15" className="h-full w-full shape-rendering-crispEdges">
              {matrix.map((row, r) =>
                row.map((active, c) => (
                  <rect
                    key={`${r}-${c}`}
                    x={c}
                    y={r}
                    width={1}
                    height={1}
                    fill={active ? "#1C1409" : "transparent"}
                  />
                ))
              )}
            </svg>
          </div>

          <div className="min-w-0 flex-1 text-xs">
            {ownerName && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Shield size={12} className="shrink-0 text-secondary" />
                <span className="truncate">Owner: <strong className="text-foreground">{ownerName}</strong></span>
              </div>
            )}
            {custodianName && (
              <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                <User size={12} className="shrink-0 text-primary" />
                <span className="truncate">Custodian: <strong className="text-foreground">{custodianName}</strong></span>
              </div>
            )}
            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Wrench size={11} className="shrink-0" />
              <span>Physical Asset Tag</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Condition Grade Selection */}
      {interactiveCondition && (
        <div className="mt-3.5 border-t border-border pt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Condition Inspection
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => handleGrade("GOOD")}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                selectedGrade === "GOOD"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              }`}
            >
              <CheckCircle2 size={15} />
              <span className="text-[10px] font-bold">Good / Clean</span>
            </button>

            <button
              type="button"
              onClick={() => handleGrade("FAIR")}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                selectedGrade === "FAIR"
                  ? "border-secondary bg-secondary/10 text-secondary"
                  : "border-border bg-card text-muted-foreground hover:border-secondary/40"
              }`}
            >
              <AlertTriangle size={15} />
              <span className="text-[10px] font-bold">Minor Wear</span>
            </button>

            <button
              type="button"
              onClick={() => handleGrade("DAMAGED")}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 text-center transition ${
                selectedGrade === "DAMAGED"
                  ? "border-destructive bg-destructive/10 text-destructive"
                  : "border-border bg-card text-muted-foreground hover:border-destructive/40"
              }`}
            >
              <XCircle size={15} />
              <span className="text-[10px] font-bold">Damaged</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
