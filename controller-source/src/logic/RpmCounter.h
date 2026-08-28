#pragma once

#include <stdint.h>

// update()/completeRevolution() run inside TimerHandler0, an IRAM_ATTR ISR,
// so they must themselves live in IRAM too -- code called from an IRAM ISR
// that isn't IRAM-resident itself can crash the chip if the ISR fires while
// flash cache is disabled (flash/NVS writes, some BLE/Wi-Fi operations).
// IRAM_ATTR is an Arduino-ESP32 macro, not something this header can define
// itself without pulling in Arduino.h -- so pull it in only when actually
// building under the Arduino framework (ARDUINO is defined by that build),
// and fall back to a no-op so this stays includable/compilable standalone
// for PlatformIO's "native" host unit tests, where IRAM doesn't apply.
#ifdef ARDUINO
#include <Arduino.h>
#else
#ifndef IRAM_ATTR
#define IRAM_ATTR
#endif
#endif

// Pure re-implementation of the tachometer edge-counting and RPM
// calculation that used to live directly in arduino_target.ino's
// TimerHandler0. Deliberately has no hardware calls of its own (no
// digitalRead(), no millis() -- the caller reads the sensor and the clock
// and hands both in) so it can be exercised by PlatformIO's "native" unit
// tests without a board or any real hardware attached. arduino_target.ino
// wraps this with the actual GPIO read and the real millis().
class RpmCounter {
public:
    // stepsPerRevolution: number of rising edges (dark/reflective bar
    // transitions) counted per full revolution -- 24 for the
    // BG4000-/59xx-series strobe ring.
    // stallTimeoutMs: if this long passes with no rising edge, rpm() resets
    // to 0 (platter presumed stopped) rather than reporting a stale value.
    RpmCounter(uint8_t stepsPerRevolution, unsigned long stallTimeoutMs);

    // Feed one sensor level reading and the timestamp it was read at, once
    // per poll. Mirrors the original TimerHandler0's edge-detection +
    // step-counting + per-revolution RPM calculation exactly, including its
    // polarity (idle HIGH, only a LOW->HIGH transition counts as one bar),
    // and also resets rpm() back to 0 once stallTimeoutMs passes with no
    // rising edge (platter presumed stopped) rather than reporting a stale
    // value -- call this on every poll, edge or not, for that to work.
    void IRAM_ATTR update(bool high, unsigned long nowMs);

    float rpm() const {
        return rpm_;
    }

private:
    void IRAM_ATTR completeRevolution(unsigned long nowMs);

    const uint8_t stepsPerRevolution_;
    const unsigned long stallTimeoutMs_;

    bool previousHigh_ = false;
    uint8_t count_ = 0;
    unsigned long cycleStartMs_ = 0;
    unsigned long lastEdgeMs_ = 0;
    // volatile: written here from the ISR, read from rpm() by emitRPMLoop
    // running on the other core/task -- without this the compiler is free
    // to cache a stale value across that task's polling loop iterations.
    volatile float rpm_ = 0;
};
