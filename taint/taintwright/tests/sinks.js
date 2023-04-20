TEST('sink: location.hash', () => {
    location.hash = String.tainted("payload");
    assertSinkHit();
});
