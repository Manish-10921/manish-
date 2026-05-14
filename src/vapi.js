import Vapi from '@vapi-ai/web'

// ── Config ──────────────────────────────────────────────────────────────────
export const VAPI_PUBLIC_KEY  = 'f009c880-c48b-492c-a2d4-e2b244576145'
export const VAPI_ASSISTANT_ID = '7f05f7b5-c068-4aab-98ba-c1df40319cce'

// ── Singleton ────────────────────────────────────────────────────────────────
let _vapi = null

export function getVapi() {
  if (!_vapi) _vapi = new Vapi(VAPI_PUBLIC_KEY)
  return _vapi
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export async function startCall() {
  const vapi = getVapi()
  await vapi.start(VAPI_ASSISTANT_ID)
  return vapi
}

export async function stopCall() {
  const vapi = getVapi()
  await vapi.stop()
}

export function isMuted() {
  return getVapi().isMuted()
}

export function toggleMute() {
  const vapi = getVapi()
  vapi.setMuted(!vapi.isMuted())
}
