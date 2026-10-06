// The line number fits the range.
{
  const g = newGlobal({newCompartment: true});
  const dbg = new Debugger(g);
  g.evaluate("var f = () => 1;", { lineNumber: 0xFFFFFFFE });
  const s = dbg.findScripts().filter(s => s.isFunction)[0];
  const loc = s.getOffsetLocation(1);
  assertEq(loc.lineNumber, 0xFFFFFFFE);
}

// The line number overflows the Debugger.Script's range.
{
  const g = newGlobal({newCompartment: true});
  const dbg = new Debugger(g);
  g.evaluate("var f = () => 1;", { lineNumber: 0xFFFFFFFF });
  const s = dbg.findScripts().filter(s => s.isFunction)[0];
  let caught = false;
  try {
    s.getOffsetLocation(1);
  } catch (e) {
    caught = true;
    assertEq(e.message, "line number out of range");
  }
  assertEq(caught, true);
}

// The line number overflows the Debugger.Script's range, after newline.
{
  const g = newGlobal({newCompartment: true});
  const dbg = new Debugger(g);
  g.evaluate("\nvar f = () => 1;", { lineNumber: 0xFFFFFFFE });
  const s = dbg.findScripts().filter(s => s.isFunction)[0];
  let caught = false;
  try {
    s.getOffsetLocation(1);
  } catch (e) {
    caught = true;
    assertEq(e.message, "line number out of range");
  }
  assertEq(caught, true);
}

// The line number overflows the Debugger.Script's range, after newline,
// after another opcode.
{
  const g = newGlobal({newCompartment: true});
  const dbg = new Debugger(g);
  g.evaluate("1;\nvar f = () => 1;", { lineNumber: 0xFFFFFFFE });
  const s = dbg.findScripts().filter(s => s.isFunction)[0];
  let caught = false;
  try {
    s.getOffsetLocation(1);
  } catch (e) {
    caught = true;
    assertEq(e.message, "line number out of range");
  }
  assertEq(caught, true);
}

// The line number overflows the Debugger.Script's range, after setline.
{
  const g = newGlobal({newCompartment: true});
  const dbg = new Debugger(g);
  g.evaluate("\n\nvar f = () => 1;", { lineNumber: 0xFFFFFFFD });
  const s = dbg.findScripts().filter(s => s.isFunction)[0];
  let caught = false;
  try {
    s.getOffsetLocation(1);
  } catch (e) {
    caught = true;
    assertEq(e.message, "line number out of range");
  }
  assertEq(caught, true);
}

// The line number overflows the Debugger.Script's range, after setline,
// after another opcode.
{
  const g = newGlobal({newCompartment: true});
  const dbg = new Debugger(g);
  g.evaluate("1;\n\nvar f = () => 1;", { lineNumber: 0xFFFFFFFD });
  const s = dbg.findScripts().filter(s => s.isFunction)[0];
  let caught = false;
  try {
    s.getOffsetLocation(1);
  } catch (e) {
    caught = true;
    assertEq(e.message, "line number out of range");
  }
  assertEq(caught, true);
}

// The line number overflows in the frontend.
{
  const g = newGlobal({newCompartment: true});
  const dbg = new Debugger(g);
  let caught = false;
  try {
    g.evaluate("\n\n\nvar f = () => 1", { lineNumber: 0xFFFFFFFD });
  } catch (e) {
    caught = true;
    assertEq(e.message, "line number out of range");
  }
  assertEq(caught, true);
}
