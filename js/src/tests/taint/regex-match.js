load("taint/taint-setup.js");

//match

var taint = _MultiTaint();


//plain string matching
var plain = taint.match(_t("reporting"))[0].taint;
assertEq(plain.length, 1);
assertEq(plain[0].begin, 0);
assertEq(plain[0].end, 9); //len(reporting)
assertEq(plain[0].operators.length, 3); //source + substring + match
assertEq(plain[0].operators[0].op, "match");
assertEq(plain[0].operators[0].param1, "reporting"); //the pattern
assertEq(plain[0].operators[0].param2, 0); //first and only match
assertEq(plain[0].operators[1].op, "substring");


//local match
// string
// ["Hello", "Hello"] (first word, two times because of parantheses)
var localstr = taint.match("(\\w+)");
//a match for equal taint is not possible due to different params
assertEq(localstr[0].taint.length, localstr[1].taint.length);
assertEq(localstr[0].taint.length, 1);
assertEq(localstr[0].taint[0].begin, 0);
assertEq(localstr[0].taint[0].end, 5); //len(Hello)
assertEq(localstr[0].taint[0].operators.length, 3); //source + substring + match
assertEq(localstr[0].taint[0].operators[0].op, "match");
assertEq(localstr[0].taint[0].operators[0].param1, "(\\w+)"); //the pattern
assertEq(localstr[0].taint[0].operators[0].param2, 0); //the whole match
assertEq(localstr[0].taint[0].operators[1].op, "substring");
assertEq(localstr[1].taint[0].begin, 0);
assertEq(localstr[1].taint[0].end, 5); //len(Hello)
assertEq(localstr[1].taint[0].operators.length, 3); //source + substring + match
assertEq(localstr[1].taint[0].operators[0].op, "match");
assertEq(localstr[1].taint[0].operators[0].param1, "(\\w+)"); //the pattern
assertEq(localstr[1].taint[0].operators[0].param2, 1); //the first paranthesis
assertEq(localstr[1].taint[0].operators[1].op, "substring");
//regex
var localregex = taint.match(/(\w+)/);
//same regex
_equalTaint(localstr, localregex);

//global match
var globalregex = taint.match(/(\w+)/g).map(function(r) { return r.taint; }).filter(function(r) { return r.length > 0; });
//5 matching words with 3/5 taint
for(var i in globalregex) {
	var ntaint = globalregex[i][0];
	assertEq(globalregex[i].length, 1);
	assertEq(ntaint.operators.length, 3); //source + substring + match
	assertEq(ntaint.operators[0].op, "match");
	assertEq(ntaint.operators[0].param1, "(\\w+)"); //the pattern
	assertEq(ntaint.operators[1].op, "substring");
}

reportCompare(true, true);