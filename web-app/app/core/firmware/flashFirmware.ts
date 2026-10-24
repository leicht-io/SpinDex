/*
  Flashes a FirmwareBundle onto the sensor over Web Serial, through the
  ESP32-S3's ROM bootloader -- what a PlatformIO upload does, and so it
  works whatever firmware the sensor runs now, even broken firmware.
*/

import { FirmwareBundle, flashProgress } from './firmwareBundle';
import { md5Hex } from './md5';
import { errorMessage } from '../errorMessage';

// The SpinDex's chip, as esptool-js names it: flashing stops before
// writing anything if the picked device has another one.
const SPINDEX_CHIP = 'ESP32-S3';
// Native USB ignores the baud rate. Asking for the ROM's own skips the
// baud-rate change, which would gain nothing here.
const BAUD_RATE = 115_200;
// The tail of esptool-js's log kept for an error's details.
const LOG_LINES = 40;

export type FlashStage = 'connecting' | 'writing' | 'restarting';

export interface FlashCallbacks {
    onStage: (stage: FlashStage) => void;
    // 0-1, while writing.
    onProgress: (fraction: number) => void;
}

// A failed update, with the end of esptool-js's log for the details.
export class FirmwareFlashError extends Error {
    log: string;

    constructor(message: string, log: string) {
        super(message);
        this.name = 'FirmwareFlashError';
        this.log = log;
    }
}

// Loads the flasher, most of a megabyte with a stub for every ESP32 chip,
// ahead of an update. flashFirmware then finds it already loaded.
export const preloadFlasher = (): void => {
    import('esptool-js').catch(() => undefined);
};

/**
 * Writes `bundle` to the sensor on `port`, which must be closed: this opens
 * it, and closes it again once the sensor is restarting into the new
 * firmware.
 */
export const flashFirmware = async (port: SerialPort, bundle: FirmwareBundle, callbacks: FlashCallbacks): Promise<void> => {
    const { ESPLoader, Transport } = await import('esptool-js');

    let log = '';
    const terminal = {
        clean: (): void => undefined,
        write: (data: string): void => {
            log += data;
        },
        writeLine: (data: string): void => {
            log += `${ data }\n`;
        },
    };

    const transport = new Transport(port, false);
    const loader = new ESPLoader({ transport, baudrate: BAUD_RATE, romBaudrate: BAUD_RATE, terminal });

    try {
        callbacks.onStage('connecting');
        // Resets the sensor into its bootloader (the USB-Serial/JTAG reset,
        // no button needed) and loads the flasher stub into RAM. Nothing is
        // written to flash until the checks below pass.
        await loader.main();
        if (loader.chip.CHIP_NAME !== SPINDEX_CHIP) {
            throw new Error(`This is an ${ loader.chip.CHIP_NAME }, not the SpinDex’s ${ SPINDEX_CHIP }.`);
        }
        // Another ESP32-S3 board shares the SpinDex's USB IDs, so it could be
        // picked by mistake; a different flash size gives most of them away.
        // (An undetectable size proves nothing either way.)
        const flashSize = await loader.detectFlashSize();
        if (flashSize !== undefined && flashSize !== bundle.flashSize) {
            throw new Error(`This board has ${ flashSize } of flash, not the SpinDex’s ${ bundle.flashSize }.`);
        }

        callbacks.onStage('writing');
        await loader.writeFlash({
            fileArray: bundle.images.map(image => ({ data: image.data, address: image.offset })),
            flashMode: bundle.flashMode,
            flashFreq: bundle.flashFreq,
            flashSize: bundle.flashSize,
            eraseAll: false,
            compress: true,
            reportProgress: (index: number, written: number, total: number) => {
                callbacks.onProgress(flashProgress(bundle.images, index, written, total));
            },
            // Reads each image back from flash and compares.
            calculateMD5Hash: md5Hex,
        });

        callbacks.onStage('restarting');
        await loader.after('hard_reset');
    } catch (error) {
        throw new FirmwareFlashError(errorMessage(error), log.split('\n').slice(-LOG_LINES).join('\n').trim());
    } finally {
        // The port may already be gone (unplugged, or the reset dropped it).
        await transport.disconnect().catch(() => undefined);
    }
};
