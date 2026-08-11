import { useState } from "react";
import { ArrowLeft, ArrowRight, Shield, Check } from "lucide-react";

type Screen = "booking" | "terms" | "payment";

const GREEN = "#263518";
const AMBER = "#C8781A";
const BG = "#F0EDE6";

const TOOL_IMAGE = "https://images.unsplash.com/photo-1606739211185-2c846d734a6d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=200";

function StatusBar({ light = false }: { light?: boolean }) {
  const c = light ? "white" : "#1A1A0F";
  return (
    <div className="flex justify-between items-center px-5 pt-3.5 pb-1 flex-shrink-0">
      <span className="text-[12px] font-semibold" style={{ color: c }}>9:41</span>
      <div className="flex items-center gap-1.5">
        <svg width="17" height="11" viewBox="0 0 17 11" fill="none">
          <rect x="0" y="7" width="3" height="4" rx="0.5" fill={c} />
          <rect x="4.5" y="4.5" width="3" height="6.5" rx="0.5" fill={c} />
          <rect x="9" y="2" width="3" height="9" rx="0.5" fill={c} />
          <rect x="13.5" y="0" width="3" height="11" rx="0.5" fill={c} />
        </svg>
        <svg width="16" height="11" viewBox="0 0 16 11" fill="none">
          <path d="M8 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" fill={c} />
          <path d="M8 5.5c1.7 0 3.2.8 4.2 2L13.4 6.3C12 4.8 10.1 3.9 8 3.9S4 4.8 2.6 6.3L3.8 7.5C4.8 6.3 6.3 5.5 8 5.5z" fill={c} />
          <path d="M8 2.5c2.6 0 4.9 1.1 6.5 2.8L15.7 4.1C13.7 2 10.9.6 8 .6S2.3 2 .3 4.1L1.5 5.3C3.1 3.6 5.4 2.5 8 2.5z" fill={c} />
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.6" y="0.6" width="21" height="10.8" rx="2.2" stroke={c} strokeWidth="1.2" />
          <rect x="2" y="2" width="15" height="8" rx="1.2" fill={c} />
          <path d="M23 4v4" stroke={c} strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

/* ── QR Code (decorative) ─────────────────────────────────────── */
function QRCode() {
  const pattern = [
    1,1,1,1,1,1,1, 0, 1,0,1,0,1, 0, 1,1,1,1,1,1,1,
    1,0,0,0,0,0,1, 0, 0,1,0,1,0, 0, 1,0,0,0,0,0,1,
    1,0,1,1,1,0,1, 0, 1,1,0,0,1, 0, 1,0,1,1,1,0,1,
    1,0,1,1,1,0,1, 0, 0,0,1,1,0, 0, 1,0,1,1,1,0,1,
    1,0,1,1,1,0,1, 0, 1,0,1,0,1, 0, 1,0,1,1,1,0,1,
    1,0,0,0,0,0,1, 0, 0,1,0,1,0, 0, 1,0,0,0,0,0,1,
    1,1,1,1,1,1,1, 0, 1,0,1,0,1, 0, 1,1,1,1,1,1,1,
    0,0,0,0,0,0,0, 0, 0,1,0,1,0, 0, 0,0,0,0,0,0,0,
    1,0,1,1,0,1,1, 0, 1,1,1,0,1, 0, 1,0,1,0,1,1,0,
    0,1,0,0,1,0,0, 0, 0,0,1,0,0, 0, 0,1,0,1,0,0,1,
    1,1,0,1,1,0,1, 0, 1,0,0,1,1, 0, 1,0,1,1,0,1,0,
    0,0,1,0,0,1,0, 0, 1,1,0,0,1, 0, 0,1,0,0,1,0,1,
    1,0,1,0,1,1,0, 0, 0,1,1,0,0, 0, 1,1,0,1,0,1,1,
    0,0,0,0,0,0,0, 0, 1,0,1,0,1, 0, 0,0,1,0,1,0,0,
    1,1,1,1,1,1,1, 0, 0,1,0,0,0, 0, 1,0,1,1,0,0,1,
    1,0,0,0,0,0,1, 0, 1,1,1,0,1, 0, 0,1,0,0,1,0,0,
    1,0,1,1,1,0,1, 0, 0,0,0,1,0, 0, 1,1,0,1,1,1,0,
    1,0,0,0,0,0,1, 0, 1,0,1,1,0, 0, 0,0,1,0,0,0,1,
    1,1,1,1,1,1,1, 0, 0,1,0,0,1, 0, 1,0,0,1,0,1,1,
  ];
  const cols = 21;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "1px", width: 112, height: 112 }}>
      {pattern.map((cell, i) => (
        <div key={i} style={{ backgroundColor: cell ? "#1a1a0f" : "transparent", borderRadius: 1 }} />
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SCREEN 1 — Operator Selection
════════════════════════════════════════════════════════ */
function BookingScreen({ onNext }: { onNext: () => void }) {
  const [mode, setMode] = useState<"self" | "send">("send");
  const total = mode === "send" ? "2,850" : "1,800";

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG }}>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <button className="w-8 h-8 rounded-full bg-white border border-black/10 flex items-center justify-center shadow-sm">
          <ArrowLeft size={14} color="#1a1a0f" />
        </button>
        <div className="flex items-center gap-1.5">
          <span style={{ fontSize: 13, color: AMBER }}>🌿</span>
          <span className="font-semibold text-sm" style={{ fontFamily: "Playfair Display, serif", color: GREEN }}>O~Bele</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ borderColor: AMBER, color: AMBER }}>
          DK COAST
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
        {/* Tool Card */}
        <div className="bg-white rounded-2xl p-3 flex items-center gap-3 shadow-sm">
          <img
            src={TOOL_IMAGE}
            alt="Brush Cutter"
            className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-[#1a1a0f]">Brush Cutter</div>
            <div className="flex items-center gap-1 mt-0.5">
              <span style={{ fontSize: 11 }}>📅</span>
              <span className="text-[11px] text-gray-500">
                Aug 14 – Aug 16{" "}
                <span className="font-semibold text-[#1a1a0f]">(3 days)</span>
              </span>
            </div>
          </div>
          <div className="text-[12px] font-semibold flex-shrink-0" style={{ color: GREEN }}>₹600/day</div>
        </div>

        {/* Operator Section */}
        <div>
          <div className="flex items-center gap-1.5 mb-2.5">
            <span style={{ fontSize: 13 }}>👤</span>
            <span className="font-semibold text-sm text-[#1a1a0f]">Operator</span>
          </div>

          {/* Self */}
          <div
            className="bg-white rounded-2xl p-3.5 flex items-center gap-3 mb-2 cursor-pointer border-2 transition-all"
            style={{ borderColor: mode === "self" ? AMBER : "transparent" }}
            onClick={() => setMode("self")}
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
              style={{ borderColor: mode === "self" ? AMBER : "#ccc" }}
            >
              {mode === "self" && <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: AMBER }} />}
            </div>
            <div>
              <div className="font-semibold text-sm text-[#1a1a0f]">I'll operate it myself</div>
              <div className="text-[11px] text-gray-400 mt-0.5">Requires owner permission & experience</div>
            </div>
          </div>

          {/* Send */}
          <div
            className="rounded-2xl p-3.5 flex items-center gap-3 cursor-pointer transition-all"
            style={{ backgroundColor: mode === "send" ? GREEN : "white" }}
            onClick={() => setMode("send")}
          >
            <div
              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0"
              style={{ borderColor: mode === "send" ? "white" : "#ccc" }}
            >
              {mode === "send" && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm" style={{ color: mode === "send" ? "white" : "#1a1a0f" }}>
                Send an operator
              </div>
              <div className="text-[11px] mt-0.5" style={{ color: mode === "send" ? "rgba(255,255,255,0.65)" : "#9a9a9a" }}>
                + ₹350/day operator charge
              </div>
            </div>
            {mode === "send" && (
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: AMBER, color: "white" }}>
                RECOMMENDED
              </span>
            )}
          </div>
        </div>

        {/* Price Estimate */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="font-semibold text-sm text-[#1a1a0f]">Price Estimate</span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#FFF3E0", color: AMBER }}>
              NO DEPOSIT REQUIRED
            </span>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-[13px] text-[#1a1a0f]">Brush Cutter · 3 days</div>
                <div className="text-[11px] text-gray-400">₹600/day × 3</div>
              </div>
              <span className="text-[13px] font-medium text-[#1a1a0f]">₹1,800</span>
            </div>
            {mode === "send" && (
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[13px] text-[#1a1a0f]">Operator · 3 days</div>
                  <div className="text-[11px] text-gray-400">₹350/day × 3</div>
                </div>
                <span className="text-[13px] font-medium text-[#1a1a0f]">₹1,050</span>
              </div>
            )}
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-center">
            <span className="font-semibold text-sm text-[#1a1a0f]">Total Price</span>
            <span className="text-xl font-bold" style={{ fontFamily: "Playfair Display, serif", color: GREEN }}>
              ₹{total}
            </span>
          </div>
        </div>

        {/* Cancel note */}
        <div className="flex items-center gap-1.5 justify-center pb-1">
          <Shield size={12} className="text-gray-400" />
          <span className="text-[11px] text-gray-400">Cancel free up to 24 hrs before dispatch</span>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-5 pt-2 flex-shrink-0">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl font-semibold text-white flex items-center justify-center gap-2 active:opacity-80 transition-opacity"
          style={{ backgroundColor: GREEN, fontSize: 15 }}
        >
          Continue to confirm <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SCREEN 2 — Terms Acceptance
════════════════════════════════════════════════════════ */
function TermsScreen({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const rules = [
    "Tools must be returned in the condition you received them",
    "Cancellations are free up to 24 hours before your booking",
    "You're responsible for safe use — follow the operator's guidance",
    "Late returns may incur a small daily fee",
    "Damage beyond normal wear is your responsibility",
  ];

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG }}>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 flex-shrink-0">
        <button onClick={onBack} className="text-[#1a1a0f]">
          <ArrowLeft size={18} />
        </button>
        <span className="font-semibold text-base" style={{ fontFamily: "Playfair Display, serif", color: GREEN }}>
          O~Bele
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-4">
        {/* Heading */}
        <div className="space-y-1.5">
          <h1
            className="text-[30px] font-bold leading-tight"
            style={{ fontFamily: "Playfair Display, serif", color: "#1a1a0f" }}
          >
            Before you book
          </h1>
          <p className="text-[13px] text-gray-500 leading-relaxed">
            Here's what we agree to when renting tools through O~Bele. Plain and simple.
          </p>
        </div>

        {/* Rules Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span style={{ fontSize: 16 }}>🚜</span>
            <span className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">
              Rental Ground Rules
            </span>
          </div>
          <div className="space-y-4">
            {rules.map((rule, i) => (
              <div key={i} className="flex gap-3 items-start">
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: AMBER }}
                />
                <p className="text-[13px] text-gray-700 leading-snug">{rule}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Link */}
        <div className="text-center pb-2">
          <button className="text-[13px] font-medium underline underline-offset-2" style={{ color: "#8B6914" }}>
            Read full terms & conditions →
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="px-4 pb-5 pt-2 flex-shrink-0">
        <button
          onClick={onNext}
          className="w-full py-4 rounded-2xl font-semibold text-white active:opacity-80 transition-opacity"
          style={{ backgroundColor: GREEN, fontSize: 15 }}
        >
          I Accept & Continue
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   SCREEN 3 — Collect Payment
════════════════════════════════════════════════════════ */
function PaymentScreen({ onBack }: { onBack: () => void }) {
  const [paid, setPaid] = useState(false);

  return (
    <div className="flex flex-col h-full" style={{ backgroundColor: BG }}>
      <StatusBar />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0">
        <span className="text-xl font-bold" style={{ fontFamily: "Playfair Display, serif", color: GREEN }}>
          O~Bele
        </span>
        <span
          className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1"
          style={{ backgroundColor: "#E8F5E9", color: "#2E7D32" }}
        >
          <Check size={9} strokeWidth={3} /> JOB COMPLETED
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-3 space-y-3">
        {/* Heading */}
        <div className="space-y-1">
          <h1
            className="text-[30px] font-bold leading-tight"
            style={{ fontFamily: "Playfair Display, serif", color: "#1a1a0f" }}
          >
            Work Completed!
          </h1>
          <p className="text-[13px] text-gray-500">
            Present this bill to the farmer to collect your earnings.
          </p>
        </div>

        {/* Bill Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
          {/* Customer */}
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0"
              style={{ backgroundColor: GREEN }}
            >
              S
            </div>
            <div>
              <div className="font-semibold text-[13px] text-[#1a1a0f]">Siddappa Gowda</div>
              <div className="text-[11px] text-gray-400">Dakshina Kannada · ID: 08-8830</div>
            </div>
          </div>

          <div className="border-t border-gray-100" />

          {/* Tool row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 13 }}>🔧</span>
              <span className="text-[13px] font-medium text-[#1a1a0f]">Brush Cutter Rental</span>
            </div>
            <span className="text-[11px] text-gray-400">3 Days (Aug 14-16)</span>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Operator Service Charge</span>
              <span className="text-[#1a1a0f]">₹1,050</span>
            </div>
            <div className="flex justify-between text-[13px]">
              <span className="text-gray-500">Equipment Rental Fee</span>
              <span className="text-[#1a1a0f]">₹1,800</span>
            </div>
          </div>

          {/* Dotted divider */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 border-t border-dashed border-gray-200" />
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: AMBER }} />
            <div className="flex-1 border-t border-dashed border-gray-200" />
          </div>

          {/* Total */}
          <div className="flex justify-between items-center">
            <span className="font-semibold text-[13px] text-[#1a1a0f]">Total Amount Due</span>
            <span
              className="text-2xl font-bold"
              style={{ fontFamily: "Playfair Display, serif", color: GREEN }}
            >
              ₹2,850
            </span>
          </div>
        </div>

        {/* UPI Card */}
        <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
          <div className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">
            Scan to pay via UPI
          </div>
          <div className="flex justify-center mb-3">
            <div className="p-2.5 border border-gray-100 rounded-xl inline-block">
              <QRCode />
            </div>
          </div>
          <div className="font-semibold text-sm text-[#1a1a0f]">obele@upi</div>
          <div className="text-[9px] font-bold tracking-widest text-gray-400 mt-0.5 uppercase">
            Secured by O~Bele Pay
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="px-4 pb-5 pt-2 space-y-2.5 flex-shrink-0">
        <button
          onClick={() => setPaid(true)}
          className="w-full py-4 rounded-2xl font-semibold text-white active:opacity-80 transition-all"
          style={{ backgroundColor: paid ? "#3A7D44" : GREEN, fontSize: 15 }}
        >
          Payment Received ✓
        </button>
        <button className="w-full text-[13px] font-medium underline underline-offset-2" style={{ color: "#8B6914" }}>
          Payment Pending — Follow Up Later
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ROOT
════════════════════════════════════════════════════════ */
export default function App() {
  const [screen, setScreen] = useState<Screen>("booking");

  const screens: Screen[] = ["booking", "terms", "payment"];
  const labels = ["Operator Selection", "Terms", "Payment"];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6 py-8"
      style={{ backgroundColor: "#D9D5CC", fontFamily: "Inter, sans-serif" }}
    >
      {/* Step labels */}
      <div className="flex items-center gap-2">
        {screens.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <button
              onClick={() => setScreen(s)}
              className="flex items-center gap-1.5 transition-all"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                style={{
                  backgroundColor: screen === s ? GREEN : screen === screens[i + 1] || screens.indexOf(screen) > i ? AMBER : "#ccc",
                  color: "white",
                }}
              >
                {screens.indexOf(screen) > i ? <Check size={10} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className="text-[11px] font-medium hidden sm:block transition-all"
                style={{ color: screen === s ? GREEN : "#888" }}
              >
                {labels[i]}
              </span>
            </button>
            {i < screens.length - 1 && (
              <div className="w-6 h-px" style={{ backgroundColor: screens.indexOf(screen) > i ? AMBER : "#ccc" }} />
            )}
          </div>
        ))}
      </div>

      {/* Phone shell */}
      <div
        className="relative shadow-2xl overflow-hidden"
        style={{
          width: 375,
          height: 780,
          borderRadius: 44,
          border: "10px solid #1a1a0f",
          backgroundColor: BG,
        }}
      >
        <div className="w-full h-full overflow-hidden relative">
          {screen === "booking" && (
            <BookingScreen onNext={() => setScreen("terms")} />
          )}
          {screen === "terms" && (
            <TermsScreen
              onNext={() => setScreen("payment")}
              onBack={() => setScreen("booking")}
            />
          )}
          {screen === "payment" && (
            <PaymentScreen onBack={() => setScreen("terms")} />
          )}
        </div>

        {/* Home indicator */}
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full"
          style={{ width: 100, height: 4, backgroundColor: "rgba(26,26,15,0.25)" }}
        />
      </div>

      <p className="text-[11px]" style={{ color: "#888" }}>
        Tap the step numbers above to navigate between screens
      </p>
    </div>
  );
}
