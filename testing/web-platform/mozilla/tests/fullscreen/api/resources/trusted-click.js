/**
 * Invokes callback from a trusted click event, avoiding interception by fullscreen element.
 *
 * @param {Element} container - Element where button will be created and clicked.
 */
function trusted_click(container = document.body) {
    var document = container.ownerDocument;
    var button = document.createElement("button");
    button.textContent = "click to continue test";
    button.style.display = "block";
    button.style.fontSize = "20px";
    button.style.padding = "10px";
    button.addEventListener("click", () => {
        button.remove();
    });
    container.appendChild(button);
    if (window.top !== window) test_driver.set_test_context(window.top);
    // Race them for manually testing...
    return Promise.race([
        test_driver.click(button),
        new Promise((resolve) => {
            button.addEventListener("click", resolve);
        }),
    ]);
}
