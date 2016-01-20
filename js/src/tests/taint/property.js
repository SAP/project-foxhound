load("taint/taint-setup.js");

//normalize

var taint = _MultiTaint();


var obj1 = {"a": "b"};
var obj2 = {"c": "d"};

var notaintkey = "keyy";
var taintkey   = _t("keyy");
assertTainted(taintkey);
assertNotTainted(notaintkey);


//taint is currently overwritten by a property assignment
obj2[notaintkey]="val";
obj1[taintkey]  ="val";
assertTainted(taintkey);
assertNotTainted(notaintkey);

reportCompare(true, true);
