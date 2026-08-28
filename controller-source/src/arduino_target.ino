#define BLUETOOTH_ENABLED           true
#define SERIAL_ENABLED              true
#define TIMER0_INTERVAL_MS          1
#define _TIMERINTERRUPT_LOGLEVEL_   0

#include "data/SerialComm.h"
#include "data/Bluetooth.h"
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
volatile byte previousIrSensorState = LOW;
volatile byte count = 0;
byte steps = 24; // 24 dark bars on BG4000-series/59xx-series
double msPerMinute = 60000.0;
unsigned long currentTime = millis();
unsigned long lastReading = millis();
volatile unsigned long now = millis();
volatile unsigned long timeDiff = millis();
volatile float RPM = 0;

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
        emitRPM(RPM);
        bluetooth.checkConnection();

        delay(500);
    }
} 

bool IRAM_ATTR TimerHandler0(void * timerNo) {
    volatile int currentIrSensorState = digitalRead(irSensorPin);
    
    if (currentIrSensorState != previousIrSensorState) {
        previousIrSensorState = currentIrSensorState;

        if (currentIrSensorState == HIGH) {
            count++;
            lastReading = millis();
        }

        if (count == steps) {
            now = millis();
            timeDiff = now - currentTime;
            RPM = msPerMinute / timeDiff;
            resetStates();
        }
    }

     if((millis() - lastReading) > 1000) {
            RPM = 0.0;
    }

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

void resetStates() {
    count = 0;
    now = 0;
    currentTime = millis();
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