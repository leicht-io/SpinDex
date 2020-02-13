#include <Arduino.h>
#include <Adafruit_SSD1306.h>

class Display {
    public:
    void initializeDisplay();
    void update(double RPM);

    private:
    void showSplashScreen();
};