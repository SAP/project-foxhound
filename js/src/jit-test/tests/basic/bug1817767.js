function a(b) {
  var x = {};
  x[b] = true;
  return Object.getOwnPropertyNames(x)[0];
}
c = "aaaaaaaaaaaaaaaaaa111aaaa";
d = "foo" + c;
e = "bar" + d;
f = "\u1200" + d;
f.lastIndexOf();
a(e);
