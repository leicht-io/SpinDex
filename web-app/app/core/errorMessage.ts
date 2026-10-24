// The text of a rejection. Browser APIs (Bluetooth, Serial) reject with a
// DOMException, not a string, so read its .message (e.g. "User cancelled
// the requestDevice() chooser." on cancel).
export const errorMessage = (error: unknown): string => (error instanceof Error ? error.message : String(error));
