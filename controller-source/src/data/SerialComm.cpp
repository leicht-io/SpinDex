#include <Arduino.h>
#include "SerialComm.h"

void SerialComm::print(double value) {
    Serial.print(value, 2);
    Serial.print("\n");
}