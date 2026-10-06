function setup() {
    gczeal(11);
    gczeal(8);
    startgc(1);
    gcslice(1);
}
for (let i = 0; i < 2; i++) {
    const g = newGlobal({newCompartment: true});
    Debugger(g).onEnterFrame = function() {};
    g.eval(`(async()=>{await 0})()`);
}
oomTest(setup);
