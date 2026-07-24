// |reftest| skip-if(!this.hasOwnProperty("Intl"))

var date = new Intl.DateTimeFormat("en-GB", {
  timeZone: "US/Central",
  hour: "numeric",
  timeZoneName: "longOffset"
}).format(new Date(Date.UTC(2026,0,15,16)));

// Test that the character 'h' does not appear after the hour
assertEq(date.slice(0, 3), "10 ");

if (typeof reportCompare === "function") {
    reportCompare(0, 0, "ok");
}
