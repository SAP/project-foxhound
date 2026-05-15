# Logging

## Rust code

Make sure to use the logging macros from the `tracing_support` crate (`tracing_support::debug!`, `tracing_support::info!`, etc).
`error_support` also contains a copy of the same macros, which can be a more convenient import for components that already depend on `error_support`.

## Logs on Desktop

### Forwarding logs to the browser console

Rust logs can be forwarded to the JavaScript browser console using the `toolkit.rust-components.logging.crates` pref.
This pref stores a comma-separated list of items, where each item is a logging target and an optional logging level.

Each item in the comma separated list can be:

* A tracing level (`error`, `warn`, `info`, `debug`, `trace`).
  This will forward all events with that level or greater.
* A target plus tracing level (e.g. `logins:warn`)
  This will forward all events for that target with that level or greater.
  "target" here means crate name unless the crate specifically sets a target, which is rare.
* A bare target (e.g. `logins`).
  This will forward all events for that target that are `debug` or higher.

For example, `logins,autofill:warn,error,suggest` would forward:

- Logins logs at the debug level
- Autofill logs at the warning level
- Suggest logs at the debug level
- All other logs at the error level.

### Error reporting

Errors from the error reporter have level `error` so they will be forwarded to the browser console by default.
Add the `app-services-error-reporter` target to get breadcrumbs forwarded as well.

### setupLoggerForTarget

An alternative logging mechanism is `setupLoggerForTarget`.
This allows you to connect tracing events to the `Log.sys.mjs` logger.
The main reason to do this is to connect to an existing logger like the Sync logger.

```
// At the top of your JS module
ChromeUtils.defineESModuleGetters(lazy, {
  setupLoggerForTarget: "resource://gre/modules/AppServicesTracing.sys.mjs",
});

// In your initialization code
lazy.setupLoggerForTarget("tabs", "Sync.Engine.Tabs");
```

## Logs on Android

On android, logs currently go to logcat.
Android Studio can be used to view the logcat logs; connect the device over USB
and view the Logcat tab at the bottom of Android Studio. Check to make sure you
have the right device selected at the top left of the Logcat pane, and the
correct process to the right of that. One trick to avoid having to select the
correct process (as there are main and content processes) is to choose "No
Filters" from the menu on the top right of the Logcat pane. Then, use the search
box to search for the log messages you are trying to find.

There are also many other utilities, command line and graphical, that can be
used to view logcat logs from a connected android device in a more flexible
manner.

### Changing the loglevel in Android

If you need more verbose logging, after the call to `RustLog.enable()` in
`FenixApplication`, you may call `RustLog.setMaxLevel(Log.Priority.DEBUG,
true)`.

## Logs on iOS

If you're using `Xcode`, then you can view the logs in the debugger.

If you're not using `Xcode`, then:

* Navigate to the settings page
* tap the version number 5 times to get to the secret menu
* Select "copy log files to container"
* Find the logs on your files folder
