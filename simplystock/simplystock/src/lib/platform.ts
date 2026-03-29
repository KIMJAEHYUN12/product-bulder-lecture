import { Capacitor } from "@capacitor/core";

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

export function isWeb(): boolean {
  return !Capacitor.isNativePlatform();
}
