/**
 * Shared Geospatial & Dispatch Eligibility Engine
 *
 * Provides:
 * 1. Configured regional dispatch hubs (Kasaragod & Dakshina Kannada pilot taluks)
 * 2. Pure Haversine distance calculation (zero dependencies)
 * 3. Safe farm-gate GPS coordinate parsing from text/payloads
 * 4. Dispatch origin resolution from registered tool owner taluk
 * 5. Authoritative server-side dispatch eligibility validation
 */

export interface TalukOption {
  id: string
  name: string
  nameKn: string
  district: "Kasaragod" | "Dakshina Kannada"
  distanceApprox?: string
  lat: number
  lng: number
}

export interface UserCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp?: number
}

/**
 * 9 Regional Taluks covering the pilot corridor across
 * Kasaragod District (Kerala) and Dakshina Kannada District (Karnataka).
 * Each taluk center serves as the registered dispatch-origin / service-hub coordinate.
 */
export const REGIONAL_TALUKS: TalukOption[] = [
  // Kasaragod District (Kerala)
  {
    id: "kumble",
    name: "Kumble / Kalathur",
    nameKn: "ಕುಂಬಳೆ / ಕಾಳತ್ತೂರು",
    district: "Kasaragod",
    distanceApprox: "Primary Hub",
    lat: 12.5937,
    lng: 74.9458,
  },
  {
    id: "manjeshwar",
    name: "Manjeshwar",
    nameKn: "ಮಂಜೇಶ್ವರ",
    district: "Kasaragod",
    distanceApprox: "8-12 km",
    lat: 12.7153,
    lng: 74.8872,
  },
  {
    id: "kasaragod_town",
    name: "Kasaragod Town",
    nameKn: "ಕಾಸರಗೋಡು ನಗರ",
    district: "Kasaragod",
    distanceApprox: "10-14 km",
    lat: 12.4996,
    lng: 74.9869,
  },
  {
    id: "badiadka",
    name: "Badiadka",
    nameKn: "ಬದಿಯಡ್ಕ",
    district: "Kasaragod",
    distanceApprox: "12-16 km",
    lat: 12.5843,
    lng: 75.0536,
  },

  // Dakshina Kannada District (Karnataka)
  {
    id: "puttur",
    name: "Puttur",
    nameKn: "ಪುತ್ತೂರು",
    district: "Dakshina Kannada",
    distanceApprox: "45-50 km",
    lat: 12.7687,
    lng: 75.2071,
  },
  {
    id: "sullia",
    name: "Sullia",
    nameKn: "ಸುಳ್ಯ",
    district: "Dakshina Kannada",
    distanceApprox: "55-60 km",
    lat: 12.5606,
    lng: 75.3908,
  },
  {
    id: "bantwal",
    name: "Bantwal",
    nameKn: "ಬಂಟ್ವಾಳ",
    district: "Dakshina Kannada",
    distanceApprox: "40-45 km",
    lat: 12.8943,
    lng: 75.0345,
  },
  {
    id: "belthangady",
    name: "Belthangady",
    nameKn: "ಬೆಳ್ತಂಗಡಿ",
    district: "Dakshina Kannada",
    distanceApprox: "60-65 km",
    lat: 12.9991,
    lng: 75.2635,
  },
  {
    id: "mangaluru",
    name: "Mangaluru Rural",
    nameKn: "ಮಂಗಳೂರು ಗ್ರಾಮಾಂತರ",
    district: "Dakshina Kannada",
    distanceApprox: "35-40 km",
    lat: 12.9141,
    lng: 74.856,
  },
]

/**
 * Standard Haversine distance formula in kilometers.
 * Computes great-circle distance between two points on Earth.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

/**
 * Finds the nearest regional hub from given coordinates.
 */
export function findNearestRegionalHub(
  coords: { latitude: number; longitude: number }
): { hub: TalukOption; distanceKm: number } {
  let nearest = REGIONAL_TALUKS[0]
  let minDistance = Infinity

  for (const taluk of REGIONAL_TALUKS) {
    if (!taluk.lat || !taluk.lng) continue
    const dist = calculateDistanceKm(coords.latitude, coords.longitude, taluk.lat, taluk.lng)
    if (dist < minDistance) {
      minDistance = dist
      nearest = taluk
    }
  }

  return {
    hub: nearest,
    distanceKm: minDistance === Infinity ? 0 : minDistance,
  }
}

/**
 * Resolves an owner's registered taluk/village string to the pilot dispatch-origin / service-hub.
 * Returns null if the taluk cannot be resolved to any configured pilot hub.
 */
export function resolveRegisteredDispatchHub(
  talukName: string | null | undefined
): TalukOption | null {
  if (!talukName || typeof talukName !== "string") return null
  const cleaned = talukName.trim().toLowerCase()
  if (!cleaned) return null

  // Direct ID or name match
  const exact = REGIONAL_TALUKS.find(
    (t) =>
      t.id.toLowerCase() === cleaned ||
      t.name.toLowerCase() === cleaned ||
      t.nameKn === talukName.trim()
  )
  if (exact) return exact

  // Regional synonym / alias mapping
  if (cleaned.includes("kumble") || cleaned.includes("kalathur")) {
    return REGIONAL_TALUKS.find((t) => t.id === "kumble") ?? null
  }
  if (cleaned.includes("manjeshwar")) {
    return REGIONAL_TALUKS.find((t) => t.id === "manjeshwar") ?? null
  }
  if (cleaned.includes("badiadka")) {
    return REGIONAL_TALUKS.find((t) => t.id === "badiadka") ?? null
  }
  if (cleaned.includes("kasaragod")) {
    return REGIONAL_TALUKS.find((t) => t.id === "kasaragod_town") ?? null
  }
  if (cleaned.includes("puttur")) {
    return REGIONAL_TALUKS.find((t) => t.id === "puttur") ?? null
  }
  if (cleaned.includes("sullia") || cleaned.includes("sulya")) {
    return REGIONAL_TALUKS.find((t) => t.id === "sullia") ?? null
  }
  if (cleaned.includes("bantwal") || cleaned.includes("banthwal")) {
    return REGIONAL_TALUKS.find((t) => t.id === "bantwal") ?? null
  }
  if (cleaned.includes("belthangady") || cleaned.includes("beltangadi") || cleaned.includes("ujire")) {
    return REGIONAL_TALUKS.find((t) => t.id === "belthangady") ?? null
  }
  if (cleaned.includes("mangaluru") || cleaned.includes("mangalore")) {
    return REGIONAL_TALUKS.find((t) => t.id === "mangaluru") ?? null
  }

  return null
}

