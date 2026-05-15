assertThrowsInstanceOf(() => {
    const v = new FinalizationRegistry(() => {});
    v.unregister();
}, TypeError);

reportCompare(0, 0);
