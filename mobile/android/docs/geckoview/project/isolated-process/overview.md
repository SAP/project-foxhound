# Isolated Processes and App Zygote Preloading on Android

## Isolated Processes

Isolated processes on Android are an OS level concept that uses [SELinux permissions](https://cs.android.com/android/platform/superproject/main/+/main:system/sepolicy/private/isolated_app_all.te) to sandbox processes. Isolated processes are separate from Fission, the Gecko technology that separates rendering processes based on origin. A service that is using isolated processes will have `android:isolatedProcess="true"` in the manifest.

Isolated processes have been supported since Android 4.1 (level 16). To use `bindIsolatedService`, an API level of Android 10 (level 29) is required. `android.os.Process.isIsolated()` is available since Android 4.1 (level 16), but a hidden API until Android 9 (level 28).

There are many differences between isolated processes and regular processes.

Some important differences include:

* Isolated processes are not allowed to start or bind most other components (e.g. services, activities)

* The UID of the isolated process is different from the parent process, so it does not share permissions, identity, or UID-based file access

* Isolated processes do not inherit the app’s runtime permissions and must rely on IPC to a non-isolated process for permission-gated operations

* Access to system services, app state, and filesystem paths is more restricted due to tighter SELinux confinement

* Many system calls and kernel interactions are restricted compared to regular app processes


Some links to external documentation:
* [Video overview of isolated processes](https://www.youtube.com/watch?v=Ive8WaeldWA)
* [SELinux Contexts](https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/6/html/security-enhanced_linux/chap-security-enhanced_linux-selinux_contexts)
* [Android SE Policy](https://cs.android.com/android/platform/superproject/main/+/main:system/sepolicy/README.md)
* [SELinux Policy Rules for isolated processes on Android](https://cs.android.com/android/platform/superproject/main/+/main:system/sepolicy/private/isolated_app_all.te)

### How to run isolated process mode

#### GeckoView Test Runner Locally:
[`ac_add_options --enable-isolated-process`](https://searchfox.org/firefox-main/rev/f37efeb9fd346125bfc98d132ae0dea48a1e2584/mobile/android/moz.configure#62)
(Should apply to junit, supported mochitests, xpcshell, wpt, and reftests.)

#### CI:
Currently in CI as a build type of [debug-isolated-process](https://searchfox.org/firefox-main/rev/f37efeb9fd346125bfc98d132ae0dea48a1e2584/mobile/android/config/mozconfigs/android-x86_64/debug-isolated-process). It is in the process of transitioning to a variant of [geckoview-isolated-process.](https://phabricator.services.mozilla.com/D265099)

#### Fenix:
Isolated processes may be tested by enabling it in Fenix’s secret settings and restarting the app.

Note: If app zygote preloading is also enabled, those settings will take precedence. Also, the GV flags will not apply because Fenix has control of the setting.

### How to confirm isolated processes

```
# GeckoView Test Runner
adb shell "ps -Z -A | grep -i geckoview.test"

# Fenix
adb shell "ps -Z -A | grep -i fenix"

# Note: The exact full process name will vary based on release type, but should still be found using "fenix". e.g. beta, debug
```

#### Example Isolated Process

✅ Yes, isolated process:

```text
u:r:isolated_app:s0:c512,c768 u0_i9795 19244 5586 17883664 217912 do_epoll_wait 0 S org.mozilla.geckoview_example:isolatedTab0:org.mozilla.gecko.process.GeckoChildProcessServices$isolatedT
    ^^^^^^^^^^^^              ^^^^^^^^                                                                            ^^^^^^^^^^^
   (isolated_app)             (u0_i prefix)                                                                       (isolatedTab)
```

Key indicators: `isolated_app` type, `u0_i` prefix in UID, `isolatedTab` in the process name

Only the tab processes will be stated as isolated. Other processes won't be isolated.

#### Example Regular Process

❌ Not isolated process:

```text
u:r:untrusted_app:s0:c75,c257,c512,c768 u0_a331 19936 5586 17833968 170608 do_epoll_wait 0 S org.mozilla.firefox_beta:tab30
    ^^^^^^^^^^^^^                       ^^^^^^^                                                                       ^^^
    (untrusted_app)                     (u0_a prefix)                                                                 (tab)
```

Key indicators: `untrusted_app` type, `u0_a` prefix in UID, and `tab` in process name (**not** `isolatedTab`)

## App Zygote Preloading

For Firefox on Android, [app zygote preloading](https://developer.android.com/reference/android/app/ZygotePreload) creates a zygote process with libraries preloaded to help increase efficiency when launching new tab processes. The libraries selected are defined in [ZygotePreload.java](https://searchfox.org/firefox-main/source/mobile/android/geckoview/src/main/java/org/mozilla/gecko/process/ZygotePreload.java).

Isolated processes working as expected is a prerequisite for app zygote preloading. We automatically enable isolated processes for the app zygote case.

App zygote preloading requires Android 10 (level 29\) or higher.

### How to run app zygote preloading

#### GeckoView Test Runner Locally:
[`ac_add_options --enable-isolated-zygote-process`](https://searchfox.org/firefox-main/rev/f37efeb9fd346125bfc98d132ae0dea48a1e2584/mobile/android/moz.configure#43)
(Should apply to junit, supported mochitests, xpcshell, wpt, and reftests.)

#### CI:
[geckoview-zygote](https://searchfox.org/firefox-main/rev/f37efeb9fd346125bfc98d132ae0dea48a1e2584/taskcluster/test_configs/variants.yml#232) variant

#### Fenix:
App zygote preloading can be tested by enabling it in Fenix’s secret settings and restarting the app.

Note: The GV flags will not apply because Fenix has control of the setting.

### How to confirm app zygote preloading

```
# GeckoView Test Runner
adb shell "ps -Z -A | grep -i geckoview.test"

# Fenix
adb shell "ps -Z -A | grep -i fenix"
```

#### Example App Zygote Preloading

✅ Yes, app zygote preloading process:

```text
u:r:app_zygote:s0:c512,c768 u0_a212 6475 350 15686420 180720 do_sys_poll 0 S org.mozilla.fenix.debug_zygote
    ^^^^^^^^^^
   (app_zygote)
```

Key indicator: `app_zygote` type

✅ Yes, isolated process that launched via app zygote:

```text
u:r:isolated_app:s0:c512,c768 u0_i0 6525 6475 18017956 315748 do_epoll_wait 0 S org.mozilla.fenix.debug:isolatedTabWithZygote0:org.mozilla.gecko.process.GeckoChildProcessServices
    ^^^^^^^^^^^^              ^^^^^                                                                      ^^^^^^^^^^^^^^^^^^^^^^
   (isolated_app)            (u0_i)                                                                      (isolatedTabWithZygote)
```

Key indicators: `isolated_app` type, `u0_i` prefix in UID, and `isolatedTabWithZygote` in the process name
