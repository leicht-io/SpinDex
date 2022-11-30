# astraeus
astraeus is a small RPM measurement tool mainly made for the Beogram 4000 series as a proof of concept.
The main focus is to verify that the turntable is restored correctly and maintains the correct speed over a longer period of time.
It is currently written to run on the Arduino Nano but could easily be ported to other microcontrollers, architectures and footprints.

![alt text](https://ni.leicht.io/updates-to-beotac-a256b3fc-64fd-464c-9166-10d07f8a27e8.jpg)

This mono repository is divided into multiple sub repositories explained below:


### 3D Files (3d-files):
TO BE RELEASED. I am finetuning the 3D drawings and will make them available later this year.

---

### Desktop App (desktop-app)
A desktop client made with Electron receives the output from the controller and shows a temporal line graph with the results. Still needs filetuning.

Note: On Ubuntu based OS you might need to remove brltty: sudo apt remove brltty
---

### µController Source Code (controller-source) 
Source code for the microcontroller. 

---

### Documentation (documentation)
TO BE RELEASED. Circuit diagrams showing how the screen and IR sensor is attached.

---

Please note that this is a proof of concept and the following is missing for it to be considered finished:

- tests
- refactoring the codebase
- schematics

The following features would be nice to have in the future:
- bigger screen.
- support for other turntables.
- headless edition with battery, Bluetooth and mobile app.
- custom-made PCB.

Feel free to develop further on the project and create PRs if, necessary. I would be happy to cooperate with others on the device.

Blog posts with more pictures:

- https://leicht.io/articles/beotac-a-tachometer-for-the-beogram-4000-series

- https://leicht.io/articles/updates-to-beotac
