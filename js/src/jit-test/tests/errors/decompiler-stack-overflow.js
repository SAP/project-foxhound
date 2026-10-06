// |jit-test| error:is not a function
var src = "(" + "0+".repeat(500000) + "0)()";
eval(src);
