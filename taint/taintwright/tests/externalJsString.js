function externalJsString() {
    location.hash = external_js_string;
}

TEST("externalJsString", () => {
    assertIsTainted(external_js_string);
});
