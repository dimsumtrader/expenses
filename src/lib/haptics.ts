export function haptic(ms: number = 10) {
  if (typeof window !== "undefined" && window.navigator.vibrate) {
    window.navigator.vibrate(ms);
  }
}
