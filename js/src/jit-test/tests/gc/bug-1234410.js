enableGeckoProfiling();
oomTest(() => {
    try {
        for (var quit of oomTest.gcparam("//").ArrayBuffer(1)) {}
    } catch (e) {}
});

