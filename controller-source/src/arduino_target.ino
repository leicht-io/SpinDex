#include "data/Display.h"
#include "data/SerialComm.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

BLEServer* pServer = NULL;
BLECharacteristic* pSensorCharacteristic = NULL;
BLECharacteristic* pLedCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;
uint32_t value = 0;

#define SERVICE_UUID                    "19b10000-e8f2-537e-4f6c-d104768a1214"
#define SENSOR_CHARACTERISTIC_UUID      "19b10001-e8f2-537e-4f6c-d104768a1214"
#define LED_CHARACTERISTIC_UUID         "19b10002-e8f2-537e-4f6c-d104768a1214"

const long baudRate = 115200;
const byte irSensorPin = 14;
byte previousIrSensorState = LOW;
byte count = 0;

unsigned long currentTime = millis();
unsigned long now = millis();
unsigned long timeDiff = millis();

double lastRPM = 0.0;

TaskHandle_t updateDisplayTask;
TaskHandle_t mainLoopTask;

byte steps = 24; // 24 dark bars on BG4000-series/59xx-series
double oneSecond = 60000.0;

Display display = Display();
SerialComm serialComm = SerialComm();

class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* pServer) {
      deviceConnected = false;
    }
};

class MyCharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* pLedCharacteristic) {
        std::string value = pLedCharacteristic->getValue();
        if (value.length() > 0) {
            Serial.print("Characteristic event, written: ");
            Serial.println(static_cast<int>(value[0])); // Print the integer value

            int receivedValue = static_cast<int>(value[0]);
        }
    }
};

// TODO: send 0 if no measured value.

void initialDevice() {
    Serial.begin(baudRate);

    display.initializeDisplay();

    BLEDevice::init("Astraeus");

  // Create the BLE Server
  pServer = BLEDevice::createServer();
  pServer->setCallbacks(new MyServerCallbacks());

  // Create the BLE Service
  BLEService *pService = pServer->createService(SERVICE_UUID);

  // Create a BLE Characteristic
  pSensorCharacteristic = pService->createCharacteristic(
                      SENSOR_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_READ   |
                      BLECharacteristic::PROPERTY_WRITE  |
                      BLECharacteristic::PROPERTY_NOTIFY |
                      BLECharacteristic::PROPERTY_INDICATE
                    );

  // Create the ON button Characteristic
  pLedCharacteristic = pService->createCharacteristic(
                      LED_CHARACTERISTIC_UUID,
                      BLECharacteristic::PROPERTY_WRITE
                    );

  // Register the callback for the ON button characteristic
  pLedCharacteristic->setCallbacks(new MyCharacteristicCallbacks());

  // https://www.bluetooth.com/specifications/gatt/viewer?attributeXmlFile=org.bluetooth.descriptor.gatt.client_characteristic_configuration.xml
  // Create a BLE Descriptor
  pSensorCharacteristic->addDescriptor(new BLE2902());
  pLedCharacteristic->addDescriptor(new BLE2902());

  // Start the service
  pService->start();

  // Start advertising
  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(false);
  pAdvertising->setMinPreferred(0x0);  // set value to 0x00 to not advertise this parameter
  BLEDevice::startAdvertising();
  Serial.println("Waiting a client connection to notify...");
}

void updateDisplayLoop(void *pvParameters) {
    for (;;) {
        // TODO: change display based on incoming commands.
        // TODO: Store in EEPROM.
        /* if (Serial.available()) { // if there is data coming
            String command = Serial.readStringUntil('\n'); // read string until newline character
            if (command == "?") {
            } else if (command == "?") {
            }
        } */

        serialComm.print(lastRPM);
        //SerialBT.println(lastRPM);
        display.update(lastRPM);
        display.updateTime();

          pSensorCharacteristic->setValue(String(lastRPM).c_str());
            pSensorCharacteristic->notify();

        delay(1000);
    }
}

void mainLoop(void *pvParameters) {
    for (;;) {

        int currentIrSensorState = digitalRead(irSensorPin);
        if (currentIrSensorState != previousIrSensorState) {
            previousIrSensorState = currentIrSensorState;

            if (currentIrSensorState == HIGH) {
                count++;
            }

            if (count == steps) {
                lastRPM = calculateRPM();
                resetStates();
            }
        }

        delay(1);
    }
}


void setup(void) {
    pinMode(13, OUTPUT);
    digitalWrite(13, HIGH);
    initialDevice();

    xTaskCreatePinnedToCore(mainLoop, "updateDisplayTask", 10000, NULL, 1, &updateDisplayTask, 0);
    xTaskCreatePinnedToCore(updateDisplayLoop, "mainLoopTask", 10000, NULL, 1, &mainLoopTask, 1);
}

void resetStates() {
    count = 0;
    now = 0;
    currentTime = millis();
}

double calculateRPM() {
    now = millis();

    timeDiff = now - currentTime;

    return oneSecond / timeDiff;
}

void loop() {
 // disconnecting
    if (!deviceConnected && oldDeviceConnected) {
        Serial.println("Device disconnected.");
        delay(500); // give the bluetooth stack the chance to get things ready
        pServer->startAdvertising(); // restart advertising
        Serial.println("Start advertising");
        oldDeviceConnected = deviceConnected;
    }
    // connecting
    if (deviceConnected && !oldDeviceConnected) {
        // do stuff here on connecting
        oldDeviceConnected = deviceConnected;
        Serial.println("Device Connected");
    }
}