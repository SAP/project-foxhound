// Concurrent marking disables the element shift optimization which means this
// test can take a long time with the default setting.
let count = 90000;
if (gcparam("concurrentMarkingEnabled")) {
  count = 9000;
}

function f() {
  var arr = [];
  for (var i = 0; i < 2; i++) {
	  for (var j = 0; j < count; j++) {
	    arr.push(j);
    }
	  for (var j = 0; j < count; j++) {
	    assertEq(arr.shift(), j);
    }
	  assertEq(arr.length, 0);
  }
}

f();
