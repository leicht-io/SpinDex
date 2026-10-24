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

    // Prints the firmware version as a line of the form `version:1.0.0`.
    void printVersion();

    // Reads whatever the host has sent and answers the requests in it, one
    // per line. The web app sends `version` on opening the port and gets
    // printVersion()'s line back. Call it often: it never blocks.
    void handleInput();

    private:
    // The line being received. A line longer than this isn't a request, so
    // it's cut short (see handleInput()).
    char line[32];
    size_t lineLength = 0;
};
