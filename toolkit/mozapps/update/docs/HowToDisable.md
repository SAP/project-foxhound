# Disabling Automatic Update

Many users do not want Application Update to run automatically. This page
describes different ways to accomplish this.

## Update Only With User Permission

This is the only option that can be activated from within Firefox. With this
mechanism, Firefox checks for updates as it normally would. When it finds one, a
notification is shown letting the user know that an update is available and
requesting permission to download and install it. When this is accepted, the
process continues as it would in automatic application update: the download is
started, and then installed the next time Firefox restarts. If the user doesn't
do this on their own within a update-channel-dependent time frame, a
notification will be shown prompting the user to restart to update.

To use this mechanism:

1. Navigate the browser to `about:preferences` or click on "Settings" in the
   hamburger menu.
2. Find the Update section. This can be done by searching for "Update".
3. Select the option "Check for updates but let you choose to install them".

## Pin Firefox's version

This option is intended for managed enterprise installations that want to keep
Firefox at a particular version on many machines. At some point, generally after
testing the new Firefox version for compatibility with needed resources,
installations of Firefox on all machines should be updated. This can be done by
setting a pin to the version needed. Then, once prepared for the update, the
pin can be changed to the new version. Note that pins cannot be used to
downgrade Firefox.

Since this option can prevent updates from being installed without specific,
unprompted user action, it cannot be changed from within the browser for
[security reasons](DesignPrinciples.md#malware-resistance).

To activate this feature, see the instructions on how to use Policies,
[here](https://mozilla.github.io/policy-templates/), as well as the specific
Policy, [here](https://mozilla.github.io/policy-templates/#appupdatepin).

## Manual Updates Only

This option disables automatic update checking except when the user loads the
update UI. It will not prompt the user to update. Updates can only be installed
by clicking the button in the update UI, which can be found in the Update
section of `about:preferences` or in the Help->About dialog.

Since this option can prevent updates from being installed without specific,
unprompted user action, it cannot be changed from within the browser for
[security reasons](DesignPrinciples.md#malware-resistance).

To activate this feature, see the instructions on how to use Policies,
[here](https://mozilla.github.io/policy-templates/), as well as the specific
Policy, [here](https://mozilla.github.io/policy-templates/#manualappupdateonly).

## Fully Disable Updates

This option disables the update system altogether, preventing Firefox from being
able to update. Neither automatic update nor manual update will function.

Since this option can prevent updates from being installed without specific,
unprompted user action, it cannot be changed from within the browser for
[security reasons](DesignPrinciples.md#malware-resistance).

To activate this feature, see the instructions on how to use Policies,
[here](https://mozilla.github.io/policy-templates/), as well as the specific
Policy, [here](https://mozilla.github.io/policy-templates/#disableappupdate).
