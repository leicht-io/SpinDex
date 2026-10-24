#include <Arduino.h>
#include "SerialComm.h"

void SerialComm::print(double value) {
    // printf formats into a stack buffer and sends the line as a single
    // write: the USB driver locks per write, so a debug print from the
    // Bluetooth task can't land in the middle of the line.
    Serial.printf("rpm:%.2f\n", value);
}
