const opt = (function() {
    class RNG {
        a = 11;
        b = 22;
        c;
    }
    let rng = new RNG();
    function func() {return rng}
    return func;
})();

BigInt64Array[0] = [1.1, 2.2, 3.3];
let va;
try { va = this.addMarkObservers(BigInt64Array); } catch (e) {}
this.relazifyFunctions(this, this, va, this);
gc();
