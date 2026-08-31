function mutate(object) {
  with ({}) {} // Don't inline.
  if (i === 2000) {
    i++;
    object.setter = 1;
  } else if (i === 2001) {
    object.prop1 = 2;
  }
}
function f() {
  var object = {
    set setter(v) {
      mutate(object);
      this.prop2 = 0;
    },
  };
  object.setter = 1;
}
for (var i = 0; i < 2200; i++) {
  f();
}
