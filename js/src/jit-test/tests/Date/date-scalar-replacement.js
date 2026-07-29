function testGetTimeAndValueOf() {
  for (var i = 0; i < 250; ++i) {
    var d = new Date(i);
    assertEq(d.getTime(), i);
    assertEq(d.valueOf(), i);
  }
}
testGetTimeAndValueOf();

function testGetFullYear() {
  for (var i = 0; i < 250; ++i) {
    var year = 1800 + i;
    var d = new Date(`${year}-01-01T00:00`);
    assertEq(d.getFullYear(), year);
  }
}
testGetFullYear();

function testGetMonth() {
  for (var i = 0; i < 250; ++i) {
    var month = 1 + (i % 12);
    var d = new Date(`2026-${String(month).padStart(2, "0")}-01T00:00`);
    assertEq(d.getMonth(), month - 1);
  }
}
testGetMonth();

function testGetDate() {
  for (var i = 0; i < 250; ++i) {
    var day = 1 + (i % 31);
    var d = new Date(`2026-01-${String(day).padStart(2, "0")}T00:00`);
    assertEq(d.getDate(), day);
  }
}
testGetDate();
