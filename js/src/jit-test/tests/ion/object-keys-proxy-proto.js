for (var i = 0 ; i < 99 ; i++) {
  [].__proto__.__proto__ = new Proxy(Object, Object);
  Object.keys([]);
}
