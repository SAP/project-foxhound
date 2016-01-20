// |reftest| fails -- GetElem is not patched for the optimized case
load("taint/taint-setup.js");

var str = _flatTaint();

//access to single chars should remain taint - behave like slice(x)
var sub = str.substring(3, 4);
assertDeepEq(sub, str.charAt(3));
assertDeepEq(sub, str[3]);

// JIT test
for(var i = 0; i < 10000; i++) {
	assertTainted(str[3]);
}

reportCompare(true, true);
