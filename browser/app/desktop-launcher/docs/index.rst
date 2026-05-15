=====================
Desktop Launcher app
=====================

A substantial number of users will upgrade to Windows 11 in a way that leaves no trace of Firefox on their device. To address these cases we will leave
an install entry point in their personal files, which will migrate at a higher rate than the app itself. In particular, files in the Desktop folder are
backed up by OneDrive and other cloud storage products, and likely to find their way back onto a new device.

This app acts as a replacement for the desktop shortcut to Firefox.

When Firefox is installed on the user's machine, when the user launches this app, it finds the path to Firefox in the appropriate Windows Registry keys
and attempts to launch Firefox from that path.

When there is no Firefox installation found, this app will attempt to download and run the Firefox "stub" installer.

As a final fallback, this app will open the Firefox download URL in the default browser.


What controls whether or not Desktop Launcher is installed?
===========================================================

At installation time:

- What kind of installer is this?
    - Stub: install the launcher, do not install shortcuts
    - Full: Let the user decide whether to get launcher, shortcuts, both, or neither. (Currently the full installer can only select to install the launcher
        using a command-line parameter. Eventually, there will be UI in the full installer. Work tracked by https://bugzilla.mozilla.org/show_bug.cgi?id=1981597)
    - Other (MSI, MSIX, zip): install shortcuts

At update time:
    - YES: Does this user already have the launcher installed?
        - YES: Then update it with the new version.
        - NO: Is this a stub-installed package? (This is stored in `installation_telemetry.json`, see e.g. [BrowserUsageTelemetry.sys.mjs](https://searchfox.org/firefox-main/rev/cd6acbe9eaa55fb4da4fbdec275db6eddd4833b8/browser/modules/BrowserUsageTelemetry.sys.mjs#1875-1904))
            - NO: Do nothing
                - NO: Did we already install the launcher for the user?
                    - YES: Don't install. This is how we avoid re-installing the launcher after a user has removed it.
                    - NO: Does the user have a desktop shortcut that points to Firefox, either in their own Desktop or the public Desktop?
                        - YES: Remove the shortcut and install the launcher into the user's Desktop folder.
                        - NO: Do nothing



In elevated installer, we will delete the public shortcut and record the event if:
    - It exists
    - We haven't deleted it before
    - This is a stub installed Firefox

In the unelevated installer, we will delete the user shortcut and record the event if:
    - There is a user shortcut (i.e. this is a personal install)
    - We haven't deleted it before
    - This is a stub installed Firefox

In the unelevated installer, we will install the desktop launcher and record the event if:
    - It is already installed OR
        - It wasn't previously installed
        - There is or was a shortcut (shared or personal)
        - The installation type is "stub"



FAQ
===

Q: I don't like the Desktop Launcher. How can I get rid of it?

A: Delete it from your Desktop folder. It won't be reinstalled by updates, even if you create a new Firefox shortcut there. (We remember that it was previously installed using a Windows registry key.)
