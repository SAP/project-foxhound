# Application Update Concepts

This page lays out many of the fundamental concepts underlying the design of
Application Update.

## Staging

Update installation needs to happen when Firefox is not running. While running,
Firefox is still using those files and reacts poorly to having them swapped out
from underneath it. See
[Bug 1480452, Comment 8](https://bugzilla.mozilla.org/show_bug.cgi?id=1480452#c8)
for more details on this.

Applying updates can take some time. And since this happens at Firefox startup,
the user is likely watching and waiting. To mitigate this, we default to staging
updates. Staging involves doing most of the work of installing while Firefox is
still running. Basically, it copies the installation into a different directory
and updates the copy. Then, when Firefox is restarted, the updater does a
"Replace Request" and swaps the installation with the updated copy and then
deletes the original installation.

Staging can be disabled by setting `app.update.staging.enabled` to `false`.

## Update Directory

The update directory is where we put all update related files as well as some of
the update related preferences. On Windows and Linux, the update directory is
installation-specific. On macOS, the update directory is specific to both the
user and installation.

The path to the update directory can be found by navigating Firefox to
`about:support` and finding the entry called "Update folder". Alternately, it
can be looked up in the browser console using
`Services.dirsvc.get("UpdRootD", Ci.nsIFile).path`.

### Install and Uninstall Cleanup

When Firefox is uninstalled, we do our best to remove the files in the update
directory in order to properly clean up after our installation.

When someone performs a paveover install (installing Firefox without
uninstalling it first), we don't delete the entire update directory, as this
could cause settings to be lost. But we do delete any in-progress updates. This
is to prevent situations such as a user disabling automatic update, downgrading,
and then Firefox immediately installing an already-downloaded update.

## Elevation

Firefox is often installed into directories with permissions that prevent
regular, unprivileged processes from changing them. This means that Firefox may
require elevation in order to update. We have several operating system-specific
ways of dealing with this.

### Windows

When updating on Windows, we have two options for elevation, the
Mozilla Maintenance Service or a User Account Control (UAC) prompt. More details
on the Mozilla Maintenance Service can be found
[here](Implementation.md#mozilla-maintenance-service). If the Maintenance
Service is not available and elevation is needed to update, Firefox must show a
UAC prompt every time it updates.

### macOS

Details on macOS elevated update can be found [here](MacElevatedUpdate.md).

### Other

We do not currently have a method of elevating on other operating systems. We do
provide a Linux package repository that can be used by Linux package managers
which are better able to keep Linux installations up-to-date in a secure manner.
These are the most highly recommended ways of updating on Linux. More
information on using this method can be found
[here](https://support.mozilla.org/en-US/kb/install-firefox-linux).

## BITS

Windows has a component called the
[Background Intelligent Transfer Service](https://learn.microsoft.com/en-us/windows/win32/bits/background-intelligent-transfer-service-portal),
or BITS. This allows the operating system to download something for us. On
Windows, we use BITS by default for update downloads, allowing the updates to
continue downloading even after Firefox closes.

BITS has a number of limitations. We cannot easily connect to a BITS transfer
that was started by another user. We also cannot easily get it to use Firefox's
proxy configuration. When we detect these situations, BITS will not be used.

## Update Mutex and Update Sync Manager

The update mutex and the update sync manager are two similar but different
components.

Early in Firefox startup, we initialize the update sync manager. This
essentially involves taking a non-exclusive lock on an installation-specific
file. When other instances of Firefox launch, they take another non-exclusive
lock on the same file. At certain stages in the update process, we check to see
if other instances are running by briefly attempting to take an exclusive lock
on the file. If we are unable to take it, we know that other Firefox processes
must still be running and we introduce delays into the update process in an
attempt to mitigate
[Bug 1480452](https://bugzilla.mozilla.org/show_bug.cgi?id=1480452). This
behavior can be disabled with `app.update.checkOnlyInstance.enabled`. The delay
that we introduce into update can be changed by setting
`app.update.checkOnlyInstance.timeout` to the desired number of milliseconds to
delay for. Note that this timeout cannot be increased beyond 2 days.

The update mutex serves a different purpose. It is designed to keep two
instances of Firefox from running the update process at the same time,
interfering with each other. This is accomplished by taking the mutex during
update initialization. If the mutex cannot be obtained, we hold off on running
update until we obtain it. Firefox checks again to see if it can get it each
time it does an update check.

Note that the User Interfaces for Firefox update cannot be used unless the
current Firefox instance both has the mutex and is the only instance running.

## Update State

In theory, the Application Update Service is a state machine. However, there are
two state machines running in parallel: the state machine of the `update.status`
file and the in-memory state machine of the Update Service itself.

The `update.status` state machine is older and describes a number of states that
are effectively variations of other states (ex: `pending-service` is basically a
variation of `pending`):

- `null`: When there are no updates in-progress, the state file is deleted.
  `null` represents this state.
- `"downloading"`: An update download is in-progress.
- `"pending"`: There is an update ready to be installed or staged. If Firefox
  starts with this state the update will be installed. Whether the updater runs
  staging or does the full installation depends on what arguments are passed.
  This state has some implications for any elevation that may be needed to
  install the update, which vary depending on the operating system. On Windows,
  this state means that the Mozilla Maintenance Service may not be used. If
  Windows elevation is needed to install the update, our only option is to
  display a User Account Control (UAC) prompt. On macOS, this state means that
  we have permission to update, even if elevation is needed. Since we do not
  support elevating on Linux, this has no elevation-related implications there.
- `"pending-service"`: This state is relevant only on Windows. There is an
  update ready to be installed or staged, and the Mozilla Maintenance Service
  can be used to do this.
- `"pending-elevate"`: This state is relevant only on macOS. There is an update
  ready to be installed, but we are not going to install it yet. On the next
  Firefox launch, we will display a notification telling the user that elevation
  is needed to install this update. Once this notification has been accepted,
  the state will be changed to `"pending"`.
- `"applying"`: This state is only written by the updater binary, not Firefox,
  and indicates that it is currently staging or installing an update.
- `"applied"`: The update has been successfully staged and is ready to be
  installed. Note that this state does not grant permission to use the
  Mozilla Maintenance Service.
- `"applied-service"`: The update has been successfully staged and is ready to
  be installed. The Mozilla Maintenance Service can be used to install it.
- `"failed"`: The update failed during staging or installation. The
  `update.status` file will generally represent this state with the state name
  followed by an error code from
  `toolkit/mozapps/update/common/updatererrors.h`.

To make things slightly more complicated, these states are also used for the
`state` property of update objects used in the Update Service. The Update
Service currently tracks basically 3 types of updates.

1. Updates in the update history. These should generally always be in a
   `"succeeded"`, `"failed"`, or `"download-failed"` state. Note that
   `"download-failed"` should never get written out to `update.status` and thus
   was not listed above.
2. `downloadingUpdate` is the currently downloading update. This should always
   be in the `"downloading"` state.
3. `readyUpdate` is an update that we have finished downloading but we have not
   tried to install yet (though we may have staged it). This should be in one of
   the `"pending"` or `"applied"` states. However, while the updater binary
   writes state changes back to `update.status` to communicate them to Firefox,
   it has no awareness of these update objects so they will not be changed until
   Firefox updates them afterwards.

Note that if there is a `readyUpdate` and a `downloadingUpdate` at the same
time, `update.status` will reflect the status of the `readyUpdate`, not the
`downloadingUpdate`.

The Update Service state machine was added to resolve a couple of issues with
the `update.status` state machine:

- Having the canonical state of the Update Service live on disk incurs more
  disk reads than necessary.
- There are multiple states that, for most purposes, represent the same state
  (ex: `"pending"` and `"pending-service"`).
- The Update Service didn't really have an existing way of checking if staging
  was still in progress that didn't involve race conditions.
- Multiple Firefox instances can exist simultaneously, but only one of them
  can drive update at once. This leads to a situation where the state on disk
  doesn't really match the state of some Firefox instances.
- Once support for multiple downloads per session was added, there was no good
  way of representing aspects of this in the existing state machine.

Because of this, a different but closely related state machine was added to
`nsIApplicationUpdateService` with these states:

- `STATE_IDLE`: An instance of Firefox that doesn't have the
  [update mutex](#update-mutex-and-update-sync-manager) will always be in this
  state until it manages to get it. If the mutex is held, this state means that
  there is no update downloading, staging, or ready to be installed.
- `STATE_DOWNLOADING`: The update mutex is held and there is not a downloading,
  staging or ready-to-install update.
- `STATE_STAGING`: The update mutex is held, an update has been downloaded, and
  it is now being staged.
- `STATE_PENDING`: The update mutex is held and an update is ready to be
  installed.
- `STATE_SWAP`: The update mutex is held, an update has been readied, and now
  a second update has finished downloading. Firefox is now swapping the old
  update with the new update.

The following flowchart describes the update state transitions in terms of both
types of update states. It describes the states from the perspective of the
Firefox instance that holds the update mutex during this process. Note that
some of the more unusual error cases are not shown here. The "happy path" (the
simplest, most ideal flow) through the system has thicker arrows.

```{mermaid}
flowchart TD
  %% If these state names aren't short and manual line-breaks aren't used,
  %% we seem to end up with very small boxes with invisible text in them.
  idle[AUS:IDLE<br>status:null]
  check{Update Check}
  waitToRetryDownload{{Wait}}
  downloading[AUS:DOWNLOADING<br>status:downloading]
  morePatchesToTryDownloading{More patches?}
  maybeStage{Staging?}
  stagingService[AUS: STAGING<br>status: pending-service]
  stagingNoService[AUS: STAGING<br>status: pending]
  launchStaging{{Run<br>Updater<br>binary}}
  stagingStart[[status: applying]]
  stagingSuccess[[status: applied]]
  stagingFail[[status: failed &lt;code&gt;]]
  stagingEnd{Firefox}
  appliedMaybeService{Use MMS?}
  appliedNoService[AUS:PENDING<br>status: applied]
  appliedService[AUS:PENDING<br>status: applied-service]
  doWeNeedElevation{Elevation<br>needed?}
  pendingNoElevation[AUS: PENDING<br>status: pending]
  pendingService[AUS: PENDING<br>status: pending-service]
  pendingElevate[AUS: PENDING<br>status: pending-elevate]
  waitForRestart{{Wait for<br>restart<br>or update}}
  additionalDownload{{Found<br>update}}
  additionalDownloadSuccessful[AUS: SWAP<br>status: null]
  restarts{{Firefox restarts}}
  askToElevate{Permission<br>to elevate?}
  askToElevateAccepted[AUS: PENDING<br>status: pending]
  waitForNewVersion{{Block this<br>version}}
  launchUpdate{{Run<br>Updater<br>binary}}
  updateStart[[status: applying]]
  updateSuccess[[status: succeeded]]
  updateFail[[status: failed &lt;code&gt;]]
  updateEnd{Firefox}
  completeMarFallback{Complete<br>MAR<br>available?}
  updateComplete([Update complete!])

  idle==>check

  check== Update Found ==>downloading
  check-- No Updates Found -->idle

  downloading-- Transient<br>or BITS<br>Failure -->waitToRetryDownload-->downloading
  downloading-- Patch verification failed -->morePatchesToTryDownloading
  downloading-- Other failure -->idle
  downloading== Download success ==>maybeStage

  morePatchesToTryDownloading-- Yes -->downloading
  morePatchesToTryDownloading-- No -->idle

  maybeStage-- Yes, with Windows elevation -->stagingService
  maybeStage== Yes, without elevation ==>stagingNoService
  maybeStage-- No -->doWeNeedElevation

  stagingService-->launchStaging
  stagingNoService==>launchStaging

  launchStaging==>stagingStart

  stagingStart== Staging successful ==>stagingSuccess
  stagingStart-- Staging failure -->stagingFail

  stagingSuccess==>stagingEnd
  stagingFail-->stagingEnd

  stagingEnd== Success ==>appliedMaybeService
  stagingEnd-- Staging Specific Error -->doWeNeedElevation
  stagingEnd-- Maintenance Service Specific Error -->pendingNoElevation
  stagingEnd-- Other Error -->completeMarFallback

  appliedMaybeService-- Yes -->appliedService-->waitForRestart
  appliedMaybeService== No ==>appliedNoService==>waitForRestart

  doWeNeedElevation-- No or Maintenance Service is not available -->pendingNoElevation
  doWeNeedElevation-- Windows elevation, Maintenance Service is available -->pendingService
  doWeNeedElevation-- macOS elevation -->pendingElevate

  pendingNoElevation-->waitForRestart
  pendingService-->waitForRestart
  pendingElevate-->waitForRestart

  waitForRestart-->additionalDownload
  waitForRestart==>restarts

  additionalDownload-- Download Failed -->waitForRestart
  additionalDownload-- Download Successful -->additionalDownloadSuccessful

  additionalDownloadSuccessful-->maybeStage

  restarts-- status is pending-elevate -->askToElevate
  restarts== status is pending or pending-service ==>launchUpdate

  askToElevate-- User declines -->waitForNewVersion
  askToElevate-- User accepts -->askToElevateAccepted

  askToElevateAccepted-->restarts

  waitForNewVersion-->idle

  launchUpdate==>updateStart

  updateStart== Update successful ==>updateSuccess
  updateStart-- Update failure -->updateFail

  updateSuccess==>updateEnd
  updateFail-->updateEnd

  updateEnd-- Error writing or elevating -->doWeNeedElevation
  updateEnd-- Maintenance Service specific error -->pendingNoElevation
  updateEnd-- Other error -->completeMarFallback
  updateEnd== Success ==>updateComplete

  completeMarFallback-- Yes -->downloading
  completeMarFallback-- No -->idle
```

## Update Channel

There is one wrinkle that informs some confusing parts of update system and MAR
design. We don't want the update to change the channel of the installation, even
if the update appears to be from a different channel. There are two main reasons
for this. The first is that QA uses this in their testing. The second is release
candidates.

Release candidates are slightly weird. They are built precisely as if they were
meant for the Release channel. But we actually release them on the Beta channel.
This is to help more thoroughly test for problems that might come from this
slight change in the build process. Because of this, release candidate
installers will not be advertised to users looking for the beta channel
installer. But, when we serve a release candidate as an update, we expect the
updater to produce an installation that is identical to a Release installation
_except_ that it will continue to be on the Beta channel.

In order to allow for this, we isolate the definition of our current update
channel to just a few files. And we support having the update contain files that
will only be installed if they do not already exist. This allows us to ensure
that the updater will always leave those files untouched.

Examples of these files include `default/pref/channel-prefs.js` and
`update-settings.ini` on Windows and Linux. The macOS equivalents of these files
are `Contents/Frameworks/ChannelPrefs.framework` and
`Contents/MacOS/updater.app/Contents/Frameworks/UpdateSettings.framework`,
respectively.

## precomplete

Sometimes, we remove files from the Firefox installation. This is a bit
problematic for complete MARs. They are intended to be able to update from
almost any version to the current version. But it's tricky to have the complete
MAR know what files should be removed when updating an arbitrary installed
version.

We don't want to just delete everything in the current installation, just in
case there are, for some reason, files in our installation directory that do
not really "belong to" our installation (i.e. files that the user placed there).
Additionally, there are some files that are part of the installation that should
never be deleted on update (see [Update Channel](#update-channel), above).

This problem is solved by the `precomplete` file. When installing a complete
MAR, the updater looks for this file in the existing installation. The
`precomplete` file tells it what files and directories are a part of the
current installation so that the updater knows what to remove to effectively
"uninstall" the current installation before installing the updated installation.

## Background Update

Unfortunately, background update has come to mean two things in Firefox. In the
initial update design, we referred to updates without user interaction as
background updates. This was to distinguish them from foreground updates, which
involve user interaction. Later on, the Background Update Task (also known as
the Background Update Agent) was added to update Firefox when it is not running.
Confusingly, this is often shortened to "Background Update".

While Firefox is running, background update (the in-app one, not the task) is
initiated via the `TimerManager` in
`toolkit/components/timermanager/UpdateTimerManager.sys.mjs`. The update timer
is added to the timer manager implicitly, via
`toolkit/mozapps/update/nsUpdateService.manifest`. The update checking interval
can be changed by setting `app.update.interval` to the desired number of
seconds. When the update timer expires, `UpdateService.notify()` is called,
initiating an update check.

The Background Update Task is a type of
[Background Task](../../../../components/backgroundtasks/docs/index.md), which
is basically just a copy of Firefox running in a stripped down, headless mode.
It is described in detail, [here](BackgroundUpdates.rst), but a short summary
will be provided below.

The Background Update Task is registered, if possible, at Firefox startup. There
are a number of reasons that it might not be registered, which are listed in the
definition of `BackgroundUpdate.REASON`. We only re-register the task if it
does not exist or if the task version has been changed since the last time we
registered the task. In order to ensure that this happens, be sure to update
`TASK_DEF_CURRENT_VERSION` when changing the definition of the task.

The Background Update Task essentially just runs update the same way that the
update UI would: via the `AppUpdater`. It requires that [BITS](#bits) be used
for downloads so that it can keep its run time brief. Note that in order to
prevent race conditions, even if the download completes instantly, the Update
Service is prevented from proceeding with update since the Task may already be
shutting down. It will continue the update process the next time the task runs.

## Langpacks

One way of setting the language of a Firefox installation is via
[langpacks](https://support.mozilla.org/en-US/kb/use-firefox-another-language#w_add-languages-to-the-firefox-interface).
When using a langpack, the updated langpack ought to be staged before Firefox
is updated. The Update Service currently takes care of this. When it starts an
update download, it also starts the process of downloading and staging a
langpack. It then waits for the langpack to be ready before it sets the
[state](#update-state) to `STATE_PENDING`.

## Update XMLs

There are actually three XMLs pertaining to update, each of which will be
described here. The format of all of them is basically equivalent. Each of them
are parsed into an array of `Update` objects (defined in
`toolkit/mozapps/update/UpdateService.sys.mjs`). Each `Update` can contain
multiple `UpdatePatch` objects. Generally speaking, an `Update` will contain a
patch for a [complete MAR](MarFiles.md#types-of-mars) and possibly a patch for
a partial MAR, if one is available.

When Firefox checks for updates, the update server (Balrog) replies with an XML
describing the most up-to-date update that is available from the installed
version.

While updates are in-progress, they will be stored in `active-update.xml`. The
first update listed is the `readyUpdate` and the second is the
`downloadingUpdate`. If there is only one update in the XML in the `downloading`
state, it is the `downloadingUpdate`. If there is one update in another state,
it is the `readyUpdate`.

The update history is stored in `updates.xml`. It stores the last 10 successful
and failed updates, starting with the most recent.

## Force Parameter

Balrog supports throttling updates. This is implemented by picking a ratio, on
the server side, to throttle the update at. Then, based on that probability,
pick to return one of two updates (generally the newest update or the one
before that). However, this can be overridden by passing the `force` query
parameter. When an update is initiated by the user (from the update UI),
`force=1` is sent, overriding the probability and retrieving the newer update.
It is technically also possible to send `force=0` to specifically request the
older update, but we do not use this in practice.

## Pinning

Firefox has
[an update version pinning mechanism](https://mozilla.github.io/policy-templates/#appupdatepin)
available as an enterprise policy. This causes a query parameter to be sent to
convey the update pin to the server (Balrog). The pinning logic is entirely
implemented on the server side. It works by keeping a table of the most recent
version for each major and minor version. It then uses the pin requested to
do a lookup in that table.

## No Window Auto Restart

On macOS, Firefox (like most other applications) continues running even when the
last window is closed. Since the user isn't using the browser at this point,
this is a good time for us to update. The problem is that Firefox can't really
update while it is running. To address this, `RestartOnLastWindowClosed` was
added to `toolkit/mozapps/update/UpdateService.sys.mjs`. When the last Firefox
window is closed and an update is ready, `RestartOnLastWindowClosed` starts a
timer. When this expires, it attempts to perform a silent update in which no UI
is shown and we bail out if any kind of UI is needed. Firefox is then restarted
in a special state where no windows open.

This mechanism can be disabled by setting
`app.update.noWindowAutoRestart.enabled` to `false`. The delay until the restart
can be changed by setting `app.update.noWindowAutoRestart.delayMs` to the
desired number of milliseconds.
