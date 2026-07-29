// ISO date-time string with time component, but without time zone is
// interpreted as local time.
var s = "1970-01-01T00:00";

var msPerHour = 60 * 60 * 1000;

for (var i = 0; i < 100; ++i) {
  // PST8PDT time zone offset is eight hours.
  setTimeZone("PST8PDT");
  var pst8pdt = Date.parse(s);
  assertEq(pst8pdt, 8 * msPerHour);

  // UTC time zone offset is zero hours.
  setTimeZone("UTC");
  var utc = Date.parse(s);
  assertEq(utc, 0);
}
