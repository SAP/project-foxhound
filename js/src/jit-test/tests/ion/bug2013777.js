gczeal(10);

function Ctor() {
  this.b = 1;
}
let arr = [Ctor];

for (let i = 0; i < 1500; i++) {
  Ctor();
  Ctor.prototype = arr[(i == 900) | 0];
  new Ctor();
}
