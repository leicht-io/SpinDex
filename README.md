# astraeus (WIP)
Astraeus is a small RPM measurement tool mainly made for the Beogram 4000 series as a proof of concept.
The main focus is to verify that the turntable is restored correctly and maintains the correct speed over a longer period.
It is currently written to run on the Arduino Nano but could easily be ported to other microcontrollers, architectures and footprints.

![alt text](https://ni.leicht.io/updates-to-beotac-a256b3fc-64fd-464c-9166-10d07f8a27e8.jpg)

This mono repository is divided into multiple sub-repositories explained below:


### 3D Files (3d-files):
The model consists of three models:
- astreaus_body_v1.stl
- astreaus_bottom_v1.stl
- astreaus_led_v1.stl

![alt text](https://github.com/leicht-io/astraeus/blob/master/3d-files/rendering_1.png?raw=true)


I usually print them in black PLA.

---

### Desktop App (desktop-app)
A multi-platform desktop client made with Electron receives the output from the controller and shows a temporal line graph with the results. Still needs finetuning.

![alt text](https://github.com/leicht-io/astraeus/blob/master/documentation/images/desktop-screenshot.png?raw=true)

Note: On Ubuntu-based OS you might need to remove brltty: *sudo apt remove brltty*

---

### Android App (android-app)
Android application with bluetooth support. (WIP, needs new controller with support for BLE).

---

### µController Source Code (controller-source)
Source code for the microcontroller.
Setup for CLion and PlatformIO:
https://docs.platformio.org/en/latest/core/installation/shell-commands.html#piocore-install-shell-commands

---

### Documentation (documentation)
TO BE RELEASED. Circuit diagrams showing how the screen and IR sensor are attached.

---

Please note that this is a proof of concept and the following is missing for it to be considered finished:

- tests
- refactoring the codebase
- schematics

The following features would be needed or to have in the future:
- ESP32-C3 (for BLE and WiFi support) (https://gist.github.com/sekcompsci/2bf39e715d5fe47579fa184fa819f421)
- bigger screen.
- support for other turntables.
- headless edition with battery, Bluetooth and mobile application.
- custom-made PCB.

Feel free to develop further on the project and create PRs if, necessary. I would be happy to cooperate with others on the device.

Blog posts with more pictures:

- https://leicht.io/articles/beotac-a-tachometer-for-the-beogram-4000-series

- https://leicht.io/articles/updates-to-beotac
