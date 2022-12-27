#include <Arduino.h>

class Display
{
public:
    void initializeDisplay();
    void update(double RPM);
    void updateTime();
    void printCurrentRPM(double RPM);
    void printMaxRPM(double RPM);
    void printMinRPM(double RPM);
    void initGraph();

private:
    unsigned int nextGraphIndex;
    unsigned int graph[66];
   // Adafruit_ST7735 tft;

    void showSplashScreen();
};