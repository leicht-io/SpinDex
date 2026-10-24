# PlatformIO custom target: `pio run -t webbundle`.
#
# Builds the firmware, then copies what a PlatformIO upload would flash --
# bootloader, partition table, boot_app0 and the app, at the same offsets
# and with the same flash settings -- into $SPINDEX_FIRMWARE_DIR, with a
# manifest.json describing them. The web app's firmware updater flashes
# exactly that over USB. The Release workflow (.github/workflows/
# release.yml) runs this for each release, and web-app/scripts/
# bundle-firmware.mjs puts the releases into the web app's build (or, with
# --local, runs this on the working copy).

import hashlib
import json
import os
import shutil

Import("env")  # noqa: F821 -- provided by PlatformIO's SCons environment

# What esptool-js can write into an ESP32-S3 image header. It takes other
# frequencies too, but silently encodes them wrong.
FLASH_MODES = ("dio", "qio", "dout", "qout")
FLASH_FREQS = ("80m", "40m", "20m")
FLASH_SIZES = ("1MB", "2MB", "4MB", "8MB", "16MB", "32MB")


def uploader_flag(name, allowed):
    flags = [env.subst(flag) for flag in env.get("UPLOADERFLAGS", [])]  # noqa: F821
    if name not in flags:
        raise SystemExit("webbundle: %s isn't among the upload flags" % name)
    value = flags[flags.index(name) + 1]
    if value not in allowed:
        raise SystemExit("webbundle: %s %s isn't one the web app's updater can write" % (name, value))
    return value


def web_bundle(target, source, env):
    out_dir = os.environ.get("SPINDEX_FIRMWARE_DIR")
    if not out_dir:
        raise SystemExit("webbundle: set SPINDEX_FIRMWARE_DIR to the folder to write the bundle to")
    version = env.get("SPINDEX_FIRMWARE_VERSION")
    if not version:
        raise SystemExit("webbundle: no firmware version (is web-app/package.json next to controller-source?)")
    os.makedirs(out_dir, exist_ok=True)

    images = [(offset, env.subst(path)) for offset, path in env.get("FLASH_EXTRA_IMAGES", [])]
    images.append((env.subst("$ESP32_APP_OFFSET"), env.subst("$BUILD_DIR/${PROGNAME}.bin")))

    manifest_images = []
    for offset, path in images:
        name = os.path.basename(path)
        with open(path, "rb") as file:
            data = file.read()
        shutil.copyfile(path, os.path.join(out_dir, name))
        # Size and hash let the app tell a damaged or stale download (or a
        # host answering a missing file with its index page) from the image.
        manifest_images.append({
            "file": name,
            "offset": int(offset, 16),
            "size": len(data),
            "sha256": hashlib.sha256(data).hexdigest(),
        })

    manifest = {
        "version": version,
        "flashMode": uploader_flag("--flash_mode", FLASH_MODES),
        "flashFreq": uploader_flag("--flash_freq", FLASH_FREQS),
        "flashSize": uploader_flag("--flash_size", FLASH_SIZES),
        "images": manifest_images,
    }
    with open(os.path.join(out_dir, "manifest.json"), "w", encoding="utf-8") as file:
        json.dump(manifest, file, indent=2)
    print("Firmware %s bundled into %s" % (version, out_dir))


env.AddCustomTarget(  # noqa: F821
    name="webbundle",
    dependencies="$BUILD_DIR/${PROGNAME}.bin",
    actions=[web_bundle],
    title="Web bundle",
    description="Copy the flash images for the web app's firmware updater",
)
