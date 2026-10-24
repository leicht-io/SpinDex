#include <Arduino.h>
#include "SerialComm.h"
#include "../Version.h"

void SerialComm::print(double value) {
    // printf formats into a stack buffer and sends the line as a single
    // write: the USB driver locks per write, so a debug print from the
    // Bluetooth task can't land in the middle of the line.
    Serial.printf("rpm:%.2f\n", value);
}

void SerialComm::printVersion() {
    // One write, for the same reason as print().
    Serial.printf("version:%s\n", FIRMWARE_VERSION);
}

void SerialComm::handleInput() {
    while (Serial.available() > 0) {
        int c = Serial.read();
        if (c < 0) {
            return;
        }

        if (c == '\n') {
            // Tolerate CRLF from a terminal.
            if (lineLength > 0 && line[lineLength - 1] == '\r') {
                lineLength--;
            }
            line[lineLength] = '\0';
            if (!overflowed && strcmp(line, "version") == 0) {
                printVersion();
            }
            lineLength = 0;
            overflowed = false;
        } else if (lineLength < sizeof(line) - 1) {
            line[lineLength++] = static_cast<char>(c);
        } else {
            overflowed = true;
        }
    }
}
