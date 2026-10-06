// Debugger.prototype.findScripts can filter scripts by line number.
var g = newGlobal({newCompartment: true});
var dbg = new Debugger();
var gw = dbg.addDebuggee(g);

var scriptname = scriptdir + 'Debugger-findScripts-11-script2';
g.load(scriptname);

var gfw = gw.makeDebuggeeValue(g.f);
var ggw = gw.makeDebuggeeValue(g.f());
var ghw = gw.makeDebuggeeValue(g.h);

// Specifying a line outside of all functions screens out all function scripts.
assertEq(dbg.findScripts({url:scriptname, line:3}).indexOf(gfw.script) != -1, false);
assertEq(dbg.findScripts({url:scriptname, line:3}).indexOf(ggw.script) != -1, false);
assertEq(dbg.findScripts({url:scriptname, line:3}).indexOf(ghw.script) != -1, false);

// Specifying a different url screens out scripts, even when global and line match.
assertEq(dbg.findScripts({url:"xlerb", line:7}).indexOf(gfw.script) != -1, false);
assertEq(dbg.findScripts({url:"xlerb", line:7}).indexOf(ggw.script) != -1, false);
assertEq(dbg.findScripts({url:"xlerb", line:7}).indexOf(ghw.script) != -1, false);

// A line number within a function selects that function's script.
assertEq(dbg.findScripts({url:scriptname, line:7}).indexOf(gfw.script) != -1, true);
assertEq(dbg.findScripts({url:scriptname, line:7}).indexOf(ggw.script) != -1, false);
assertEq(dbg.findScripts({url:scriptname, line:7}).indexOf(ghw.script) != -1, false);

// A line number within a nested function selects all enclosing functions' scripts.
assertEq(dbg.findScripts({url:scriptname, line:9}).indexOf(gfw.script) != -1, true);
assertEq(dbg.findScripts({url:scriptname, line:9}).indexOf(ggw.script) != -1, true);
assertEq(dbg.findScripts({url:scriptname, line:9}).indexOf(ghw.script) != -1, false);

// A line number in a non-nested function selects that function.
assertEq(dbg.findScripts({url:scriptname, line:14}).indexOf(gfw.script) != -1, false);
assertEq(dbg.findScripts({url:scriptname, line:14}).indexOf(ggw.script) != -1, false);
assertEq(dbg.findScripts({url:scriptname, line:14}).indexOf(ghw.script) != -1, true);
