#include <Arduino.h>
//#include <Adafruit_ST7735.h>

class Display
{
public:
    void initializeDisplay();
    void update(double RPM);

private:
    unsigned int nextGraphIndex;
    unsigned int graph[66];
   // Adafruit_ST7735 tft;

    void showSplashScreen();
};