#include <Arduino.h>
#include "SerialComm.h"

void SerialComm::send(float value)
{
    Serial.print(value, 3);
    Serial.print("\n");
}