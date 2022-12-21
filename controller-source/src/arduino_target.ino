#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include "data/StringUtils.h"
#include "data/Display.h"
#include "data/SerialComm.h"

const long baudRate = 115200;
const byte irSensorPin = 2;
byte previousIrSensorState = LOW;
byte count = 0;
unsigned long time = millis();
unsigned long now = millis();
unsigned long timeDiff = millis();

byte steps = 24; // 24 dark bars on BG4000-series/59xx-series
double oneSecond = 60000.0;

Display display = Display();
SerialComm serialComm = SerialComm();

void initialDevice() {
    Serial.begin(baudRate);
    display.initializeDisplay();
}

void setup(void) {
    initialDevice();
}

void resetStates() {
    count = 0;
    now = 0;
    time = millis();
}

double calculateRPM() {
    now = millis();

    timeDiff = now - time;

    return oneSecond / timeDiff;
}

void commit(double RPM) {
    Serial.println(RPM);
    // display.update(RPM);
}

void loop(void) {
    int currentIrSensorState = digitalRead(irSensorPin);
    if (currentIrSensorState != previousIrSensorState) {
        previousIrSensorState = currentIrSensorState;

        if (currentIrSensorState == HIGH) {
            count++;
        }

        if (count == 1) {
            // time = millis();
        }
        if (count == steps) {
            double RPM = calculateRPM();
            commit(RPM);
            resetStates();
        }
    }
}