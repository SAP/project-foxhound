gczeal(2);
a = newGlobal({newCompartment: true});
Debugger(a).onEnterFrame = function(b) {
  if (b.type == "eval")
    return;
  b.eval("this");
}
a.eval("var bar = function() {}; bar.call(2)");
