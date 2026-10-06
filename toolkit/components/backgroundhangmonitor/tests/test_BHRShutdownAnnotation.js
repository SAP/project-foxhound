/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const { TelemetryUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/TelemetryUtils.sys.mjs"
);

function captureNextGeckoHang(matchFn) {
  return new Promise(resolve => {
    const onThreadHang = subject => {
      let hang = subject.QueryInterface(Ci.nsIHangDetails);
      if (hang.thread !== "Gecko") {
        return;
      }
      if (matchFn && !matchFn(hang)) {
        return;
      }
      Services.obs.removeObserver(onThreadHang, "bhr-thread-hang");
      resolve(hang);
    };
    Services.obs.addObserver(onThreadHang, "bhr-thread-hang");
  });
}

function induceMainThreadHang() {
  executeSoon(() => {
    let start = Date.now();
    // eslint-disable-next-line no-empty
    while (Date.now() - start < 1000) {}
  });
}

function annotationKeys(hang) {
  return new Set(hang.annotations.map(([k]) => k));
}

add_task(async function setup() {
  if (!Services.telemetry.canRecordExtended) {
    return;
  }

  do_get_profile();

  Services.prefs.setBoolPref(
    TelemetryUtils.Preferences.OverridePreRelease,
    true
  );
});

add_task(async function test_ImpendingShutdown_annotation() {
  if (!Services.telemetry.canRecordExtended) {
    return;
  }

  Services.startup.setImpendingShutdown();
  Assert.ok(
    !Services.startup.isInOrBeyondShutdownPhase(
      Ci.nsIAppStartup.SHUTDOWN_PHASE_APPSHUTDOWNCONFIRMED
    ),
    "phase not advanced yet"
  );

  let hangPromise = captureNextGeckoHang(hang =>
    annotationKeys(hang).has("ShutdownImpending")
  );
  induceMainThreadHang();
  let keys = annotationKeys(await hangPromise);

  ok(
    keys.has("ShutdownImpending"),
    "ShutdownImpending annotation is present when shutdown is impending"
  );
});

add_task(async function test_ShutdownConfirmed_annotation() {
  if (!Services.telemetry.canRecordExtended) {
    return;
  }

  Services.startup.advanceShutdownPhase(
    Ci.nsIAppStartup.SHUTDOWN_PHASE_APPSHUTDOWNCONFIRMED
  );

  let hangPromise = captureNextGeckoHang(hang =>
    annotationKeys(hang).has("ShutdownImpending")
  );
  induceMainThreadHang();
  let keys = annotationKeys(await hangPromise);

  ok(
    keys.has("ShutdownImpending"),
    "ShutdownImpending annotation is present once the AppShutdownConfirmed phase has been advanced"
  );
});
