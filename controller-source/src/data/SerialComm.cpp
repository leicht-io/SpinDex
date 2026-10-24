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

        // Terminals end lines with LF, CRLF or CR alone. A CRLF's LF just
        // ends an empty line.
        if (c == '\n' || c == '\r') {
            line[lineLength] = '\0';
            if (strcmp(line, "version") == 0) {
                printVersion();
            }
            lineLength = 0;
        } else if (lineLength < sizeof(line) - 1) {
            line[lineLength++] = static_cast<char>(c);
        }
        // Otherwise the line is too long to be a request: the rest of it is
        // dropped, and what was kept can't match one.
    }
}
