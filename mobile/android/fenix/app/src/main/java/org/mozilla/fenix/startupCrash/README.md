# Expected `StartupCrashActivity` behaviour

Fenix has a challenging problem: it’s possible for crashes to happen early in startup, especially in native components; and we want to collect crash reports for these startup crashes; but we also need user consent to collect said crash reports, necessitating UX to obtain consent and control the process.

When an unhandled exception occurs, it's caught by our `ExceptionHandler`. This handler checks if the crash happened during "early startup" by querying **`visualCompletenessQueue.isReady()`**. If this returns `false`, we trigger the startup crash recovery flow.

The handler's first action is to launch the `StartupCrashActivity` in a new, isolated process (defined in the manifest as **`:StartupCrashActivityProcess`**). This isolation is critical:
* It ensures the `StartupCrashActivity` has a clean environment, free from any "contaminated" state of the crashing application.
* It allows the activity to be minimal, improving its own chances of not crashing.

After launching the new activity, the `ExceptionHandler` allows the original (crashing) process to terminate normally.

In the `StartupCrashActivity` (running in its separate process), the user is prompted to either report the crash or not. Once they make a choice, a button to "Restart App" is provided.

Clicking this button calls the `restartFenix()` function. This function:
1.  Gets the standard Fenix launch intent (`packageManager.getLaunchIntentForPackage(packageName)`).
2.  Starts this intent with `startActivity(restartIntent)`.
3.  Immediately kills its own (`:StartupCrashActivityProcess`) process via `Process.killProcess(Process.myPid())`.

This ensures that the app relaunches in a third, completely fresh process, proceeding through the regular, clean application startup path.

This diagram may help in visualize these considerations:

![](startup-crash-recovery-flow.png)
