enableLastWarning();
new Function(`"use asm"; return {};`);
var warning = getLastWarning();
assertEq(warning !== null, true, "warning should be caught");
assertEq(warning.name, "Warning");
assertEq(warning.lineNumber, 3);
assertEq(warning.columnNumber, 1);
