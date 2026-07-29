// |reftest| skip-if(!this.hasOwnProperty("Temporal"))

{
  let one = Temporal.PlainDate.from({year: 4721, monthCode: "M12", day: 1, calendar: "chinese"});
  let two = Temporal.PlainDate.from({year: 4724, monthCode: "M12", day: 1, calendar: "chinese"});
  assertEq(one.until(two, {largestUnit: "year"}).toString(), "P3Y");
  assertEq(one.until(two, {largestUnit: "months"}).toString(), "P38M");
}

{
  let one = Temporal.PlainDate.from({year: 4721, monthCode: "M12L", day: 1, calendar: "chinese"});
  let two = Temporal.PlainDate.from({year: 4724, monthCode: "M12", day: 1, calendar: "chinese"});
  assertEq(one.until(two, {largestUnit: "year"}).toString(), "P2Y13M");
  assertEq(one.until(two, {largestUnit: "months"}).toString(), "P37M");
}

if (typeof reportCompare === "function")
  reportCompare(true, true);
