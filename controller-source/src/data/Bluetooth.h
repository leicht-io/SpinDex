#include <Arduino.h>

class Bluetooth
{
public:
    void init();
    void sendValue(double RPM);
    void checkConnection();

private:
};