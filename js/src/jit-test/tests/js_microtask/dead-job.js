function b(global) {
    var resolve;
    new Promise(d => resolve = d).then(global.Function)
    resolve()

    globalOfFirstJobInQueue()
}

let g1 = newGlobal()
let g2 = newGlobal({
    newCompartment: true
})

nukeAllCCWs()

caught = false;
try {
    b(g2)
} catch (exception) {
    caught = true;
    assertEq(exception.message.includes("dead object"), true);
}
assertEq(caught, true);
