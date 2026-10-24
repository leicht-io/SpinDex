#pragma once

// Reported to the web app on connecting: over Bluetooth as the Device
// Information Service's Firmware Revision String, over USB as a
// `version:` line (see SerialComm).
//
// It's the web app's version, set at build time from web-app/package.json
// by scripts/firmware_version.py -- so bump that, not anything here.
#ifndef FIRMWARE_VERSION
#error "FIRMWARE_VERSION is unset: build with PlatformIO, whose scripts/firmware_version.py sets it"
#endif
