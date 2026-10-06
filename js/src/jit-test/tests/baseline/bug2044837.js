// |jit-test| --ion-offthread-compile=off; --ion-warmup-threshold=0; --baseline-eager

function a(b) {
    b.c;
}

for (var d = 0; d < 10; d++) {
    var e = Object;
    a(e);
}

resetFallbackStubStates(a);

a({});
