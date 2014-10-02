// |reftest| fails -- property assignment
load("taint/taint-setup.js");

//normalize

var taint = _MultiTaint();


var obj1 = {"a": "b"};
var obj2 = {"c": "d"};

var notaintkey = "keyy";
var taintkey   = _t("keyy");
_isTainted(taintkey);
_isNotTainted(notaintkey);


//taint is currently overwritten by a property assignment
obj2[notaintkey]="val";
obj1[taintkey]  ="val";
_isTainted(taintkey);
_isNotTainted(notaintkey);


reportCompare(true, true);