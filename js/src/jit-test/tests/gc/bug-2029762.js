gczeal(0);
let fr = new FinalizationRegistry(()=>{});
fr.register({}, 0, Symbol());
schedulezone(this);
startgc(1);
while(gcstate()!=='NotActive') gcslice(100);
