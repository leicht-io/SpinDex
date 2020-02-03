#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <TimerOne.h>

const int IRSensorPin = 2;  // the number of the IR sensor input pin

int inputState;                          // the current state from the input pin
int lastInputState = LOW;        // the previous InputState from the input pin
long lastDebounceTime = 0;   // the last time the output pin was toggled
long debounceDelay = 5;        // the debounce time; increase if the output flickers
long time;
long endTime;
long startTime;
float RPM = 0.0;
float prevRPM = 0.0;
float lnTime = 0;
unsigned int graph[66];
unsigned int nextGraphIndex = 0;
unsigned long lastTime = millis();

// #define ONE_WIRE_BUS 4
// Setup a oneWire instance to communicate with any OneWire devices (not just Maxim/Dallas temperature ICs)
// OneWire oneWire(ONE_WIRE_BUS);
// Pass our oneWire reference to Dallas Temperature.
// DallasTemperature sensors(&oneWire);

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32

#define OLED_RESET 4 // Reset pin # (or -1 if sharing Arduino reset pin) // Declaration for an SSD1306 display connected to I2C (SDA, SCL pins)
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);

static const unsigned char PROGMEM logo_bmp[] = {
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x03, 0xbc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x1d, 0xbd, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x3d, 0xfd, 0xe8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x01, 0xfd, 0xff, 0xfc, 0x00, 0x00, 0x00, 0x00, 0x00, 0x80, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x03, 0xff, 0xfb, 0xfc, 0x00, 0x3e, 0x1f, 0x18, 0x18, 0x87, 0xc6, 0x60, 0x70, 0x02, 0x00, 0x00,
  0x05, 0xfe, 0xfb, 0x7b, 0x00, 0x33, 0x11, 0x3c, 0x38, 0x8c, 0x66, 0x70, 0x70, 0x02, 0x00, 0x00,
  0x0e, 0xf6, 0xfb, 0xf7, 0xc0, 0x31, 0x11, 0xbc, 0x38, 0x98, 0x26, 0x70, 0xf0, 0xc7, 0x86, 0x04,
  0x1f, 0xfa, 0xfe, 0xef, 0x80, 0x31, 0x11, 0xbc, 0x28, 0x10, 0x30, 0x58, 0xb3, 0xe7, 0xdf, 0x3e,
  0x27, 0xdf, 0x25, 0xde, 0x60, 0x3f, 0x13, 0x36, 0x68, 0x10, 0x30, 0x58, 0xb2, 0x33, 0x31, 0x30,
  0x3d, 0xfd, 0x25, 0xf9, 0xe0, 0x3e, 0x1e, 0x36, 0x48, 0x10, 0x30, 0x49, 0xb3, 0xf2, 0x3f, 0xb0,
  0x7e, 0x7a, 0xfa, 0xe7, 0xf0, 0x33, 0x18, 0x32, 0xc8, 0x10, 0x20, 0x4d, 0x33, 0xf2, 0x3f, 0x30,
  0x1f, 0xcf, 0xff, 0x9f, 0x00, 0x31, 0x10, 0x33, 0xc8, 0x18, 0x60, 0x4f, 0x32, 0x02, 0x30, 0x30,
  0x60, 0xf7, 0xff, 0x70, 0xf0, 0x31, 0x90, 0x31, 0x88, 0x0c, 0xe0, 0x46, 0x33, 0x03, 0x10, 0x30,
  0x7f, 0x07, 0xff, 0x0f, 0xf0, 0x31, 0x90, 0x31, 0x88, 0x07, 0x80, 0x46, 0x31, 0xf3, 0x9f, 0x30,
  0x7f, 0xff, 0xff, 0xff, 0xe0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x07, 0x8f, 0x80, 0x20, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x7f, 0xf7, 0xff, 0x1f, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x7f, 0x0f, 0xff, 0xe1, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x70, 0xf7, 0xff, 0x3f, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x0f, 0x99, 0xfe, 0xe7, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x3f, 0x7e, 0x65, 0x7b, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x3c, 0xed, 0x65, 0xde, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x06, 0x08, 0x00, 0x80,
  0x03, 0xdf, 0x7a, 0xef, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x00, 0x0c, 0x20, 0x00,
  0x0f, 0xbb, 0xfb, 0x77, 0xc0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x76, 0xff, 0x78, 0x9e,
  0x0f, 0x7e, 0xeb, 0x7b, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x96, 0x8d, 0xa0, 0xb2,
  0x01, 0xfe, 0xfd, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0x86, 0x88, 0xa0, 0xb2,
  0x00, 0xdf, 0xfd, 0xec, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x02, 0xf6, 0xe8, 0xba, 0x9c,
  0x00, 0x3d, 0xfd, 0xf0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x0d, 0xfe, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0xf8, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
};


