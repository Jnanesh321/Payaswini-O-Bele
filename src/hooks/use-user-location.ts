"use client"

import { useState, useEffect, useCallback } from "react"
import { REGIONAL_TALUKS, type TalukOption } from "@/components/home/location-selector-sheet"

export interface UserCoordinates {
  latitude: number
  longitude: number
  accuracy?: number
  timestamp?: number
}

export interface DetectedLocationResult {
  coords: UserCoordinates
  nearestHub: TalukOption
  distanceKm: number
  formattedAddress?: string
}

/**
 * Haversine distance formula in kilometers
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth radius in km
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
 * Finds the nearest regional hub from coordinates
 */
export function findNearestRegionalHub(
  coords: UserCoordinates
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

const STORAGE_KEY = "obele_user_gps"

function getCachedLocation(): {
  coords: UserCoordinates | null
  nearestHub: TalukOption | null
  distanceKm: number | null
} {
  if (typeof window === "undefined") {
    return { coords: null, nearestHub: null, distanceKm: null }
  }
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached) {
      const parsed: UserCoordinates = JSON.parse(cached)
      if (parsed.timestamp && Date.now() - parsed.timestamp < 12 * 60 * 60 * 1000) {
        const match = findNearestRegionalHub(parsed)
        return { coords: parsed, nearestHub: match.hub, distanceKm: match.distanceKm }
      }
    }
  } catch {
    // Ignored
  }
  return { coords: null, nearestHub: null, distanceKm: null }
}

function getInitialPermission(): "prompt" | "granted" | "denied" | "unsupported" {
  if (typeof window === "undefined") return "prompt"
  if (!("geolocation" in navigator)) return "unsupported"
  return "prompt"
}

export function useUserLocation() {
  const [cachedData] = useState(getCachedLocation)
  const [coords, setCoords] = useState<UserCoordinates | null>(() => cachedData.coords)
  const [nearestHub, setNearestHub] = useState<TalukOption | null>(() => cachedData.nearestHub)
  const [distanceKm, setDistanceKm] = useState<number | null>(() => cachedData.distanceKm)
  const [isLocating, setIsLocating] = useState(false)
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unsupported">(getInitialPermission)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Check permission state if API available
  useEffect(() => {
    if (typeof window === "undefined") return

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((status) => {
          setPermissionState(status.state as "prompt" | "granted" | "denied")
          status.onchange = () => {
            setPermissionState(status.state as "prompt" | "granted" | "denied")
          }
        })
        .catch(() => {})
    }
  }, [])

  const detectLocation = useCallback(
    (): Promise<DetectedLocationResult> => {
      return new Promise((resolve, reject) => {
        if (typeof window === "undefined" || !("geolocation" in navigator)) {
          const err = "Geolocation is not supported by your browser"
          setErrorMessage(err)
          setPermissionState("unsupported")
          return reject(new Error(err))
        }

        setIsLocating(true)
        setErrorMessage(null)

        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newCoords: UserCoordinates = {
              latitude: Number(position.coords.latitude.toFixed(5)),
              longitude: Number(position.coords.longitude.toFixed(5)),
              accuracy: Math.round(position.coords.accuracy),
              timestamp: Date.now(),
            }

            const { hub, distanceKm: dist } = findNearestRegionalHub(newCoords)

            setCoords(newCoords)
            setNearestHub(hub)
            setDistanceKm(dist)
            setPermissionState("granted")
            setIsLocating(false)

            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(newCoords))
            } catch {
              // Ignore storage errors
            }

            resolve({
              coords: newCoords,
              nearestHub: hub,
              distanceKm: dist,
            })
          },
          (error) => {
            setIsLocating(false)
            let msg = "Unable to retrieve your location"
            if (error.code === error.PERMISSION_DENIED) {
              msg = "Location permission denied. Please enable GPS in your device/browser settings."
              setPermissionState("denied")
            } else if (error.code === error.POSITION_UNAVAILABLE) {
              msg = "Location information is unavailable. Please check GPS signal."
            } else if (error.code === error.TIMEOUT) {
              msg = "Location request timed out. Please try again."
            }
            setErrorMessage(msg)
            reject(new Error(msg))
          },
          {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 30000,
          }
        )
      })
    },
    []
  )

  const clearLocation = useCallback(() => {
    setCoords(null)
    setNearestHub(null)
    setDistanceKm(null)
    setErrorMessage(null)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Ignored
    }
  }, [])

  return {
    coords,
    nearestHub,
    distanceKm,
    isLocating,
    permissionState,
    errorMessage,
    detectLocation,
    clearLocation,
    hasGpsLocation: Boolean(coords),
  }
}
