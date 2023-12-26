#include "data/Display.h"
#include "data/SerialComm.h"
#include "BluetoothSerial.h"

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
BluetoothSerial SerialBT;

// TODO: send 0 if no measured value.

void initialDevice() {
    // TODO: Send with Bluetooth as well
    Serial.begin(baudRate);
    SerialBT.begin("Astraeus");

    display.initializeDisplay();
}

void updateDisplayLoop(void *pvParameters) {
    for (;;) {
        // TODO: change display based on incoming commands.
        // TODO: Store in EEPROM.
        /* if (Serial.available()) { // if there is data coming
            String command = Serial.readStringUntil('\n'); // read string until newline character
            if (command == "?") {
            } else if (command == "?") {
            }
        } */

        serialComm.print(lastRPM);
        SerialBT.println(lastRPM);
        display.update(lastRPM);
        display.updateTime();

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

void loop() {

}