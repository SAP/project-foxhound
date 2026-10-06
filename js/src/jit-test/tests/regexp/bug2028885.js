function FakeCtor() {}
FakeCtor.prototype = RegExp.prototype;
let rx = Reflect.construct(RegExp, ["a", "y"], FakeCtor);
"abc".split(rx);
