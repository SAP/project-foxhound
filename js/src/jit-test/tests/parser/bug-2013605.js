// The following shouldn't crash.
try {
  var code = "(a";
  for (var i = 0; i < 300000; i++) {
    code += ".b";
  }
  code += " = function(){})()";
  eval(code);
} catch (e) {
}
