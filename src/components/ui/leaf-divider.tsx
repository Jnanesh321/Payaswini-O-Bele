import { useId } from "react"
import { cn } from "@/lib/utils"

type LeafDividerProps = React.HTMLAttributes<HTMLDivElement>

export function LeafDivider({ className, ...props }: LeafDividerProps) {
  const patternId = useId().replace(/[:]/g, "")

  return (
    <div
      role="presentation"
      aria-hidden
      className={cn("relative my-0.5 h-5 overflow-hidden", className)}
      {...props}
    >
      <svg
        width="100%"
        height={20}
        viewBox="0 0 390 20"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id={`leaf-weave-${patternId}`}
            x={0}
            y={0}
            width={28}
            height={20}
            patternUnits="userSpaceOnUse"
          >
            <line
              x1={14}
              y1={2}
              x2={14}
              y2={18}
              className="stroke-bele-green/[0.35]"
              strokeWidth={0.8}
            />
            <path
              d="M14,5 Q8,5 6,8"
              fill="none"
              className="stroke-bele-green/[0.3]"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            <path
              d="M14,9 Q7,8 5,11"
              fill="none"
              className="stroke-bele-green/[0.3]"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            <path
              d="M14,13 Q8,12 6,15"
              fill="none"
              className="stroke-bele-green/[0.3]"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            <path
              d="M14,5 Q20,5 22,8"
              fill="none"
              className="stroke-bele-green/[0.3]"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            <path
              d="M14,9 Q21,8 23,11"
              fill="none"
              className="stroke-bele-green/[0.3]"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
            <path
              d="M14,13 Q20,12 22,15"
              fill="none"
              className="stroke-bele-green/[0.3]"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          </pattern>
        </defs>
        <rect width={390} height={20} fill={`url(#leaf-weave-${patternId})`} />
        <line
          x1={0}
          y1={10}
          x2={390}
          y2={10}
          className="stroke-bele-border-brown"
          strokeWidth={0.6}
        />
      </svg>
    </div>
  )
}