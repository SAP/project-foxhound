class MyRegExp extends RegExp {}
let r = new MyRegExp("(?:)", "gv");
assertEq(Array.from('𠮷'.matchAll(r)).length, 2);
