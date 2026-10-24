# PlatformIO build hook (a post: script, which runs before compiling but is
# the only kind that can reach projenv).
#
# The firmware has no version of its own: it reports the web app's, read
# from web-app/package.json (which changelog.test.ts keeps equal to the
# newest changelog entry). A release bumps one number, and the sensor and
# the app it shipped with always say the same thing. Without the web app
# next to it, the build goes ahead with src/Version.h's fallback; a version
# the app wouldn't accept fails it.

import json
import os
import re

Import("env", "projenv")  # noqa: F821 -- provided by PlatformIO's SCons environment

# What the web app accepts from the sensor (core/link/firmwareVersion.ts).
VERSION_PATTERN = re.compile(r"[0-9A-Za-z][0-9A-Za-z.+-]{0,31}")

package_json = os.path.join(env.subst("$PROJECT_DIR"), os.pardir, "web-app", "package.json")  # noqa: F821
try:
    with open(package_json, encoding="utf-8") as file:
        version = json.load(file)["version"]
except OSError as error:
    print("Warning: no web app version (%s), so the firmware reports itself as unversioned" % error)
    version = None
except (ValueError, KeyError) as error:
    raise SystemExit("Can't read the firmware version from %s: %s" % (package_json, error))

if version is not None:
    # fullmatch: a $ anchor would also let a trailing newline through.
    if not isinstance(version, str) or not VERSION_PATTERN.fullmatch(version):
        raise SystemExit("%s has version %r, which the web app wouldn't accept from the sensor" % (package_json, version))

    # Only the project's own sources need it. On `env` it would reach the
    # Arduino core and libraries too, recompiling all of them on every bump.
    projenv.Append(CPPDEFINES=[("FIRMWARE_VERSION", env.StringifyMacro(version))])  # noqa: F821
    print("Firmware version %s (from web-app/package.json)" % version)
