# SpinDex
SpinDex is a small RPM measurement tool for the Beogram 4000 series.
The main focus is to verify that the turntable is restored correctly and maintains the correct speed over an extended period.
The code is written to run on the ESP-S3-WROOM-U but could easily be ported to other microcontrollers and architectures.

![alt text](https://ni.leicht.io/updates-to-beotac-a256b3fc-64fd-464c-9166-10d07f8a27e8.jpg)

This mono repository is divided into multiple sub-repositories, explained below:


### 3D Files (3d-files):
This folder contains all the 3D models. There are two models.
- spindex_body_v1.stl
- spindex_bottom_v1.stl

![alt text](https://github.com/leicht-io/astraeus/blob/master/3d-files/rendering_1.png?raw=true)

---

### Web App (web-app)
This folder contains the web app. The web app receives the controller's output via Bluetooth and shows a temporal line graph with the results. It is hosted right here: https://spindex.leicht.io/

![alt text](https://github.com/leicht-io/astraeus/blob/master/documentation/images/desktop-screenshot.png?raw=true)

---

### µController Source Code (controller-source)
This folder contains the source code for the microcontroller.

---

### Documentation (documentation)
This folder contains the schematics and diagrams for the microcontroller PCB.

---

Please note that this project is in progress and prone to change. The following tasks needs to be implemented before i consider the SpinDex finished.

- tests
- schematics
- custom-made PCB.

Feel free to develop further on the project and create PRs if, necessary. I would be happy to cooperate with others on the device.

Blog posts with more pictures:

- https://leicht.io/articles/beotac-a-tachometer-for-the-beogram-4000-series
- https://leicht.io/articles/updates-to-beotac
