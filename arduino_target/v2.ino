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
float lnTime = 0;

void setup(void) {
  pinMode(IRSensorPin, INPUT);

  Serial.begin(9600);

  endTime = 0;
  Timer1.initialize(1000000);  // Set the timer to 60 rpm, 1,000,000 microseconds (1 second)
  Timer1.attachInterrupt(timerIsr);  // Attach the service routine here
}

// ---------------------------------------------------------------
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
        calculateRPM(); // Real RPM from sensor
      }
    }
  }
  lastInputState = currentSwitchState;
}

// ---------------------------------------------------------------
void calculateRPM() {
  startTime = lastDebounceTime;
  lnTime = startTime - endTime;
  RPM = (60000 / (lnTime)) / 24.0; // 24 dark bars on BG4002
  endTime = startTime;
}

void timerIsr()
{
  time = millis() / 1000;
  Serial.println(RPM);
  delay(500);

  RPM = 0.0;
}
