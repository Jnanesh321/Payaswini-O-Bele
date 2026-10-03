import { useState, memo } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Award, Star, Plus, Minus, UserCheck, ChevronDown, ChevronUp, Sparkles, ShieldCheck } from "lucide-react";
import type { ToolCard as ToolCardType, OwnerOffer } from "@/types";
import { BookingBottomSheet } from "./booking-bottom-sheet";
import { resolveToolImage } from "@/lib/tool-images";

export interface ToolCardProps {
  id?: string;
  slug?: string;
  title?: string;
  imageUrl?: string | null;
  ownerName?: string;
  ownerVerified?: boolean;
  taluk?: string;
  distanceKm?: number;
  dailyRate?: number;
  deposit?: number;
  allowsSelfOperate?: boolean;
  requiresCertifiedOperator?: boolean;
  onBook?: (tool?: ToolCardType) => void;
  tool?: ToolCardType;
  index?: number;
  variant?: "default" | "utility";
  name?: string;
  pricePerDay?: number;
  minPrice?: number;
  maxPrice?: number;
  images?: string[];
  thumbnailUrl?: string | null;
  translations?: Record<string, { name?: string; description?: string }> | null;
  canSelfOperate?: boolean;
  ownerOffers?: OwnerOffer[];
}

export const ToolCard = memo(function ToolCard({
  id = "",
  slug = "",
  title,
  imageUrl,
  ownerName = "Verified Owner",
  ownerVerified = true,
  taluk = "Kasaragod",
  distanceKm = 3.2,
  dailyRate,
  deposit = 1000,
  allowsSelfOperate = true,
  requiresCertifiedOperator = false,
  onBook,
  tool,
  index = 0,
  name,
  pricePerDay,
  images,
  thumbnailUrl,
  ownerOffers,
}: ToolCardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isOwnersExpanded, setIsOwnersExpanded] = useState(false);
  const [selectedOwner, setSelectedOwner] = useState<OwnerOffer | null>(null);

  const finalId = id || tool?.id || "";
  const finalSlug = slug || tool?.slug || finalId;
  const finalTitle = title || name || tool?.name || "Agricultural Tool";
  const rawImage =
    imageUrl ||
    (images && images[0]) ||
    (tool?.images && tool.images[0]) ||
    thumbnailUrl ||
    tool?.thumbnailUrl;

  const finalImage = resolveToolImage(
    rawImage,
    tool?.category,
    finalTitle
  );

  const offers: OwnerOffer[] = ownerOffers || tool?.ownerOffers || [];
  const hasMultipleOwners = offers.length > 0;

  const finalOwnerName =
    selectedOwner?.ownerName || ownerName || tool?.owner?.name || "Verified Owner";
  const finalOwnerVerified = ownerVerified ?? tool?.owner?.isVerified ?? true;
  const finalTaluk = selectedOwner?.taluk || taluk || tool?.taluk || "Kasaragod";
  const finalDistance =
    distanceKm ?? tool?.distanceKm ?? Number((3.2 + ((index * 1.7) % 7)).toFixed(1));

  // Determine pricing based on selected owner or tool rate
  const rawRate =
    selectedOwner?.pricePerDay !== undefined
      ? selectedOwner.pricePerDay
      : dailyRate !== undefined
      ? dailyRate
      : pricePerDay
        ? pricePerDay >= 1000
          ? Math.round(pricePerDay / 100)
          : pricePerDay
        : tool?.pricePerDay
          ? tool.pricePerDay >= 1000
            ? Math.round(tool.pricePerDay / 100)
            : tool.pricePerDay
          : 0;

  const finalDailyRate = rawRate > 1000 ? Math.round(rawRate / 100) : rawRate;

  const rawDep =
    selectedOwner?.deposit !== undefined
      ? selectedOwner.deposit
      : deposit !== undefined
      ? deposit
      : tool?.deposit || 1000;
  const finalDeposit = rawDep > 10000 ? Math.round(rawDep / 100) : rawDep;

  const finalRequiresCert = requiresCertifiedOperator ?? tool?.requiresCertifiedOperator ?? false;

  // Dynamic Instamart-style ETA generator based on index & distance
  const etaMinutes = Math.min(60, Math.max(30, Math.round(finalDistance * 12)));
  const isImmediate = index % 2 === 0;

  const toolObj = tool || {
    id: finalId,
    slug: finalSlug,
    name: finalTitle,
    pricePerDay: finalDailyRate * 100,
    deposit: finalDeposit * 100,
    requiresCertifiedOperator: finalRequiresCert,
    taluk: finalTaluk,
    distanceKm: finalDistance,
    images: selectedOwner?.images && selectedOwner.images.length > 0 ? selectedOwner.images : [finalImage],
    canSelfOperate: selectedOwner?.canSelfOperate ?? allowsSelfOperate,
    toolInstanceId: selectedOwner?.instanceId,
    toolOwner: selectedOwner ? { id: selectedOwner.ownerId, name: selectedOwner.ownerName } : undefined,
  };

  const halfDayRate = Math.round(finalDailyRate * 0.58);

  const handleBookOwner = (e: React.MouseEvent, offer?: OwnerOffer) => {
    e.preventDefault();
    e.stopPropagation();
    if (offer) {
      setSelectedOwner(offer);
    }
    if (onBook) {
      onBook({
        ...(toolObj as unknown as ToolCardType),
        pricePerDay: (offer ? (offer.pricePerDay > 1000 ? Math.round(offer.pricePerDay / 100) : offer.pricePerDay) : finalDailyRate) * 100,
        deposit: (offer ? (offer.deposit > 10000 ? Math.round(offer.deposit / 100) : offer.deposit) : finalDeposit) * 100,
        owner: offer
          ? { id: offer.ownerId, name: offer.ownerName, isVerified: true }
          : (tool?.owner || { id: "system", name: finalOwnerName, isVerified: finalOwnerVerified }),
      });
    } else {
      setIsSheetOpen(true);
    }
  };

  return (
    <div className="group relative bg-card rounded-2xl p-3.5 border border-border/80 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col gap-3">
      {/* ── Top Hyperlocal Dispatch Banner (Instamart Style) ── */}
      <div className="flex items-center justify-between gap-1.5 text-[10px] font-bold">
        {isImmediate ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>⚡ Dispatches in ~{etaMinutes}m from {finalTaluk}</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2 py-0.5 border border-amber-500/20">
            <span>🚜 Next slot: Tomorrow 6:00 AM</span>
          </span>
        )}

        {/* Krishi Assured Badge */}
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          <Award className="w-3 h-3 text-primary shrink-0" />
          <span>Krishi Assured</span>
        </span>
      </div>

      {/* ── Main Content: Image & Tool Specs ── */}
      <div className="flex gap-3.5 items-start">
        <Link
          href={`/tools/${finalSlug || finalId}`}
          className="relative w-22 h-22 shrink-0 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-border/70 block"
        >
          <Image
            src={finalImage}
            alt={finalTitle}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="88px"
          />
          {finalRequiresCert && (
            <span className="absolute bottom-1 left-1 right-1 bg-black/75 backdrop-blur-xs text-[9px] font-bold text-white text-center py-0.5 rounded-md">
              Operator Incl.
            </span>
          )}
        </Link>

        <div className="flex flex-col flex-1 min-w-0">
          <Link href={`/tools/${finalSlug || finalId}`} className="hover:text-primary transition-colors">
            <h3 className="font-display font-bold text-[15px] leading-snug text-foreground line-clamp-2">
              {finalTitle}
            </h3>
          </Link>

          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span>Owner: <span className="font-medium text-foreground">{finalOwnerName}</span></span>
            {finalOwnerVerified && (
              <span className="text-[10px] text-primary font-bold">✓</span>
            )}
          </div>

          {/* Location & Operator Chips */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
              {finalDistance} km • {finalTaluk}
            </span>

            {finalRequiresCert ? (
              <span className="inline-flex items-center text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-md">
                Certified Operator
              </span>
            ) : (
              <span className="inline-flex items-center text-[10px] font-bold border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-md">
                Self-Operate OK
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Owner Selection Accordion (Zomato Hotel Selection Model) ── */}
      {hasMultipleOwners && (
        <div className="rounded-xl border border-border/70 bg-muted/30 overflow-hidden">
          <button
            type="button"
            onClick={() => setIsOwnersExpanded(!isOwnersExpanded)}
            className="flex w-full items-center justify-between px-3 py-2 text-xs font-bold text-foreground hover:bg-muted/60 transition"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary font-mono text-[10px]">
                {isOwnersExpanded ? "-" : "+"}
              </span>
              <span>
                {isOwnersExpanded
                  ? "Hide Tool Owner Listings"
                  : `Select Owner & Quality (${offers.length} verified listings)`}
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground text-[11px]">
              <span>from ₹{Math.min(...offers.map(o => o.pricePerDay >= 1000 ? Math.round(o.pricePerDay / 100) : o.pricePerDay))}/d</span>
              {isOwnersExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>
          </button>

          {isOwnersExpanded && (
            <div className="border-t border-border/60 divide-y divide-border/60 p-2 space-y-2 bg-card">
              <p className="text-[10px] text-muted-foreground px-1 pt-1">
                Choose the tool owner offering the rate and equipment condition you prefer. Operators are dispatched automatically:
              </p>

              {offers.map((offer) => {
                const offerRate = offer.pricePerDay >= 1000 ? Math.round(offer.pricePerDay / 100) : offer.pricePerDay;
                const isCurrentSelected = selectedOwner?.instanceId === offer.instanceId;

                return (
                  <div
                    key={offer.instanceId}
                    className={`rounded-xl p-2.5 transition flex flex-col gap-2 ${
                      isCurrentSelected
                        ? "bg-primary/5 border border-primary/40 shadow-xs"
                        : "bg-muted/40 hover:bg-muted/80 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">{offer.ownerName}</span>
                          <span className="rounded bg-accent/20 px-1 text-[9px] font-bold text-accent">✓ Verified</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <MapPin size={10} className="text-red-500" />
                          <span>{offer.ownerLocation}</span>
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="font-heading font-extrabold text-sm text-foreground">₹{offerRate}</span>
                        <span className="text-[10px] text-muted-foreground">/day</span>
                      </div>
                    </div>

                    {/* Machine condition & rating details */}
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground bg-background/80 rounded-lg px-2 py-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-primary">Condition: {offer.conditionGrade}</span>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-amber-600 dark:text-amber-400 font-semibold">
                          <Star size={10} className="fill-amber-500 text-amber-500" />
                          {offer.rating.toFixed(1)} ({offer.reviewCount})
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => handleBookOwner(e, offer)}
                        className="rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-[10px] font-bold px-2.5 py-1 transition"
                      >
                        Rent from {offer.ownerName.split(" ")[0]}
                      </button>
                    </div>

                    {offer.notes && (
                      <p className="text-[10px] text-muted-foreground italic px-1">
                        &ldquo;{offer.notes}&rdquo;
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Bottom Row: Shift Rates & 1-Tap Booking CTA ── */}
      <div className="flex items-center justify-between pt-2.5 border-t border-border/70 mt-0.5">
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-extrabold text-foreground">
              ₹{finalDailyRate.toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">/full day</span>
            <span className="text-[10px] text-muted-foreground/80 font-normal">
              (₹{halfDayRate}/shift)
            </span>
          </div>
          <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <span>✓</span>
            <span>Zero Cash Lock • UPI Pre-Auth</span>
          </p>
        </div>

        <button
          type="button"
          onClick={(e) => handleBookOwner(e)}
          className="relative flex items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-4 py-2.5 rounded-xl shadow-xs active:scale-95 transition-all cursor-pointer"
        >
          <span>Book Now</span>
          <span className="text-xs">⚡</span>
        </button>
      </div>

      {!onBook && isSheetOpen && (
        <BookingBottomSheet
          isOpen={isSheetOpen}
          onClose={() => setIsSheetOpen(false)}
          tool={toolObj as unknown as ToolCardType}
        />
      )}
    </div>
  );
});
