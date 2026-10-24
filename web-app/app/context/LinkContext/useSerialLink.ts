import * as React from 'react';
import { LinkProblem, TransportLink } from './types';
import { errorStatus } from './errorStatus';
import { createSerialReadingParser, VERSION_REQUEST } from '../../core/link/serialReadings';

// The StampS3's USB-C port is the ESP32-S3's built-in USB-Serial/JTAG
// controller, which enumerates with Espressif's IDs (and is listed as "USB
// JTAG/serial debug unit" -- a name fixed in the chip). Filtering on them
// keeps the picker to the sensor rather than every serial port on the
// machine -- but any ESP32-S3 board, and the chip's bootloader, share them.
const SPINDEX_USB_FILTER: SerialPortFilter = { usbVendorId: 0x303a, usbProductId: 0x1001 };
// Native USB ignores the baud rate, but open() requires one -- this is
// the firmware's.
const BAUD_RATE = 115_200;
// A port that sends no reading this long after opening is let go of, so it
// doesn't stay locked away from other tools: older firmware, another ESP32
// board with the same IDs, or the chip's bootloader during a flash.
const NO_READINGS_RELEASE_MS = 10_000;
// A write still unfinished after this is abandoned (see
// requestFirmwareVersion).
const WRITE_TIMEOUT_MS = 1_000;

const UNSUPPORTED_STATUS = 'Web Serial API is not available in this browser!';

// 'unplugged': the port went away mid-session (cable pulled, sensor
// restarted) and is reattached as soon as it reappears.
type Phase = 'idle' | 'opening' | 'open' | 'unplugged';

interface SessionEnd {
    received: boolean;
    // The browser reported the device lost, yet the port is still there.
    lostWhilePlugged: boolean;
    // Closed by us after NO_READINGS_RELEASE_MS without a reading.
    gaveUp: boolean;
}

// Asks the firmware for its version. Firmware from before it reported one
// ignores this, as does one that isn't SpinDex's. Never rejects: a failed
// request just leaves the version unknown.
const requestFirmwareVersion = async (port: SerialPort): Promise<void> => {
    if (!port.writable) {
        return;
    }
    const writer = port.writable.getWriter();
    // Firmware older than USB support never reads what the host sends, so
    // the chip stops taking more once its buffer is full. A write left
    // hanging would keep the port from closing, so it's aborted instead.
    const timeout = setTimeout(() => {
        writer.abort().catch(() => undefined);
    }, WRITE_TIMEOUT_MS);
    try {
        await writer.write(new TextEncoder().encode(VERSION_REQUEST));
    } catch {
        // Aborted above, or the device went away.
    } finally {
        clearTimeout(timeout);
        writer.releaseLock();
    }
};

const isSpinDexPort = (port: SerialPort): boolean => {
    const { usbVendorId, usbProductId } = port.getInfo();
    return usbVendorId === SPINDEX_USB_FILTER.usbVendorId && usbProductId === SPINDEX_USB_FILTER.usbProductId;
};

export interface SerialLink extends TransportLink {
    // Picks a sensor allowed on an earlier visit back up without a picker,
    // if one is plugged in. Resolves whether it started connecting.
    resume: () => Promise<boolean>;
}

/**
 * USB link to the sensor over Web Serial: reads the firmware's `rpm:`
 * lines (see core/link/serialReadings) and hands each reading to
 * `onSample`.
 *
 * It only connects when asked to: by connect(), by resume(), or to pick a
 * sensor pulled out mid-session back up when it's plugged in again. An idle
 * tab leaves the port alone for other tools (flashing, a serial monitor).
 */
