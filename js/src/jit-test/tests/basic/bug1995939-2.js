// |jit-test| --trial-inlining-warmup-threshold=10; --ion-offthread-compile=off

d = function(a,b) {}
class e extends d {}
f = function() {}.bind()
for (i=0; i<2000; ++i) {
  g = f
  Reflect.construct(e, [], g)
}
