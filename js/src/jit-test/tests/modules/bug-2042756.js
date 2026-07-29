var g = newGlobal({ newCompartment: true });
var dbg = new Debugger(g);
var armed = false, pc = 0;
dbg.onEnterFrame = function (frame) {
  frame.onStep = function () {
    if (!armed) {
      return;
    }

    var u = "";
    try {
      u = String(frame.script.url);
    } catch (e) {}

    if (u === "parent.js") {
      pc++;
      if (pc >= 3) {
        return { throw: "boom-from-debugger" };
      }
    }
  };
};
g.eval(`
  var child = parseModule("await new Promise(r => { globalThis.__pc = r; }); export let cv = 10;", "child.js");
  registerModule("child", child);
  var parent = parseModule("import { cv } from 'child'; await new Promise(r => { globalThis.__pp = r; }); globalThis.result = cv + 1;", "parent.js");
  moduleLink(parent);
  var ev = moduleEvaluate(parent);
  if (ev && ev.then) ev.then(() => {}, () => {});
`);
g.eval("try { globalThis.__pp(1); } catch (e) {}");
try { drainJobQueue(); } catch (e) {}
armed = true;
g.eval("try { globalThis.__pc(1); } catch (e) {}");
try { drainJobQueue(); } catch (e) {}
