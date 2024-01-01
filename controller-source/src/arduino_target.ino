#define DISPLAY_ENABLED             false
#define BLUETOOTH_ENABLED           true
#define SERIAL_ENABLED              true
#define TIMER0_INTERVAL_MS          1
#define _TIMERINTERRUPT_LOGLEVEL_   0

#include "data/Display.h"
#include "data/SerialComm.h"
#include "data/Bluetooth.h"
#include "ESP32TimerInterrupt.h"

const long baudRate = 115200;
const byte irSensorPin = 14;
byte previousIrSensorState = LOW;
byte count = 0;
byte steps = 24; // 24 dark bars on BG4000-series/59xx-series

unsigned long currentTime = millis();
unsigned long now = millis();
unsigned long timeDiff = millis();
unsigned long lastReading = millis();
double oneSecond = 60000.0;
float RPM = 0;

TaskHandle_t emitRPMTask;
Display display = Display();
SerialComm serialComm = SerialComm();
Bluetooth bluetooth = Bluetooth();
ESP32Timer ITimer0(0);

void initialDevice() {
    if(SERIAL_ENABLED) {
        Serial.begin(baudRate);
    }

    if(DISPLAY_ENABLED) {
        display.initializeDisplay();
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
int currentIrSensorState = digitalRead(irSensorPin);
    if (currentIrSensorState != previousIrSensorState) {
        previousIrSensorState = currentIrSensorState;

        if (currentIrSensorState == HIGH) {
            count++;
            lastReading = millis();
        }

        if (count == steps) {
            now = millis();
            timeDiff = now - currentTime;
            RPM = oneSecond / timeDiff;
            resetStates();
        } 
    }

     if((millis() - lastReading) > 1000) {
            RPM = 0.0;
    }

    return true;
}

void setup(void) {
    // Using pin 13 as Vin for IR
    pinMode(13, OUTPUT);
    digitalWrite(13, HIGH);
    initialDevice();

	// Setting up interrupt
	if (ITimer0.attachInterruptInterval(TIMER0_INTERVAL_MS * 100, TimerHandler0)) {
		Serial.print(F("Starting  ITimer0 OK, millis() = "));
		Serial.println(millis());
	} else {
		Serial.println(F("Can't set ITimer0. Select another freq. or timer"));
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

    if(DISPLAY_ENABLED) {
        display.update(RPM);
        display.updateTime();
    }
}

void loop() {
  
}