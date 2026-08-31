"use strict";

add_task(async function test() {
  let now = Services.telemetry.msSinceProcessStart();
  await Services.fog.testFlushAllChildren();
  const firstPaint = Glean.timestamps.firstPaint.testGetValue();

  Assert.notEqual(firstPaint, null, "The first_paint timestamp was recorded.");
  Assert.greater(firstPaint, 0, "first_paint is greater than 0.");
  Assert.greater(now, 0, "Browser test runtime is greater than zero.");
  Assert.greater(
    now,
    firstPaint,
    "first_paint is less than total browser test runtime."
  );
});
