gczeal(0);
evaluate(`
  Object.defineProperty(this, "x", {
    value:{
      b: evaluate, evaluate(c) { d = x.b(c) }
    }
  })
  for (e in this);
`)
gczeal(8, 1)
x.evaluate("")
gczeal(11,)
gczeal(7, 1)
evaluate(`
  if (largeArrayBufferSupported) {
    function g() { p }
    q = {}
  }
  h = [""]
  j = k = [,,,,,, ]
  l = [...j, ...k]
  m = [,,,,,,, Symbol(),, ...h ]
  n = [  ...m,  ...l]
  o = [...n]
`)
