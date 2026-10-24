#pragma once

// Reported to the web app on connecting: over Bluetooth as the Device
// Information Service's Firmware Revision String, over USB as a
// `version:` line (see SerialComm).
//
// It's the web app's version, set at build time from web-app/package.json
// by scripts/firmware_version.py -- so bump that, not anything here. A
// build without it (another build tool, or no web-app/ next to this
// folder) says so instead of claiming a version.
#ifndef FIRMWARE_VERSION
#define FIRMWARE_VERSION "unversioned"
#endif
