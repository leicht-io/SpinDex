# PlatformIO post-upload hook (Linux only).
#
# esptool and PlatformIO's other serial tools (all pyserial) leave the port
# with VMIN=0, and Linux keeps that termios setting for the next program to
# open /dev/ttyACM* -- even across the board re-enumerating. Chrome versions
# before Chromium's 2026-09 fix ("serial: Set VMIN/VTIME explicitly...")
# inherit it, read 0 bytes whenever no data is waiting, and report that as
# the device being lost: the web app then can't connect after a flash. This
# puts VMIN back to 1 once the board's port is back.
#
# `pio device monitor` leaves the same setting behind on exit; there's no
# hook for that, so run `stty -F /dev/ttyACM0 min 1` by hand afterwards.

import os
import sys
import time

Import("env")  # noqa: F821 -- provided by PlatformIO's SCons environment


def restore_tty(source, target, env):
    if not sys.platform.startswith("linux"):
        return

    import termios

    port = env.subst("$UPLOAD_PORT")
    if not port:
        return

    # The board reboots into the new firmware after flashing, so its port
    # can be briefly gone -- or still openable but failing as it goes away.
    # Keep trying until it holds.
    deadline = time.time() + 10
    last_error = None
    while time.time() < deadline:
        try:
            fd = os.open(port, os.O_RDWR | os.O_NOCTTY | os.O_NONBLOCK)
        except OSError as error:
            last_error = error
            time.sleep(0.25)
            continue
        try:
            attrs = termios.tcgetattr(fd)
            attrs[6][termios.VMIN] = 1
            attrs[6][termios.VTIME] = 0
            termios.tcsetattr(fd, termios.TCSANOW, attrs)
        except (OSError, termios.error) as error:
            last_error = error
            time.sleep(0.25)
            continue
        finally:
            os.close(fd)
        print("Reset %s to VMIN=1 so Chrome's Web Serial can read it" % port)
        return

    print("Couldn't reset %s (%s): run `stty -F %s min 1` before connecting from Chrome" % (port, last_error, port))


env.AddPostAction("upload", restore_tty)  # noqa: F821
