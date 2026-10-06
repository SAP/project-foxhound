/* Any copyright is dedicated to the Public Domain.
   http://creativecommons.org/publicdomain/zero/1.0/ */

const kPrefName = "logging.prof";
const kPrefValue = 5;
add_task(async () => {
  Services.prefs.setIntPref(kPrefName, kPrefValue);
  registerCleanupFunction(() => {
    Services.prefs.clearUserPref(kPrefName);
  });

  const entries = 10000;
  const interval = 1;
  const threads = ["GeckoMain"];
  const features = ["nostacksampling"];
  await Services.profiler.StartProfiler(entries, interval, features, threads);
  // We need to pause the profiler here, otherwise we get crashes.
  // This seems to be a combination of json streaming + markers from Rust.
  // See Bug 1920704 for more details.
  await Services.profiler.Pause();
  const profileData = await Services.profiler.getProfileDataAsync();
  await Services.profiler.StopProfiler();
  const { markers, stringTable } = profileData.threads[0];
  // The "prof" log module is enabled via kPrefName = "logging.prof". Profiler
  // operations (e.g. profiler_pause) emit MOZ_LOG calls to this module while
  // the profiler is active, which should appear as markers named "prof".
  const stringIndexForProf = stringTable.indexOf("prof");
  Assert.greaterOrEqual(
    stringIndexForProf,
    0,
    "A string index for the string 'prof' have been found."
  );

  const logMessageMarkers = markers.data.filter(
    tuple => tuple[markers.schema.name] === stringIndexForProf
  );

  Assert.greater(
    logMessageMarkers.length,
    0,
    "At least one log message have been found."
  );
});
