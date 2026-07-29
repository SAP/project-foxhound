let cleaned = 0;
let reg = new FinalizationRegistry(() => { cleaned++; });

const N = 1000;
for (let i = 0; i < N; i++) {
  reg.register({}, null);
}

gc();
drainJobQueue();
assertEq(cleaned, N);

gc(); gc();
const withRegistry = gcparam("gcBytes");
reg = null;
gc(); gc();
const withoutRegistry = gcparam("gcBytes");

const retained = withRegistry - withoutRegistry;
assertEq(retained < N * 32, true);
