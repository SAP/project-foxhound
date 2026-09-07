function test() {
    let o = new FakeDOMObject();
    o.foobar = 1;
}

for (var i = 0; i < 3000; i++) {
    test();
}
