#include <Arduino.h>
#include <Adafruit_SSD1306.h>

class Display
{
public:
    void initializeDisplay();
    void update(double RPM);

private:
    unsigned int nextGraphIndex;
    unsigned int graph[66];
    Adafruit_SSD1306 oledDisplay;

    void showSplashScreen();
};