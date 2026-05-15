/// This test case makes use of InputScope::hasOnChain, which should report the
/// proper scope to bind names properly without asserting.
function f0() {
    for (let i = (() => {
            return 0;
        })();
        i < 1;
        i++) {
    }
    return f0;
}
const f1 = `${f0}`;
const a1 = { eagerDelazificationStrategy: "CheckConcurrentWithOnDemand" };
a1.envChainObject = a1;
evaluate(f1, a1);