//   
static const unsigned char PROGMEM thumbsUp[] = {0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0xc0, 0x00, 0x07, 0xc0, 0x00, 0x0f, 0x00, 0x30,0x3e, 0x00, 0x78, 0x7c, 0x00, 0x3f, 0xf0, 0x00, 0x1f, 0xe0, 0x00, 0x07, 0x80, 0x00, 0x03, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};

// 
static const unsigned char PROGMEM thumbsDown[] = {0x00, 0x00, 0x00, 0x38, 0x03, 0x80, 0x7e, 0x0f, 0xc0, 0x3f, 0x1f, 0x80, 0x0f, 0xfe, 0x00, 0x07,0xfc, 0x00, 0x03, 0xf8, 0x00, 0x07, 0xfc, 0x00, 0x0f, 0xfe, 0x00, 0x3f, 0x1f, 0x80, 0x7c, 0x07,0xc0, 0x38, 0x03, 0x80, 0x00, 0x00, 0x00};

void setup(void) {
  pinMode(IRSensorPin, INPUT);

  Serial.begin(38400);

  initializeTimer1();

  initializeDisplay();

//  sensors.begin();
}

void loop(void) {
  time = millis();
  int currentSwitchState = digitalRead(IRSensorPin);

  if (currentSwitchState != lastInputState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > debounceDelay) {
    if (currentSwitchState != inputState) {
      inputState = currentSwitchState;
      if (inputState == LOW) {
        calculateRPM();
      }
    }
  }
  lastInputState = currentSwitchState;

  if (millis() > lastTime + 1000) {
    updateScreen(RPM);
    sendData("speed", RPM);
    // sensors.requestTemperatures();
    //sendData("temperature", sensors.getTempCByIndex(0));

    lastTime = millis();
  }
}

void initializeTimer1() {
  endTime = 0;

  Timer1.initialize(1000000);
  Timer1.attachInterrupt(timerIsr);
}

String zeroPad(double RPM) {
  String RPMToReturn = String(RPM);

  if (RPMToReturn.length() == 4) {
    int indexOfSeparator = RPMToReturn.indexOf(".");
    if (indexOfSeparator == 1) {
      return "0" + RPMToReturn;
    } else if (indexOfSeparator == 2) {
      return RPMToReturn + "0";
    }
  }

  return RPMToReturn;
}

void updateScreen(float RPM) {
    display.clearDisplay();
  
    display.setTextSize(2);
    display.setCursor(2, 2);
    display.setTextColor(WHITE);
    display.println(RPM);
     
    display.setTextSize(1);
    display.setCursor(65, 2);
    display.println("RPM");
    

  display.drawLine(0 , 18, 128, 18, WHITE);
  display.drawLine(90 , 2, 90, 15, WHITE);

  if(RPM > 33 && RPM < 33.5) {
    display.drawBitmap(100,3,thumbsUp, 19, 13, 1);
    } else {
    display.drawBitmap(100,3,thumbsDown, 19, 13, 1);
    }

  if(RPM <= 10) {
    graph[nextGraphIndex] = 1;
    } else if(RPM > 10  && RPM <= 20) {
    graph[nextGraphIndex] = 2;
    } else if(RPM > 20 && RPM <= 30){
    graph[nextGraphIndex] = 4;
    } else if(RPM > 30 && RPM <= 40) {
    graph[nextGraphIndex] = 6;
    }else if(RPM > 40) {
    graph[nextGraphIndex] = 8;
    }

    nextGraphIndex++;
    if(nextGraphIndex > 67) {
    nextGraphIndex = 0;
    }

    for(int i = 0; i < 66; i++) {
    display.drawLine((1 * i) * 2 + 1, 28, (1 * i * 2) + 1,  28 - graph[i], WHITE);
    }

    display.display();
}

void initializeDisplay() {
  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) { // Address 0x3C for 128x32, SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
    Serial.println(F("SSD1306 allocation failed"));
    for (;;); // Don't proceed, loop forever
  }

   display.clearDisplay();
   display.drawBitmap(0, 0, logo_bmp, 128, 32, 1);
   display.display();
   delay(5000);

   display.clearDisplay();
  updateScreen(0.0);
}

void calculateRPM() {
  startTime = lastDebounceTime;
  lnTime = startTime - endTime;
  RPM = (60000 / (lnTime)) / 24.0; // 24 dark bars on BG4002



  prevRPM = RPM;

  endTime = startTime;
}

void sendData(String name, float value) {
  // Serial.println("{\"" + name + "\": "+ String(value) + " }");
  Serial.print(value, 3);
  Serial.print("\n");
}

void timerIsr() {
  time = millis() / 1000;
  

  // delay(500);

  // RPM = 0.0;
}
