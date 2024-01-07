#include <Arduino.h>
#include "Bluetooth.h"
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID                    "8abb038d-5a8d-4d29-ae05-0c1fd42583ab"
#define CHARACTERISTIC_UUID             "ea53154b-9815-4143-b717-d4e1de9f6cca"

BLEServer* bleServer = NULL;
BLECharacteristic* sensorCharacteristic = NULL;
bool deviceConnected = false;
bool oldDeviceConnected = false;

class ServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* server) {
      deviceConnected = true;
    };

    void onDisconnect(BLEServer* server) {
      deviceConnected = false;
    }
};

class CharacteristicCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic* ledCharacteristic) {
        std::string value = ledCharacteristic->getValue();
        if (value.length() > 0) {
            Serial.print("Characteristic event, written: ");
            Serial.println(static_cast<int>(value[0]));
        }
    }
};

void Bluetooth::init() {
    BLEDevice::init("SpinDex");

    // Creating the BLE Server
    bleServer = BLEDevice::createServer();
    bleServer->setCallbacks(new ServerCallbacks());

    // Create the BLE Service
    BLEService *bleService = bleServer->createService(SERVICE_UUID);

    // Create a BLE Characteristic
    sensorCharacteristic = bleService->createCharacteristic(
                        CHARACTERISTIC_UUID,
                        BLECharacteristic::PROPERTY_READ   |
                        BLECharacteristic::PROPERTY_WRITE  |
                        BLECharacteristic::PROPERTY_NOTIFY |
                        BLECharacteristic::PROPERTY_INDICATE
                        );


    // Create a BLE Descriptor
    sensorCharacteristic->addDescriptor(new BLE2902());

    // Start the service
    bleService->start();

    // Start advertising
    BLEAdvertising *bleAdvertising = BLEDevice::getAdvertising();
    bleAdvertising->addServiceUUID(SERVICE_UUID);
    bleAdvertising->setScanResponse(true);
    bleAdvertising->setMinPreferred(0x06);  // functions that help with iPhone connections issue
    bleAdvertising->setMinPreferred(0x12);
    BLEDevice::startAdvertising();

    Serial.println("Waiting a client connection to notify...");
}

void Bluetooth::sendValue(double RPM) {
    sensorCharacteristic->setValue(String(RPM).c_str());
    sensorCharacteristic->notify();

    delay(20);
}

void Bluetooth::checkConnection() {
     // disconnecting
    if (!deviceConnected && oldDeviceConnected) {
        Serial.println("Device disconnected.");
        delay(500); // give the bluetooth stack the chance to get things ready.
        bleServer->startAdvertising(); // restart advertising
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