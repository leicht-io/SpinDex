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

TaskHandle_t Task1;
TaskHandle_t Task2;

byte steps = 24; // 24 dark bars on BG4000-series/59xx-series
double oneSecond = 60000.0;

Display display = Display();
SerialComm serialComm = SerialComm();

void initialDevice() {
    Serial.begin(baudRate);

    display.initializeDisplay();
}

void Task2code(void *pvParameters) {
    for (;;) {
        commit();
        delay(1000);
    }
}

void Task1code(void *pvParameters) {
    for (;;) {
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

    xTaskCreatePinnedToCore(
            Task1code,   /* Task function. */
            "Task1",     /* name of task. */
            10000,       /* Stack size of task */
            NULL,        /* parameter of the task */
            1,           /* priority of the task */
            &Task1,      /* Task handle to keep track of created task */
            0);

    xTaskCreatePinnedToCore(
            Task2code,   /* Task function. */
            "Task2",     /* name of task. */
            10000,       /* Stack size of task */
            NULL,        /* parameter of the task */
            1,           /* priority of the task */
            &Task2,      /* Task handle to keep track of created task */
            1);          /* pin task to core 1 */
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

void commit() {
    serialComm.print(lastRPM);
    display.update(lastRPM);
}

void loop(void) {
    /* int currentIrSensorState = digitalRead(irSensorPin);
    if (currentIrSensorState != previousIrSensorState) {
        previousIrSensorState = currentIrSensorState;

        if (currentIrSensorState == HIGH) {
            count++;
        }

        if (count == 1) {
            // time = millis();
        }
        if (count == steps) {
            lastRPM = calculateRPM();
            resetStates();
        }
    }

     delay(1); */
}