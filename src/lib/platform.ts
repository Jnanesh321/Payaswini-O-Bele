import { Capacitor } from "@capacitor/core"

export type NativePlatform = "android" | "ios"

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

export function getNativePlatform(): NativePlatform | "web" {
  if (!Capacitor.isNativePlatform()) return "web"
  return Capacitor.getPlatform() as NativePlatform
}