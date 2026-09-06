"use client"

import { useState } from "react"
import { ShieldCheck, CheckCircle2, Loader2, X, AlertCircle, Wrench, Sprout, Truck } from "lucide-react"

interface CapabilityVerificationModalProps {
  type: "FARMER" | "TOOL_OWNER" | "OPERATOR"
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialName?: string
  initialVillage?: string
  initialTaluk?: string
  initialDistrict?: string
  initialPincode?: string
}

export function CapabilityVerificationModal({
  type,
  isOpen,
  onClose,
  onSuccess,
  initialName = "",
  initialVillage = "",
  initialTaluk = "",
  initialDistrict = "",
  initialPincode = "",
}: CapabilityVerificationModalProps) {
  const [name, setName] = useState(initialName)
  const [village, setVillage] = useState(initialVillage)
  const [taluk, setTaluk] = useState(initialTaluk)
  const [district, setDistrict] = useState(initialDistrict)
  const [pincode, setPincode] = useState(initialPincode)

  // Custom fields
  const [landSize, setLandSize] = useState("")
  const [cropType, setCropType] = useState("")
  const [upiId, setUpiId] = useState("")
  const [skills, setSkills] = useState<string[]>([])
  const [experienceYears, setExperienceYears] = useState("1")

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const getProfileTitle = () => {
    switch (type) {
      case "FARMER":
        return "Farmer Profile Verification"
      case "TOOL_OWNER":
        return "Tool Owner Payout & KYC"
      case "OPERATOR":
        return "Operator Machinery Certification"
    }
  }

  const getProfileIcon = () => {
    switch (type) {
      case "FARMER":
        return <Sprout size={20} className="text-primary" />
      case "TOOL_OWNER":
        return <Wrench size={20} className="text-secondary" />
      case "OPERATOR":
        return <Truck size={20} className="text-accent" />
    }
  }

  const toggleSkill = (skill: string) => {
    setSkills((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    let notes = ""
    if (type === "FARMER") {
      notes = `Land: ${landSize || "Not specified"} acres | Crops: ${cropType || "General"}`
    } else if (type === "TOOL_OWNER") {
      notes = `Payout UPI: ${upiId || "Self-verified"} | Equipment listed`
    } else if (type === "OPERATOR") {
      notes = `Skills: ${skills.length > 0 ? skills.join(", ") : "Standard machinery"} | Experience: ${experienceYears} year(s)`
    }

    try {
      const res = await fetch("/api/user/capabilities/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          name,
          village,
          taluk,
          district,
          pincode,
          notes,
        }),
      })

      const json = await res.json()
      if (res.ok) {
        setSuccess(true)
        if (onSuccess) onSuccess()
        setTimeout(() => {
          onClose()
        }, 1500)
      } else {
        setError(json.error || "Failed to submit verification request")
      }
    } catch {
      setError("Network error — please try again")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-[420px] rounded-3xl border border-border bg-card p-5 shadow-2xl animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted">
              {getProfileIcon()}
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">{getProfileTitle()}</h3>
              <p className="text-[11px] text-muted-foreground">Verify profile & activate features</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20 text-accent">
              <CheckCircle2 size={24} />
            </div>
            <h4 className="font-display text-base font-bold text-foreground">Verification Submitted!</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              Your profile is pending admin approval. You will be notified once activated.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive">
                <AlertCircle size={14} className="shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Village / Town
                </label>
                <input
                  type="text"
                  value={village}
                  onChange={(e) => setVillage(e.target.value)}
                  placeholder="e.g. Kasaragod"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Taluk
                </label>
                <input
                  type="text"
                  value={taluk}
                  onChange={(e) => setTaluk(e.target.value)}
                  placeholder="Taluk"
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  District
                </label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District"
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Pincode
                </label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="671121"
                  className="w-full rounded-xl border border-border bg-background px-2.5 py-2 text-xs focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            {/* Capability-Specific Fields */}
            {type === "FARMER" && (
              <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Land Size (Acres)
                  </label>
                  <input
                    type="number"
                    value={landSize}
                    onChange={(e) => setLandSize(e.target.value)}
                    placeholder="e.g. 3.5"
                    step="0.1"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Primary Crops
                  </label>
                  <input
                    type="text"
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    placeholder="Areca / Coconut"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {type === "TOOL_OWNER" && (
              <div className="border-t border-border pt-3">
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Payout UPI ID / Bank Details
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  placeholder="e.g. yourname@okaxis"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-muted-foreground">
                  Rental earnings are deposited directly to this UPI handle upon booking completion.
                </p>
              </div>
            )}

            {type === "OPERATOR" && (
              <div className="border-t border-border pt-3">
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Certified Machinery Skills
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {["Power Tillers", "Climbing Poles", "Battery Sprayers", "Weed Cutters"].map((skill) => {
                    const active = skills.includes(skill)
                    return (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition ${
                          active
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        <span className={`h-3 w-3 rounded-full border ${active ? "bg-primary border-primary" : "border-border"}`} />
                        <span>{skill}</span>
                      </button>
                    )
                  })}
                </div>

                <div className="mt-2.5">
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Years of Machinery Experience
                  </label>
                  <input
                    type="number"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    min="1"
                    max="50"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-2.5 text-xs font-bold text-primary-foreground shadow-md transition hover:brightness-110 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Submitting Verification…</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={15} />
                  <span>Submit for Verification</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
