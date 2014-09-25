// |reftest| skip -- s
function _t(str) {
	return String.newAllTainted(str);
}

function _flat() {
  return "Hello! Dr. Flat reporting in.";
}

//compare by JSONing
function _equalTaint(a,b) {
	assertEq(JSON.stringify(b.taint),JSON.stringify(a.taint));
}

function _isTainted(a) {
	assertEq(a.taint.length > 0, true);
}

function _isNotTainted(a) {
	assertEq(a.taint.length, 0);
}