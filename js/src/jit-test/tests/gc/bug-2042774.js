function rnd(n){return (Math.random()*n)|0;}
var cmds = ["set-color-gray","set-color-black","unset-color","yield",
            "enter-weak-marking-mode","drain"];
for (var iter = 0; iter < 100; iter++) {
  try {
    clearMarkQueue();
    gczeal(11, 1 + rnd(3));               // IncrementalMarkingValidator
    if (rnd(2)) gczeal(9, 1 + rnd(3));    // YieldBeforeSweeping
    var n = rnd(8);
    for (var i = 0; i < n; i++) {
      if (rnd(2)) enqueueMark(cmds[rnd(cmds.length)]);
      else enqueueMark({v:i, w:{x:i}});
    }
    startgc(rnd(40));
    for (var s = 0; s < 8; s++) gcslice(rnd(40));
    finishgc();
    var a = []; for (var j = 0; j < rnd(1500); j++) a.push({p:j});
  } catch(e) {}
}
