#include <Arduino.h>
#include "Display.h"
#include <Adafruit_SSD1306.h>

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32

#define OLED_RESET 4 // Reset pin # (or -1 if sharing Arduino reset pin) // Declaration for an SSD1306 display connected to I2C (SDA, SCL pins)

Adafruit_SSD1306 oledDisplay(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

static const unsigned char PROGMEM thumbsUp[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xc0, 0x00, 0x07, 0xc0, 0x00, 0x0f, 0x00, 0x30, 0x3e, 0x00, 0x78, 0x7c, 0x00, 0x3f, 0xf0, 0x00, 0x1f, 0xe0, 0x00, 0x07, 0x80, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
static const unsigned char PROGMEM thumbsDown[] = {0x00, 0x00, 0x00, 0x38, 0x03, 0x80, 0x7e, 0x0f, 0xc0, 0x3f, 0x1f, 0x80, 0x0f, 0xfe, 0x00, 0x07, 0xfc, 0x00, 0x03, 0xf8, 0x00, 0x07, 0xfc, 0x00, 0x0f, 0xfe, 0x00, 0x3f, 0x1f, 0x80, 0x7c, 0x07, 0xc0, 0x38, 0x03, 0x80, 0x00, 0x00, 0x00};
static const unsigned char PROGMEM splashScreen1[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7f, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xff, 0xff, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3f, 0xff, 0xff, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xff, 0xff, 0xff, 0xff, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xff, 0xff, 0xf0, 0x0f, 0xff, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0x00, 0x03, 0xc6, 0x00, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0x00, 0x03, 0xc4, 0x00, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0x1f, 0xf0, 0x0f, 0xf8, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0xff, 0xff, 0xff, 0xf8, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xfc, 0x07, 0xff, 0xff, 0xe0, 0x3f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xf8, 0xe3, 0xff, 0xff, 0xc7, 0x1f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xf1, 0xf1, 0xff, 0xff, 0xcf, 0x8f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xf8, 0x03, 0xff, 0xff, 0xc0, 0x1f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xfe, 0x0f, 0xff, 0xff, 0xf0, 0x7f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0x1f, 0xff, 0xff, 0xf8, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0x00, 0x1f, 0xf8, 0x00, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0x00, 0x1f, 0xf8, 0x00, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0xfe, 0x1f, 0xfc, 0x7f, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0xff, 0x0f, 0xf0, 0xff, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0xff, 0xc3, 0xc3, 0xff, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0f, 0xff, 0xff, 0xe1, 0x87, 0xff, 0xff, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xff, 0xff, 0xf8, 0x1f, 0xff, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff, 0xfe, 0x7f, 0xff, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1f, 0xff, 0xff, 0xff, 0xff, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xff, 0xff, 0xff, 0xff, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x3f, 0xff, 0xff, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0xff, 0xff, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x7f, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x07, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
static const unsigned char PROGMEM splashScreen2[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x38, 0x00, 0xff, 0xf0, 0xe0, 0x1f, 0xf0, 0x70, 0x07, 0x1f, 0xff, 0xe0, 0x0e, 0x01, 0xff, 0x00, 0x38, 0x00, 0xff, 0xf0, 0xe0, 0xff, 0xfc, 0x70, 0x07, 0x0f, 0xff, 0xc0, 0x0e, 0x0f, 0xff, 0xe0, 0x38, 0x00, 0xf0, 0x00, 0xe1, 0xe0, 0x00, 0x70, 0x07, 0x00, 0x70, 0x00, 0x0e, 0x1e, 0x00, 0xf0, 0x38, 0x00, 0xf0, 0x00, 0xe3, 0xc0, 0x00, 0x70, 0x07, 0x00, 0x70, 0x00, 0x0e, 0x3c, 0x00, 0x38, 0x38, 0x00, 0xff, 0xe0, 0xe3, 0x80, 0x00, 0x7f, 0xff, 0x00, 0x70, 0x00, 0x0e, 0x38, 0x00, 0x3c, 0x38, 0x00, 0xff, 0xe0, 0xe3, 0x80, 0x00, 0x7f, 0xff, 0x00, 0x70, 0x00, 0x0e, 0x38, 0x00, 0x3c, 0x38, 0x00, 0xf0, 0x00, 0xe3, 0xc0, 0x00, 0x70, 0x07, 0x00, 0x70, 0x00, 0x0e, 0x3c, 0x00, 0x3c, 0x38, 0x00, 0xf0, 0x00, 0xe1, 0xe0, 0x00, 0x70, 0x07, 0x00, 0x70, 0x00, 0x0e, 0x1e, 0x00, 0xf0, 0x3f, 0xf0, 0xff, 0xe0, 0xe0, 0xff, 0xfc, 0x70, 0x07, 0x00, 0x70, 0x07, 0x0e, 0x0f, 0xff, 0xe0, 0x3f, 0xf8, 0xff, 0xf0, 0xe0, 0x1f, 0xf0, 0x70, 0x07, 0x00, 0x30, 0x07, 0x0e, 0x01, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

unsigned int nextGraphIndex = 0;
unsigned int graph[66];

void Display::initializeDisplay()
{
  // Address 0x3C for 128x32, SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
  if (!oledDisplay.begin(SSD1306_SWITCHCAPVCC, 0x3C))
  {
    Serial.println(F("SSD1306 allocation failed"));
    for (;;)
      ; // Don't proceed, loop forever
  }

  Display::showSplashScreen();
}

void Display::update(double RPM)
{
  oledDisplay.clearDisplay();

  oledDisplay.setTextSize(2);
  oledDisplay.setCursor(2, 2);
  oledDisplay.setTextColor(WHITE);
  oledDisplay.println(RPM);

  oledDisplay.setTextSize(1);
  oledDisplay.setCursor(65, 2);
  oledDisplay.println("RPM");

  oledDisplay.drawLine(0, 18, 128, 18, WHITE);
  oledDisplay.drawLine(90, 2, 90, 15, WHITE);

  if ((RPM > 33 && RPM < 34) || (RPM > 44 && RPM < 46))
  {
    oledDisplay.drawBitmap(100, 3, thumbsUp, 19, 13, 1);
  }
  else
  {
    oledDisplay.drawBitmap(100, 3, thumbsDown, 19, 13, 1);
  }

  if (RPM <= 10)
  {
    graph[nextGraphIndex] = 1;
  }
  else if (RPM > 10 && RPM <= 20)
  {
    graph[nextGraphIndex] = 2;
  }
  else if (RPM > 20 && RPM <= 30)
  {
    graph[nextGraphIndex] = 4;
  }
  else if (RPM > 30 && RPM <= 40)
  {
    graph[nextGraphIndex] = 6;
  }
  else if (RPM > 40)
  {
    graph[nextGraphIndex] = 8;
  }

  nextGraphIndex++;
  if (nextGraphIndex > 65)
  {
    nextGraphIndex = 0;
  }

  for (int i = 0; i < 66; i++)
  {
    oledDisplay.drawLine((1 * i) * 2 + 1, 28, (1 * i * 2) + 1, 28 - graph[i], WHITE);
  }

  oledDisplay.display();
}

void Display::showSplashScreen()
{
  oledDisplay.clearDisplay();
  oledDisplay.drawBitmap(0, 0, splashScreen1, 128, 32, 1);
  oledDisplay.display();
  delay(1500);

  oledDisplay.clearDisplay();
  oledDisplay.drawBitmap(0, 0, splashScreen2, 128, 32, 1);
  oledDisplay.display();
  delay(1500);

  oledDisplay.clearDisplay();

  this->update(0.0);
}