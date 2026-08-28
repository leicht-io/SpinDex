#include "RpmCounter.h"

namespace {
    constexpr double MS_PER_MINUTE = 60000.0;
}

RpmCounter::RpmCounter(uint8_t stepsPerRevolution, unsigned long stallTimeoutMs)
    : stepsPerRevolution_(stepsPerRevolution), stallTimeoutMs_(stallTimeoutMs) {
}

void IRAM_ATTR RpmCounter::update(bool high, unsigned long nowMs) {
    if (high != previousHigh_) {
        previousHigh_ = high;

        if (high) {
            count_++;
            lastEdgeMs_ = nowMs;
        }

        if (count_ == stepsPerRevolution_) {
            completeRevolution(nowMs);
        }
    }

    if (nowMs - lastEdgeMs_ > stallTimeoutMs_) {
        rpm_ = 0.0f;
    }
}

void IRAM_ATTR RpmCounter::completeRevolution(unsigned long nowMs) {
    unsigned long timeDiff = nowMs - cycleStartMs_;
    rpm_ = timeDiff > 0 ? static_cast<float>(MS_PER_MINUTE / timeDiff) : 0.0f;

    count_ = 0;
    cycleStartMs_ = nowMs;
}
