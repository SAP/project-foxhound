TEST('location.hash', () => {
    // Assure location.hash is not empty
    location.hash = "payload";

    assertIsTainted(location.hash);

    // Clear location.hash to unclutter URL
    location.hash = "";
});

TEST('location', () => {
    assertIsTainted(location.href, "location.href");
    assertIsTainted(location.host, "location.host");
    assertIsTainted(location.hostname, "location.hostname");
    assertIsTainted(location.origin, "location.origin");
    assertIsTainted(location.pathname, "location.pathname");
    assertIsTainted(location.port, "location.port");
    assertIsTainted(location.protocol, "location.protocol");

    // location.search is empty in our case
    location.search = "payload";
    assertIsTainted(location.search, "location.search");
});


TEST('window', () => {
    // Write something to window.name (empty by default)
    window.name = "payload";

    assertIsTainted(window.name);
});

/*
TEST('script.innerHTML', () => {
    assertIsTainted(document.currentScript.innerHTML);
});
*/
