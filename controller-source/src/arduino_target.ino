#include "data/Display.h"
#include "data/SerialComm.h"

const long baudRate = 115200;
const byte irSensorPin = 14;
byte previousIrSensorState = LOW;
byte count = 0;

unsigned long currentTime = millis();
unsigned long now = millis();
unsigned long timeDiff = millis();

double lastRPM = 0.0;

TaskHandle_t updateDisplayTask;
TaskHandle_t mainLoopTask;

byte steps = 24; // 24 dark bars on BG4000-series/59xx-series
double oneSecond = 60000.0;

Display display = Display();
SerialComm serialComm = SerialComm();

// TODO: send 0 if no measured value.

void initialDevice() {
    // TODO: Send with Bluetooth as well
    Serial.begin(baudRate);

    display.initializeDisplay();
}

void updateDisplayLoop(void *pvParameters) {
    for (;;) {
        serialComm.print(lastRPM);
        display.update(lastRPM);

        delay(1000);
    }
}

void mainLoop(void *pvParameters) {
    for (;;) {

        int currentIrSensorState = digitalRead(irSensorPin);
        if (currentIrSensorState != previousIrSensorState) {
            previousIrSensorState = currentIrSensorState;

            if (currentIrSensorState == HIGH) {
                count++;
            }

            if (count == steps) {
                lastRPM = calculateRPM();
                resetStates();
            }
        }

        delay(1);
    }
}


void setup(void) {
    pinMode(13, OUTPUT);
    digitalWrite(13, HIGH);
    initialDevice();

    xTaskCreatePinnedToCore(mainLoop, "updateDisplayTask", 10000, NULL, 1, &updateDisplayTask, 0);
    xTaskCreatePinnedToCore(updateDisplayLoop, "mainLoopTask", 10000, NULL, 1, &mainLoopTask, 1);
}

void resetStates() {
    count = 0;
    now = 0;
    currentTime = millis();
}

double calculateRPM() {
    now = millis();

    timeDiff = now - currentTime;

    return oneSecond / timeDiff;
}
