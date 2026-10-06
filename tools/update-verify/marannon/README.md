# Overview

Marannon is a tool for verifying the integrity of [MAR files](https://wiki.mozilla.org/Software_Update:MAR).

# How it Works

In order to be considered valid, a MAR file must bring a user on an existing version of an application to the an equivalent state that the installer for the same version is in. This helps ensure that the new install will function, and that future updates will succeed.

This is accomplished by:
1. Unpacking an installer from an older application version (the *from* build) and a newer application version (the *to* build).
2. Running the updater from the *from* build to apply a MAR file on top of it.
3. Diffing the state of *from* build (which should now be the same version as the *to* build) against the unpacked *to* build.
4. Analyzing the diff for any noteworthy differences.

The details of how builds are unpacked, how the updater is run, and how differences are analyzed differ between platforms, but the basic operation is the same.

# Allowable Differences

A MAR file need not (and typically does not) update every single file on an install, and thus will contain some expected differences. In typical use cases we expect that files related to the configuration of the updater (`channel-prefs.js` and `update-settings.ini`) may differ between the updated *from* build and the unpacked *to* build.

# Etymology
Like some other update-related tools and systems, its name derives from J.R.R. Tolkein's legendarium and is a combination of MAR (Mozilla ARchive) and [the Sindarin word *annon*](https://tolkiengateway.net/wiki/Annon), meaning gate or door. Roughly translated, it means "MAR gateway", ie: something through which MAR files must pass before shipping.
