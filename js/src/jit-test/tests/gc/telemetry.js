// Test GC telemetry.

gczeal(0);
gcparam('perZoneGCEnabled', 1);
gcparam('incrementalGCEnabled', 1);
gc();

function runAndGetTelemetry(probe, thunk) {
  startRecordingTelemetry(probe);
  thunk();
  let samples = getTelemetrySamples(probe);
  stopRecordingTelemetry(probe);
  return samples;
}

function checkTelemetry(probe, expected, thunk) {
  let samples = runAndGetTelemetry(probe, thunk);
  assertEq(samples.length, 1);
  assertEq(samples[0], expected);
}

function incrementalGC() {
  startgc(1);
  while (gcstate() != 'NotActive') {
    gcslice(10000);
  }
}

checkTelemetry('GC_IS_COMPARTMENTAL', false, () => gc());
checkTelemetry('GC_IS_COMPARTMENTAL', true, () => gc(this));

// By default there are two zones, the one for |this| and this atoms zone.
checkTelemetry('GC_ZONE_COUNT', 2, () => gc());

checkTelemetry('GC_ZONES_COLLECTED', 2, () => gc());
checkTelemetry('GC_ZONES_COLLECTED', 1, () => gc(this));

checkTelemetry('GC_RESET', false, () => gc());
checkTelemetry('GC_RESET', false, () => { startgc(1); finishgc(); });
checkTelemetry('GC_RESET', true, () => { startgc(1); abortgc(); });

checkTelemetry('GC_NON_INCREMENTAL', true, () => gc());
checkTelemetry('GC_NON_INCREMENTAL', true, () => { startgc(1); abortgc(); });
checkTelemetry('GC_NON_INCREMENTAL', false, () => { startgc(1); finishgc(); });
checkTelemetry('GC_NON_INCREMENTAL', false, () => incrementalGC());

// GC_SLICE_COUNT is not reported for non-incremental GCs.
let samples = runAndGetTelemetry('GC_SLICE_COUNT', () => gc());
assertEq(samples.length, 0);

checkTelemetry('GC_SLICE_COUNT', 2, () => { startgc(1); finishgc(); });