/**
 * Safely parses and validates farm-gate GPS coordinates from:
 * 1. String: "Farm GPS: 12.59370, 74.94580 (Hub notes)"
 * 2. String: "12.59370, 74.94580"
 * 3. Object: { latitude: number, longitude: number } or { lat: number, lng: number }
 *
 * Validates:
 * - Latitude must be between -90 and +90
 * - Longitude must be between -180 and +180
 *
 * Returns { latitude, longitude } or null if invalid/missing.
 */
export function parseFarmGateCoordinates(
  input: unknown
): { latitude: number; longitude: number } | null {
  if (!input) return null

  // Case 1: Object payload
  if (typeof input === "object" && input !== null) {
    const obj = input as Record<string, unknown>
    const lat = typeof obj.latitude === "number" ? obj.latitude : typeof obj.lat === "number" ? obj.lat : undefined
    const lng = typeof obj.longitude === "number" ? obj.longitude : typeof obj.lng === "number" ? obj.lng : undefined

    if (lat !== undefined && lng !== undefined && isValidCoordinates(lat, lng)) {
      return { latitude: Number(lat.toFixed(5)), longitude: Number(lng.toFixed(5)) }
    }
  }

  // Case 2: String payload
  if (typeof input === "string") {
    // Regex matches "Farm GPS: 12.3456, 74.5678" or "12.3456, 74.5678" or "12.3456,74.5678"
    const match = input.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/)
    if (match) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])
      if (isValidCoordinates(lat, lng)) {
        return { latitude: Number(lat.toFixed(5)), longitude: Number(lng.toFixed(5)) }
      }
    }
  }

  return null
}

function isValidCoordinates(lat: number, lng: number): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90) return false
  if (lng < -180 || lng > 180) return false
  return true
}

export class DispatchEligibilityError extends Error {
  readonly statusCode: number
  constructor(message: string, statusCode: number = 400) {
    super(message)
    this.name = "DispatchEligibilityError"
    this.statusCode = statusCode
  }
}

export interface DispatchEligibilityValidationParams {
  toolId: string
  toolName: string
  deliveryRadiusKm: number
  deliveryType: string
  deliveryAddress?: unknown
  ownerTaluk?: string | null
}

export interface DispatchEligibilityResult {
  eligible: boolean
  isPickup: boolean
  distanceKm: number
  dispatchOriginHub?: TalukOption
  farmCoordinates?: { latitude: number; longitude: number }
}

/**
 * Server-authoritative validation for tool dispatch eligibility.
 *
 * Rules:
 * - If pickup: bypass delivery-radius check.
 * - If delivery:
 *   1. Requires valid farm-gate GPS coordinates.
 *   2. Resolves tool owner's registered taluk to a configured pilot dispatch-origin hub.
 *   3. Computes Haversine distance between origin and farm gate.
 *   4. Ensures distance <= tool.deliveryRadiusKm.
 *   5. Throws DispatchEligibilityError(message, 400) on any violation.
 */
export function validateDispatchEligibility(
  params: DispatchEligibilityValidationParams
): DispatchEligibilityResult {
  const { toolName, deliveryRadiusKm, deliveryType, deliveryAddress, ownerTaluk } = params

  const isPickup =
    typeof deliveryType === "string" && deliveryType.trim().toLowerCase() === "pickup"

  if (isPickup) {
    return {
      eligible: true,
      isPickup: true,
      distanceKm: 0,
    }
  }

  // Delivery requested: farm coordinates are mandatory
  const farmCoords = parseFarmGateCoordinates(deliveryAddress)
  if (!farmCoords) {
    throw new DispatchEligibilityError(
      `Delivery for "${toolName}" requires valid farm-gate GPS coordinates. Please pin your farm location on checkout.`,
      400
    )
  }

  // Resolve tool owner's registered taluk
  const hub = resolveRegisteredDispatchHub(ownerTaluk)
  if (!hub) {
    throw new DispatchEligibilityError(
      `Unable to determine dispatch origin: Tool owner registered taluk "${ownerTaluk || "unspecified"}" is not mapped to an active pilot service hub.`,
      400
    )
  }

  // Calculate distance
  const distanceKm = calculateDistanceKm(hub.lat, hub.lng, farmCoords.latitude, farmCoords.longitude)

  // Compare against tool delivery radius
  if (distanceKm > deliveryRadiusKm) {
    throw new DispatchEligibilityError(
      `Requested farm-gate location is ${distanceKm} km from the tool's registered dispatch hub (${hub.name}), which exceeds this tool's delivery radius of ${deliveryRadiusKm} km.`,
      400
    )
  }

  return {
    eligible: true,
    isPickup: false,
    distanceKm,
    dispatchOriginHub: hub,
    farmCoordinates: farmCoords,
  }
}
