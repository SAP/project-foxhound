// |jit-test| --ion-gvn=off

function testGetFullYear(t) {
  // Scalar replaceable Date with call to getFullYear.
  var year = new Date(t).getFullYear();

  // |year| must be typed as Int32 to match type observed in Baseline CacheIR IC.
  return "" + year;
}

function testGetMonth(t) {
  // Scalar replaceable Date with call to getMonth.
  var month = new Date(t).getMonth();

  // |month| must be typed as Int32 to match type observed in Baseline CacheIR IC.
  return "" + month;
}

function testGetDate(t) {
  // Scalar replaceable Date with call to getDate.
  var date = new Date(t).getDate();

  // |date| must be typed as Int32 to match type observed in Baseline CacheIR IC.
  return "" + date;
}

function main() {
  // Don't inline test methods.
  with ({}) {}

  // Date must be invalid, i.e. not NaN, to observe Int32 types in Baseline.
  var t = 0;
  var d = new Date(t);
  var year = "" + d.getFullYear();
  var month = "" + d.getMonth();
  var date = "" + d.getDate();

  for (var i = 0; i < 2000; i++) {
    assertEq(testGetFullYear(t), year);
    assertEq(testGetMonth(t), month);
    assertEq(testGetDate(t), date);
  }
}
main();
