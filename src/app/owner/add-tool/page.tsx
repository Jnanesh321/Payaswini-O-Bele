"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, HelpCircle, Camera, ImageIcon, Check, Loader2, Plus, Minus, X } from "lucide-react"
import { Button } from "@/components/ui"
import { ToolCategory } from "@prisma/client"
import { useSession } from "@/components/providers/session-provider"
import { PhoneCompletionModal } from "@/components/auth"

const categoryOptions = [
  { value: ToolCategory.TILLERS, label: "Tillage & Land Prep (Tiller)" },
  { value: ToolCategory.HARVESTING_TOOLS, label: "Harvesting & Crop Separation" },
  { value: ToolCategory.SPRAYERS, label: "Spraying & Protection" },
  { value: ToolCategory.CLIMBING_POLES, label: "Climbing Poles" },
  { value: ToolCategory.NETS_COVERS, label: "Nets & Covers" },
  { value: ToolCategory.TRANSPLANTERS, label: "Transplanters" },
  { value: ToolCategory.PRUNERS_CUTTERS, label: "Pruners & Cutters" },
  { value: ToolCategory.WATER_PUMPS, label: "Water Pumps" },
  { value: ToolCategory.OTHER, label: "Other Tools" },
]

export default function AddToolPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [name, setName] = useState("")
  const [category, setCategory] = useState<string>(ToolCategory.CLIMBING_POLES)
  const [pricePerDay, setPricePerDay] = useState("")
  const [deposit, setDeposit] = useState("")
  const [conditionGrade, setConditionGrade] = useState("EXCELLENT")
  const [requiresOperator, setRequiresOperator] = useState(false)
  const [operatorFee, setOperatorFee] = useState("")
  const [description, setDescription] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [imageUrl, setImageUrl] = useState("")
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPhoneModal, setShowPhoneModal] = useState(false)

  const handleIncrement = () => setQuantity((q) => q + 1)
  const handleDecrement = () => setQuantity((q) => (q > 1 ? q - 1 : 1))

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show immediate local preview
    const localUrl = URL.createObjectURL(file)
    setPhotoPreview(localUrl)
    setUploadingPhoto(true)
    setError("")

    try {
      // Compress image client-side via canvas for fast mobile uploading
      const compressedDataUrl = await new Promise<string>((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          const maxDim = 1200
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")
          ctx?.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL("image/jpeg", 0.82))
        }
        img.onerror = () => resolve(localUrl)
        img.src = localUrl
      })

      // Attempt upload to /api/upload
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()

      if (res.ok && data.success && data.url) {
        setImageUrl(data.url)
        setPhotoPreview(data.url)
      } else {
        // Fallback to compressed base64 data URL if upload failed
        setImageUrl(compressedDataUrl)
        setPhotoPreview(compressedDataUrl)
      }
    } catch {
      // Fallback
      setImageUrl(localUrl)
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = () => {
    setImageUrl("")
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const executeSubmit = async () => {
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/owner/equipment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          pricePerDay: pricePerDay.trim(),
          deposit: deposit.trim() || "0",
          conditionGrade,
          requiresCertifiedOperator: requiresOperator,
          operatorFeePerDay: requiresOperator ? (operatorFee.trim() || "0") : "0",
          description: description.trim(),
          quantity,
          imageUrl: imageUrl.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.needsPhone) {
          setShowPhoneModal(true)
          return
        }
        setError(data.error || "Failed to list tool")
        return
      }

      // Success, redirect back to owner dashboard
      router.push("/owner")
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!name.trim()) return setError("Tool Name is required")
    if (!pricePerDay.trim()) return setError("Daily Rental Rate is required")
    if (!description.trim()) return setError("Description is required")

    // Check if user has a verified phone number for equipment listings
    const userPhone = session?.user?.phone
    const hasValidPhone = Boolean(
      userPhone &&
      userPhone.startsWith("91") &&
      userPhone.length === 12 &&
      !userPhone.includes("000000")
    )

    if (session?.user?.needsPhone || !hasValidPhone) {
      setShowPhoneModal(true)
      return
    }

    await executeSubmit()
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0] flex flex-col items-center justify-between pb-28 font-sans text-[#1C1208]">
      {/* Nav Bar */}
      <div className="w-full max-w-[390px] h-14 flex items-center justify-between px-4 bg-transparent mt-2">
        <button
          onClick={() => router.push("/owner")}
          className="w-10 h-10 rounded-full bg-white border border-[#D5D9C9] flex items-center justify-center text-[#1C1208] hover:bg-[#F2ECE1] transition-all"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="text-center">
          <h1 className="text-[17px] font-bold text-[#2D5016] font-heading leading-tight">
            Add New Tool
          </h1>
          <p className="text-[9px] font-bold text-[#D4A017] uppercase tracking-wider mt-0.5">
            O~Bele Listings
          </p>
        </div>

        <button
          onClick={() => alert("Provide details of your equipment. It will be immediately made available for farmers to rent.")}
          className="w-10 h-10 rounded-full bg-white border border-[#D5D9C9] flex items-center justify-center text-[#1C1208] hover:bg-[#F2ECE1] transition-all"
        >
          <HelpCircle className="h-5 w-5" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[390px] px-4 flex-1 flex flex-col"
      >
        <form onSubmit={handleSubmit} className="space-y-5 my-5 flex-1">
          {/* Photo upload block */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-[12px] font-bold text-[#5C4A37]">
              <span>Tool Photos *</span>
              <span className="text-[10px] text-[#8B4513]">Camera or Gallery</span>
            </div>

            {/* Hidden native camera/file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />
            
            <div className="flex gap-2.5 items-center">
              {/* Native Camera Add Photo Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="w-[100px] h-[100px] rounded-2xl bg-white border border-dashed border-[#D5D9C9] flex flex-col items-center justify-center gap-1 hover:bg-[#F2ECE1] transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <Loader2 className="h-6 w-6 text-[#2D5016] animate-spin" />
                ) : (
                  <Camera className="h-6 w-6 text-[#2D5016]" />
                )}
                <span className="text-[10px] font-bold text-[#5C4A37]">
                  {uploadingPhoto ? "Compressing..." : "Snap / Upload"}
                </span>
              </button>
              
              {/* Photo Preview block */}
              {photoPreview ? (
                <div className="w-[100px] h-[100px] rounded-2xl border border-[#2D5016] relative overflow-hidden flex items-center justify-center bg-black/5 shadow-2xs">
                  <img
                    src={photoPreview}
                    alt="Tool Preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition"
                    title="Remove Photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute bottom-0 inset-x-0 bg-[#2D5016]/80 text-white text-[8px] font-bold py-0.5 text-center">
                    Captured
                  </div>
                </div>
              ) : (
                <div className="w-[100px] h-[100px] rounded-2xl bg-[#E8F0D5]/50 border border-dashed border-[#D5D9C9] flex flex-col items-center justify-center opacity-60">
                  <ImageIcon className="h-6 w-6 text-[#5C4A37]" />
                  <span className="text-[8px] text-[#5C4A37] mt-0.5">Preview</span>
                </div>
              )}
            </div>

            {/* Optional URL input for E2E validation / manual override */}
            <input
              type="text"
              placeholder="Or paste image URL (Optional)"
              className="w-full text-xs font-semibold bg-white border border-[#D5D9C9] rounded-xl px-3.5 py-2.5 outline-none focus:border-[#2D5016] focus:ring-1 focus:ring-[#2D5016] transition-all"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value)
                setPhotoPreview(e.target.value || null)
              }}
            />
          </div>

          {/* Tool Name */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-[#5C4A37] block">
              Tool Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. 12m Carbon Fiber Pole, Power Tiller 12HP"
              className="w-full text-[13px] font-semibold bg-white border border-[#D5D9C9] rounded-xl px-4 py-3 outline-none focus:border-[#2D5016] focus:ring-1 focus:ring-[#2D5016] transition-all text-[#1E2A12]"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-[#5C4A37] block">
              Category *
            </label>
            <div className="relative">
              <select
                className="w-full text-[13px] font-semibold bg-white border border-[#D5D9C9] rounded-xl px-4 py-3 outline-none appearance-none focus:border-[#2D5016] focus:ring-1 focus:ring-[#2D5016] transition-all text-[#1E2A12]"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Condition Grade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[12px] font-bold text-[#5C4A37]">
                Equipment Condition *
              </label>
              <span className="text-[10px] text-[#2D5016] font-bold">
                Inspected by Admin
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { grade: "EXCELLENT", label: "Excellent", desc: "Like new, <1 yr" },
                { grade: "GOOD", label: "Good", desc: "Well maintained" },
                { grade: "FAIR", label: "Fair", desc: "Working, older" },
              ].map((item) => (
                <button
                  type="button"
                  key={item.grade}
                  onClick={() => setConditionGrade(item.grade)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    conditionGrade === item.grade
                      ? "bg-[#E8F0D5] border-[#2D5016] text-[#2D5016]"
                      : "bg-white border-[#D5D9C9] text-[#5C4A37] hover:border-[#8B4513]/40"
                  }`}
                >
                  <p className="text-[12px] font-bold">{item.label}</p>
                  <p className="text-[9px] opacity-75">{item.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Daily Rate & Security Deposit Grid */}
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              {/* Daily Rental Rate */}
              <div className="space-y-2">
                <label className="text-[12px] font-bold text-[#5C4A37] block">
                  Your Daily Rate *
                </label>
                <div className="flex items-center bg-white border border-[#D5D9C9] rounded-xl px-3 py-3 focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016] transition-all">
                  <span className="text-[15px] font-bold text-[#2D5016] mr-1.5">₹</span>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 500"
                    min="100"
                    max="15000"
                    className="bg-transparent border-0 outline-none p-0 text-[13px] font-semibold text-[#1E2A12] w-full focus:ring-0 focus:outline-none"
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                  />
                  <span className="text-[11px] font-bold text-[#5C4A37] ml-1">/day</span>
                </div>
              </div>

              {/* Security Deposit */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[12px] font-bold text-[#5C4A37]">
                    Security Deposit
                  </label>
                  <span className="bg-[#E8F0D5] text-[#2D5016] text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded leading-none">
                    Refundable
                  </span>
                </div>
                <div className="flex items-center bg-white border border-[#D5D9C9] rounded-xl px-3 py-3 focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016] transition-all">
                  <span className="text-[15px] font-bold text-[#2D5016] mr-1.5">₹</span>
                  <input
                    type="number"
                    placeholder="e.g. 1000"
                    className="bg-transparent border-0 outline-none p-0 text-[13px] font-semibold text-[#1E2A12] w-full focus:ring-0 focus:outline-none"
                    value={deposit}
                    onChange={(e) => setDeposit(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <p className="text-[10px] text-[#5C4A37]/80">
              💡 Platform guardrails: ₹100 – ₹15,000/day. You decide your rate; admin reviews quality before activating.
            </p>
          </div>

          {/* Operator Settings Block */}
          <div className="bg-white border border-[#D5D9C9] rounded-2xl p-4 space-y-4 shadow-[0_2px_8px_rgba(20,54,38,0.02)]">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[12px] font-bold text-[#1E2A12]">
                  Requires Certified Operator?
                </h4>
                <p className="text-[10px] text-[#5C4A37] mt-0.5">
                  Platform dispatches verified operators automatically to farmers
                </p>
              </div>
              
              {/* Custom Toggle Switch */}
              <button
                type="button"
                onClick={() => setRequiresOperator(!requiresOperator)}
                className={`relative h-[26px] w-[46px] rounded-full transition-colors ${
                  requiresOperator ? "bg-[#2D5016]" : "bg-[#C9BFB3]"
                }`}
              >
                <span
                  className={`absolute top-[3px] block h-5 w-5 rounded-full bg-white shadow-[0_1px_4px_rgba(0,0,0,0.15)] transition-all ${
                    requiresOperator ? "left-[23px]" : "left-[3px]"
                  }`}
                />
              </button>
            </div>

            {requiresOperator && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="pt-4 border-t border-[#F2ECE1] space-y-2"
              >
                <label className="text-[11px] font-bold text-[#5C4A37] block">
                  Operator Daily Fee *
                </label>
                <div className="flex items-center bg-[#FAF7F0] border border-[#D5D9C9] rounded-xl px-3 py-2.5 focus-within:border-[#2D5016] focus-within:ring-1 focus-within:ring-[#2D5016] transition-all">
                  <span className="text-[13px] font-bold text-[#8B4513] mr-1.5">₹</span>
                  <input
                    type="number"
                    required={requiresOperator}
                    placeholder="e.g. 500"
                    className="bg-transparent border-0 outline-none p-0 text-[13px] font-semibold text-[#1E2A12] w-full focus:ring-0 focus:outline-none"
                    value={operatorFee}
                    onChange={(e) => setOperatorFee(e.target.value)}
                  />
                  <span className="text-[10px] font-bold text-[#5C4A37] ml-1">/day</span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Brief Description */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-[#5C4A37] block">
              Brief Description *
            </label>
            <textarea
              required
              rows={4}
              placeholder="Describe tool model, age, working condition, attachments included..."
              className="w-full text-[13px] font-semibold bg-white border border-[#D5D9C9] rounded-xl px-4 py-3 outline-none focus:border-[#2D5016] focus:ring-1 focus:ring-[#2D5016] transition-all text-[#1E2A12] resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Quantity owned counter */}
          <div className="space-y-2">
            <label className="text-[12px] font-bold text-[#5C4A37] block">
              Quantity / Instances Owned
            </label>
            <div className="flex items-center justify-between bg-white border border-[#D5D9C9] rounded-xl px-4 py-3">
              <span className="text-[13px] font-bold text-[#1E2A12]">
                {quantity} Unit{quantity > 1 ? "s" : ""}
              </span>
              
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDecrement}
                  disabled={quantity <= 1}
                  className="w-8 h-8 rounded-lg border border-[#D5D9C9] flex items-center justify-center hover:bg-[#FAF7F0] disabled:opacity-30 transition-all text-[#1C1208]"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleIncrement}
                  className="w-8 h-8 rounded-lg border border-[#D5D9C9] flex items-center justify-center hover:bg-[#FAF7F0] transition-all text-[#1C1208]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-[#C0392B] font-bold text-center pt-2"
            >
              {error}
            </motion.p>
          )}
        </form>
      </motion.div>

      {/* Sticky Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#FAF7F0] border-t border-[#F2ECE1] py-4 px-4 flex justify-center z-20">
        <Button
          onClick={handleSubmit}
          className="w-full max-w-[350px] bg-[#2D5016] hover:bg-[#1E3A0F] text-white font-bold h-14 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_4px_12px_rgba(45,80,22,0.25)] active:scale-[0.98]"
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          ) : (
            <>
              <Check className="h-5 w-5 stroke-[2.5]" />
              <span className="text-[15px] tracking-wide">List My Tool</span>
            </>
          )}
        </Button>
      </div>

      {/* One-Time Phone Completion Prompt for Tool Listings */}
      <PhoneCompletionModal
        isOpen={showPhoneModal}
        onClose={() => setShowPhoneModal(false)}
        onSuccess={() => {
          setShowPhoneModal(false)
          executeSubmit()
        }}
        canDismiss
      />
    </div>
  )
}
