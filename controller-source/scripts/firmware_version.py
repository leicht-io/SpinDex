# PlatformIO pre-build hook.
#
# The firmware has no version of its own: it reports the web app's, read
# from web-app/package.json (which changelog.test.ts keeps equal to the
# newest changelog entry). A release bumps one number, and the sensor and
# the app it shipped with always say the same thing. See src/Version.h.

import json
import os
import re

Import("env")  # noqa: F821 -- provided by PlatformIO's SCons environment

# What the web app accepts from the sensor (core/link/firmwareVersion.ts).
VERSION_PATTERN = re.compile(r"^[0-9A-Za-z][0-9A-Za-z.+-]{0,31}$")

package_json = os.path.join(env.subst("$PROJECT_DIR"), os.pardir, "web-app", "package.json")  # noqa: F821
try:
    with open(package_json, encoding="utf-8") as file:
        version = json.load(file)["version"]
except (OSError, ValueError, KeyError) as error:
    raise SystemExit("Can't read the firmware version from %s: %s" % (package_json, error))

if not isinstance(version, str) or not VERSION_PATTERN.match(version):
    raise SystemExit("%s has version %r, which the web app wouldn't accept from the sensor" % (package_json, version))

env.Append(CPPDEFINES=[("FIRMWARE_VERSION", env.StringifyMacro(version))])  # noqa: F821
print("Firmware version %s (from web-app/package.json)" % version)
