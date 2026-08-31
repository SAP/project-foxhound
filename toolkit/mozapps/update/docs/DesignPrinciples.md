# Application Update Design Principles

This page lays out the principles behind the design of Application Update. These
should be kept in mind when planning future development in this component.

## Bulletproof

The updater is intended to be bulletproof, meaning that it should run
successfully even in the face of the failure of arbitrary components. This is
important because, in the case of browser breakages, update is how we would fix
the problem.

## Malware Resistance

It is not uncommon for malware to want to tamper with the browser in various
ways. It may seek to prevent the user from downloading tools to remove the
malware. It may attempt to inject ads or scams into websites or the browser
itself. We, obviously, would like to be able to defend against this. But, for us
to reach affected users, we need to be able to update. Malware authors know this
and often try to prevent the browser from updating.

Once the malware has administrator privileges, the game is lost. With these
privileges, it can freely read and modify memory used by Firefox. It can rewrite
the Firefox binary with whatever they want. There is no protecting against
malware that has already made it through the
[airtight hatchway](https://devblogs.microsoft.com/oldnewthing/20240102-00/?p=109217).
But we try to be sure that low-privileged malware is unable to prevent update.

This design principle is the primary reason why we do not allow update to be
fully disabled from within the browser. This setting must be changed via
[Policy](https://mozilla.github.io/policy-templates/#disableappupdate), which
is not writable from low-privileged processes like Firefox.

## No Third-Party Updates or Update Components

We allow for a certain amount of control of update, generally intended for use
by enterprise. This includes specifying an update server other than the default
one. But we very intentionally do not allow updates to be installed unless they
are signed by Mozilla. To allow updates from other sources would, at best,
violate the user's expectations and, at worst, allow for Firefox to be silently
replaced with malware. Since users tend to trust Firefox with data as sensitive
as their banking credentials, this could have devastating consequences.

The Windows security model generally requires an elevation of permissions for
programs such as the Firefox updater to write to the default application
directory. To make this less obtrusive for our users, we provide the Mozilla
Maintenance Service to effectively allow the user to grant the updater
persistent access to this elevation without further user action. But silently
providing access to elevation is inherently dangerous. We need to make sure that
we don't elevate something that we did not intend. To prevent this, the
Maintenance Service must only run an executable that is both properly signed by
Mozilla and identified as the updater binary.
