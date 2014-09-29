// |reftest| skip -- s
function _t(str) {
	return String.newAllTainted(str);
}

var b = "Hello\u01C3";
var m = " \"Dr.\" String ";
var e = "reporting in";

function _flatTaint() {
  return _t(b+m+e);
}

function _PartTaintEnd() {
	return b+m+_t(e);
}

function _PartTaintMid() {
	return b+_t(m)+e;
}

function _PartTaintBegin() {
	return _t(b)+m+e;
}

function _MultiTaint() {
	return _t(b)+m+_t(e);
}


//compare by JSONing
function _equalTaint(a,b) {
	assertEq(JSON.stringify(b.taint),JSON.stringify(a.taint), a+"=t="+b);
}

function _isTainted(a) {
	assertEq(a.taint.length > 0, true, "taint "+a);
}

function _isNotTainted(a) {
	assertEq(a.taint.length, 0, "notaint "+a);
}