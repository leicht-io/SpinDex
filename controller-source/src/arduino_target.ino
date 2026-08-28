#define BLUETOOTH_ENABLED           true
#define SERIAL_ENABLED              true
#define TIMER0_INTERVAL_MS          1
#define _TIMERINTERRUPT_LOGLEVEL_   0

#include "data/SerialComm.h"
#include "data/Bluetooth.h"
#include "logic/RpmCounter.h"
#include "ESP32TimerInterrupt.h"

const long baudRate = 115200;
// FC-51 IR obstacle avoidance module (LM393 comparator, ~2-30cm
// adjustable range via onboard trimpot).
// OUT -> G1. VCC -> 3V3 rail directly: measured draw is ~23mA at
// 3.3V, close enough to GPIO source limits that it's kept on the
// dedicated rail rather than a pin, same as the TCRT1000 it replaced.
// Output idles HIGH (no reflection) and drops LOW when a reflective
// bar is detected -- same polarity as the TCRT1000, so no logic
// change was needed here when swapping sensors.
const byte irSensorPin = 1; // G1 on M5Stack StampS3

// Edge-counting + RPM math itself lives in RpmCounter (src/logic), kept
// free of Arduino.h so it can be unit-tested on the host (see
// test/test_rpm_counter) -- this .ino only wires it up to the real GPIO
// pin and clock.
RpmCounter rpmCounter(/* stepsPerRevolution */ 24, /* stallTimeoutMs */ 1000);

TaskHandle_t emitRPMTask;
SerialComm serialComm = SerialComm();
Bluetooth bluetooth = Bluetooth();
ESP32Timer ITimer0(0);

void initialDevice() {
    if(SERIAL_ENABLED) {
        Serial.begin(baudRate);
    }

    if(BLUETOOTH_ENABLED) {
        bluetooth.init();
    }
}

 void emitRPMLoop(void *pvParameters) {
    for (;;) {
        emitRPM(rpmCounter.rpm());
        bluetooth.checkConnection();

        delay(500);
    }
}

bool IRAM_ATTR TimerHandler0(void * timerNo) {
    rpmCounter.update(digitalRead(irSensorPin) == HIGH, millis());

    return true;
}

void setup(void) {
    pinMode(irSensorPin, INPUT);
    initialDevice();

	// Setting up interrupt
	if (ITimer0.attachInterruptInterval(TIMER0_INTERVAL_MS * 100, TimerHandler0)) {
		Serial.print(F("Starting  ITimer0, millis() = "));
		Serial.println(millis());
	} else {
		Serial.println(F("Can't start ITimer0. Select another freq. or timer"));
    }

   xTaskCreatePinnedToCore(emitRPMLoop, "emitRPMTask", 10000, NULL, 1, &emitRPMTask, 1);
}

void emitRPM(float RPM) {
    if(SERIAL_ENABLED) {
        serialComm.print(RPM);
    }

    if(BLUETOOTH_ENABLED) {
        bluetooth.sendValue(RPM);
    }
}

void loop() {
}