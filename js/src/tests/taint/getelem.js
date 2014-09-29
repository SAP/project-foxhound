// |reftest| fails -- GetElem is not patched for the optimized case
load("taint/taint-setup.js");

var str = _flatTaint();

//access to single chars should remain taint - behave like slice(x)
var sub = str.substring(3, 4);
_equalTaint(sub, str.charAt(3));
_equalTaint(sub, str[3]);

for(var i = 0; i < 10000; i++) {
	_isTainted(str[3]);
}

reportCompare(true, true);