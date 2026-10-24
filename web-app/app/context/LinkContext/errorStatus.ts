import { errorMessage } from '../../core/errorMessage';

// Status text for a failed Bluetooth/Serial call.
export const errorStatus = (error: unknown): string => `Error: ${ errorMessage(error) }`;
