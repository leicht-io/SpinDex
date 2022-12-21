#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <TimerOne.h>
#include "data/StringUtils.h"
#include "data/Display.h"
#include "data/SerialComm.h"

const int IRSensorPin = 2;

int inputState;
int lastInputState = LOW;

unsigned long debounceDelay = 5;
unsigned long lastDebounceTime = 0;
unsigned long endTime = 0;
unsigned long time;
unsigned long startTime;
unsigned long baudRate = 38400;

double steps = 24.0; // 24 dark bars on BG4000-series/59xx-series
double RPM = 0.0;
double prevRPM = 0.0;

unsigned long lastTime = millis();

Display display = Display();
SerialComm serialComm = SerialComm();

// TODO: Reset to zero when Beogram is turned off.

void setup(void) {
  initialDevice();
}

void initialDevice() {
  pinMode(IRSensorPin, INPUT);
  Serial.begin(baudRate);
  initializeTimer1();
  display.initializeDisplay();
}

void loop(void) {
  time = millis();
  int currentSwitchState = digitalRead(IRSensorPin);

  if (currentSwitchState != lastInputState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (currentSwitchState != inputState) {
      inputState = currentSwitchState;

      if (inputState == LOW) {
        calculateRPM();
      }
    }
  }

  lastInputState = currentSwitchState;

  if (millis() > lastTime + 1000) {
    display.update(RPM);
    serialComm.send(RPM);

    lastTime = millis();
  }
}

void initializeTimer1() {
  Timer1.initialize(1000000);
  Timer1.attachInterrupt(timerIsr);
}

void calculateRPM() {
  startTime = lastDebounceTime;
  unsigned long lnTime = startTime - endTime;
  RPM = (60000.0 / (double)lnTime) / steps;

  prevRPM = RPM;

  endTime = startTime;
}

void timerIsr() {
  time = millis() / 1000;
}
