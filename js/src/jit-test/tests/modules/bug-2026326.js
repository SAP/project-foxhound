var Z2 = registerModule('Z2', parseModule('export var x = 1;'));
var Z1 = registerModule('Z1', parseModule('import * as ns from "Y";'));
var Y  = registerModule('Y',  parseModule('import "Z1"; export * as e from "Z2";'));
moduleLink(Y);

