function htmlTaint() {
    location.hash = document.body.textContent;
}

TEST("htmlTaint", () => {
    assertIsTainted(document.body.textContent);
});
