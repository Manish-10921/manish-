import Vapi from '@vapi-ai/web'

export const VAPI_PUBLIC_KEY   = 'cce00b52-14d1-471f-8466-5be10343bdf4'
export const VAPI_ASSISTANT_ID = '9f8d4d8d-7738-49ae-a70b-64c198e713bd'

let _vapi = null
export function getVapi() {
  if (!_vapi) _vapi = new Vapi(VAPI_PUBLIC_KEY)
  return _vapi
}
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
