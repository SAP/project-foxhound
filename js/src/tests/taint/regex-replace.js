load("taint/taint-setup.js");

//match

var taint = _MultiTaint();

//str->empty
var stremp = taint.replace("String", "").taint;
assertEq(stremp.length, 2);
assertEq(stremp[0].begin, 0); //same
assertEq(stremp[0].end, 6); //same
assertEq(stremp[0].operators.length, 3); //source + substring + replace
assertEq(stremp[0].operators[0].op, "replace");
assertEq(stremp[0].operators[0].param1, "String"); //the pattern
assertEq(stremp[0].operators[0].param2, ""); //replacement
assertEq(stremp[0].operators[1].op, "substring");
assertEq(stremp[1].begin, 14); //same
assertEq(stremp[1].end, 26); //reduced by len(reporting)
//str->str
var strstr = taint.replace("String", _t("Taint")).taint;
assertEq(strstr.length, 3);
assertEq(strstr[0].begin, 0); //same
assertEq(strstr[0].end, 6); //same
assertEq(strstr[0].operators.length, 3); //source + substring + replace
assertEq(strstr[0].operators[0].op, "replace");
assertEq(strstr[0].operators[0].param1, "String"); //the pattern
assertEq(strstr[0].operators[0].param2, "Taint"); //replacement
assertEq(strstr[0].operators[1].op, "substring");
assertEq(strstr[1].begin, 13); //same
assertEq(strstr[1].end, 18); //reduced by len(reporting)
assertEq(strstr[2].begin, 19); //same
assertEq(strstr[2].end, 31); //reduced by len(reporting)
// complete taint replace
var strstr_complete = taint.replace("reporting in", "Taint").taint;
assertEq(strstr_complete.length, 1);

//str->dollar
var strdoll = taint.replace("reporting", "\"$&\"").taint;
//$&=search string itself, because this breaks the end taint
// we are getting 3 tainted parts here: <begin> "reporting" in
assertEq(strdoll.length, 3);
assertEq(strdoll[1].begin, 21);
assertEq(strdoll[1].end, 30);
assertEq(strdoll[1].operators.length, 3); //no substring here
assertEq(strdoll[2].begin, 31);
assertEq(strdoll[2].end, 34);
assertEq(strdoll[2].operators.length, 3); //this includes a substring

//str->func
var strfunc = taint.replace("reporting", function(match, offset, total) {
	return "not " + match;
}).taint;
assertEq(strfunc.length, 3); //<begin> - "reporting" - in
assertEq(strfunc[1].begin, 24);
assertEq(strfunc[1].end, 33);
assertEq(strfunc[1].operators.length, 3);
assertEq(strfunc[2].begin, 33);
assertEq(strfunc[2].end, 36);
assertEq(strfunc[2].operators.length, 3);
assertEq(typeof strfunc[1].operators[0].param2, "function");

//regexp->empty
var regemp = taint.replace(/\w+/g, "").taint;
assertEq(regemp.length, 2); //dropped the words. remaining taint is space
assertEq(regemp[0].begin, 0);
assertEq(regemp[0].end, 1);
assertEq(regemp[0].operators.length, 3);
//check the correct custom implementation of the substring operator on this node
assertEq(regemp[0].operators[1].op, "substring");
assertEq(regemp[0].operators[1].param1, 5);
assertEq(regemp[0].operators[1].param2, 6);
assertEq(regemp[1].begin, 7);
assertEq(regemp[1].end, 8);
assertEq(regemp[1].operators.length, 3);
assertEq(regemp[1].operators[1].op, "substring");
assertEq(regemp[1].operators[1].param1, 29);
assertEq(regemp[1].operators[1].param2, 30);

//regexp->str
var regstrl = taint.replace(/\w+/, _t("Bonjour")).taint;
assertEq(regstrl.length, 3); //dropped the words. remaining taint is space
assertEq(regstrl[0].begin, 0);
assertEq(regstrl[0].end, 7);
assertEq(regstrl[0].operators.length, 2);
assertEq(regstrl[1].begin, 7);
assertEq(regstrl[1].end, 8);
assertEq(regstrl[1].operators.length, 3);
//check the correct custom implementation of the substring operator on this node
assertEq(regstrl[1].operators[1].op, "substring");
assertEq(regstrl[1].operators[1].param1, 5);
assertEq(regstrl[1].operators[1].param2, 6);
assertEq(regstrl[2].begin, 22);
assertEq(regstrl[2].end, 34);
assertEq(regstrl[2].operators.length, 3);
//regexp->str
var regstrg = taint.replace(/\w+/g, _t("Bonjour")).taint;
assertEq(regstrg.length, 7);

//regexp->dollar
//the taint of the dollar should not be copied itself
var regdoll = taint.replace(/\w+/g, _t("$&")).taint;
assertEq(regdoll.length, 5);
assertEq(regdoll[0].begin, 0);
assertEq(regdoll[0].end, 5);
assertEq(regdoll[0].operators.length, 3);
//this was one taintref before, it should have been split up
assertEq(regdoll[1].begin, 5);
assertEq(regdoll[1].end, 6);
assertEq(regdoll[1].operators.length, 3);

//regexp->func
var regfunc = taint.replace(/\w+/g, function(match, offset, total) {
	return "not " + match;
}).taint;
assertEq(regfunc.length, 5);

reportCompare(true, true);