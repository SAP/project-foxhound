load(libdir + "asserts.js");

assertThrowsInstanceOf(() => new RegExp(/\p/, "u"), SyntaxError);
assertThrowsInstanceOf(() => new RegExp(/\p/, "v"), SyntaxError);

new RegExp(/\p{Letter}/, "u");
new RegExp(/\p{Letter}/, "v");
