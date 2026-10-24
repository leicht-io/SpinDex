#pragma once

#include <Arduino.h>

class SerialComm {
    public:
    // Prints one reading as a line of the form `rpm:33.33`. The web app's
    // USB link only accepts lines in exactly this form, which lets it skip
    // the debug messages sharing the same port, and spot a line that was
    // cut short when the TX buffer overflowed. It's also the `label:value`
    // format the Arduino Serial Plotter understands.
    void print(double value);
};