export const useSerialLink = (onSample: (value: number) => void): SerialLink => {
    const supported = typeof navigator !== 'undefined' && !!navigator.serial;

    // The read loop and the port event handler outlive renders (see the
    // Bluetooth link for why that matters), so the callback goes through a
    // ref.
    const onSampleRef = React.useRef(onSample);
    onSampleRef.current = onSample;

    const [phase, setPhaseState] = React.useState<Phase>('idle');
    const phaseRef = React.useRef<Phase>('idle');
    const setPhase = (next: Phase): void => {
        phaseRef.current = next;
        setPhaseState(next);
    };

    // Every status update replaces the problem too, so the two can't
    // disagree.
    const [report, setReport] = React.useState<{ status: string; problem: LinkProblem | null }>({ status: '', problem: null });
    const setStatus = (status: string, problem: LinkProblem | null = null): void => setReport({ status, problem });
    const [firmwareVersion, setFirmwareVersion] = React.useState<string | null>(null);

    // Bumped by every attach() and disconnect(): a session whose number is
    // no longer current stands down at its next step. (Comparing ports
    // instead wouldn't do -- the browser hands back the same SerialPort when
    // the same sensor is picked again.)
    const attemptRef = React.useRef(0);
    // The port of the current session; connect() uses it to spot re-picking
    // the open port.
    const portRef = React.useRef<SerialPort | undefined>(undefined);
    const readerRef = React.useRef<ReadableStreamDefaultReader<Uint8Array> | undefined>(undefined);
    // Settles once the latest session has ended and closed its port. Each
    // new session waits for it, so a port is never opened while still open.
    const sessionRef = React.useRef<Promise<void>>(Promise.resolve());

    const goIdle = (status: string, problem: LinkProblem | null = null): void => {
        portRef.current = undefined;
        setPhase('idle');
        setStatus(status, problem);
    };

    // Retires the current session: its read loop ends and closes the port.
    const release = (): void => {
        attemptRef.current += 1;
        readerRef.current?.cancel().catch(() => undefined);
    };

    // Reads `port` until the session is retired, the device goes away, or
    // nothing arrives in time; then closes it.
    const readUntilClosed = async (port: SerialPort, attempt: number): Promise<SessionEnd> => {
        const parser = createSerialReadingParser(Date.now());
        const decoder = new TextDecoder();
        let received = false;
        let lostWhilePlugged = false;
        let gaveUp = false;

        // Sent on opening, and once more with the first reading if no
        // answer has come by then: a request sent while the sensor was still
        // starting up (its port appears before the firmware runs) can go
        // unread. The port is closed only once these have finished, as
        // close() fails while a write holds the writer.
        let versionRequest = requestFirmwareVersion(port);
        let askedAgain = false;
        // attach() starts each session at null.
        let reportedVersion: string | null = null;

        const giveUpTimer = setTimeout(() => {
            if (!received) {
                gaveUp = true;
                readerRef.current?.cancel().catch(() => undefined);
            }
        }, NO_READINGS_RELEASE_MS);

        // A non-fatal error (buffer overrun, framing) ends the current
        // reader but leaves a fresh port.readable to carry on with; a lost
        // device leaves it null.
        while (port.readable && attemptRef.current === attempt && !gaveUp) {
            const reader = port.readable.getReader();
            readerRef.current = reader;
            try {
                for (;;) {
                    const { value, done } = await reader.read();
                    if (done) {
                        break; // reader.cancel(): retired, or gave up
                    }
                    for (const reading of parser.push(decoder.decode(value, { stream: true }), Date.now())) {
                        received = true;
                        onSampleRef.current(reading);
                    }
                    const version = parser.firmwareVersion();
                    if (version !== reportedVersion && attemptRef.current === attempt) {
                        reportedVersion = version;
                        setFirmwareVersion(version);
                    }
                    if (received && version === null && !askedAgain) {
                        askedAgain = true;
                        versionRequest = versionRequest.then(() => requestFirmwareVersion(port));
                    }
                }
            } catch (error) {
                // The loop condition sorts out whether the port carries on.
                // `connected` is false once the device is really gone (and
                // undefined where the browser doesn't have it yet).
                lostWhilePlugged = error instanceof DOMException && error.name === 'NetworkError' && port.connected === true;
            } finally {
                reader.releaseLock();
                readerRef.current = undefined;
            }
        }

        clearTimeout(giveUpTimer);
        await versionRequest;
        await port.close().catch(() => undefined);
        return { received, lostWhilePlugged, gaveUp };
    };

    const runSession = async (port: SerialPort, attempt: number): Promise<void> => {
        if (attemptRef.current !== attempt) {
            return; // retired while waiting for the previous session
        }

        try {
            await port.open({ baudRate: BAUD_RATE });
        } catch (error) {
            if (attemptRef.current === attempt) {
                // Typically "already open": SpinDex open in another tab.
                goIdle(errorStatus(error));
            }
            return;
        }

        if (attemptRef.current !== attempt) {
            // Retired while the port was opening.
            await port.close().catch(() => undefined);
            return;
        }

        setPhase('open');
        setStatus('Connected over USB.');
        const { received, lostWhilePlugged, gaveUp } = await readUntilClosed(port, attempt);

        if (attemptRef.current !== attempt) {
            return; // closed on purpose
        }
        if (gaveUp) {
            goIdle('Error: no readings arrived over USB.', 'noReadings');
        } else if (lostWhilePlugged && !received) {
            // On Linux that's Chrome before Chromium's 2026-09 fix: it
            // inherits the VMIN=0 that pyserial tools (PlatformIO, esptool)
            // leave on the tty and reads "no data waiting" as the device
            // gone. The connection help has the fix. Still plugged in, so no
            // connect event will come to retry on -- and retrying straight
            // away fails the same way.
            goIdle('Error: the port was dropped right after opening it.', 'lostWhilePlugged');
        } else if (received) {
            // Pulled out, or the sensor restarted: the connect listener
            // below picks it back up when it reappears.
            setPhase('unplugged');
            setStatus('USB unplugged — plug the SpinDex back in to resume.');
        } else {
            // Lost before a single reading. Don't wait to reattach: if
            // opening the port is what knocked the sensor off the bus,
            // reattaching each time it reappears would loop forever.
            goIdle('Error: the USB connection dropped before any readings arrived.');
        }
    };

    // Retires any current session and opens `port` once that one has
    // closed its port.
    const attach = (port: SerialPort): void => {
        release();
        const attempt = attemptRef.current;
        portRef.current = port;
        setPhase('opening');
        setFirmwareVersion(null);
        setStatus('Opening USB port…');
        sessionRef.current = sessionRef.current
            .then(() => runSession(port, attempt))
            .catch(() => undefined);
    };

    const disconnect = (): void => {
        release();
        goIdle('');
    };

    const connect = async (): Promise<boolean> => {
        if (!supported) {
            setStatus(UNSUPPORTED_STATUS);
            return false;
        }

        let port: SerialPort;
        try {
            port = await navigator.serial.requestPort({ filters: [SPINDEX_USB_FILTER] });
        } catch (error) {
            // Picker cancelled, or not allowed -- an existing connection is
            // left alone.
            setStatus(errorStatus(error));
            return false;
        }

        if (port !== portRef.current || phaseRef.current !== 'open') {
            attach(port);
        }
        return true;
    };

    const resume = async (): Promise<boolean> => {
        if (!supported || phaseRef.current !== 'idle') {
            return false;
        }
        const port = (await navigator.serial.getPorts()).find(isSpinDexPort);
        if (!port || phaseRef.current !== 'idle') {
            return false;
        }
        attach(port);
        return true;
    };

    React.useEffect(() => {
        if (!supported) {
            return;
        }

        // A sensor pulled out mid-session, plugged back in.
        const onPortConnected = (event: Event): void => {
            const port = event.target as SerialPort;
            if (phaseRef.current === 'unplugged' && isSpinDexPort(port)) {
                attach(port);
            }
        };
        navigator.serial.addEventListener('connect', onPortConnected);

        return () => {
            navigator.serial.removeEventListener('connect', onPortConnected);
            // Unmounted: don't leave the port open for nobody.
            release();
        };
    }, []);

    return {
        supported,
        available: supported,
        connected: phase === 'open',
        connecting: phase === 'opening' || phase === 'unplugged',
        status: report.status,
        problem: report.problem,
        firmwareVersion,
        connect,
        disconnect,
        resume,
    };
};
