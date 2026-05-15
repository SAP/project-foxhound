// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

for (var calendar of [
  "iso8601",
  "gregory",
]) {
  for (var overflow of ["constrain", "reject"]) {
    var args = {calendar, year: 2025, monthCode: "M12", month: "13", day: 1};
    var options = {overflow};
    assertThrowsInstanceOf(() => Temporal.PlainDate.from(args, options), RangeError);
  }
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
