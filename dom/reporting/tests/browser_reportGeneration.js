/* Any copyright is dedicated to the Public Domain.
   https://creativecommons.org/publicdomain/zero/1.0/ */

add_task(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [
      ["dom.reporting.enabled", true],
      ["dom.reporting.header.enabled", true],
      ["dom.reporting.testing.enabled", true],
    ],
  });
});

add_task(async function () {
  let o = new ReportingObserver(() => {});
  o.observe();

  await window.TestReportGenerator.generateReport({
    message: "test",
    group: "test",
  });

  let r = o.takeRecords();
  is(r.length, 1, "Report delivery was observed");
  is(r[0].body.message, "test", "Message is correct");

  await window.TestReportGenerator.generateReport({ message: "test" });

  r = o.takeRecords();
  is(r.length, 1, "Report delivery was observed when no group was provided");

  await Assert.rejects(
    window.TestReportGenerator.generateReport(),
    /TypeError/,
    "generateReport emits a TypeError when message isn't provided"
  );
});

// test serialization of message as null property
add_task(async function () {
  let o = new ReportingObserver(() => {});
  o.observe();

  await window.TestReportGenerator.generateReport({
    message: null,
    group: "test",
  });

  let r = o.takeRecords();
  is(r.length, 1, "Report delivery was observed");
  is(r[0].body.message, "null", "Message is correct");
});
