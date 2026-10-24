// Status text for a failed Bluetooth/Serial call. Those APIs reject with a
// DOMException, not a string, so read its .message (e.g. "User cancelled
// the requestDevice() chooser." on cancel).
export const errorStatus = (error: unknown): string => `Error: ${ error instanceof Error ? error.message : String(error) }`;
