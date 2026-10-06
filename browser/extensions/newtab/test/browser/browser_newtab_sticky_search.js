"use strict";

/* global ContentTaskUtils */

/**
 * Tests that we put the search input into a "sticky" state that sticks it to
 * the top of the page once it starts to scroll out of frame.
 */
test_newtab({
  async before({ pushPrefs }) {
    // Sticky search is gated by `@media (height > 700px)`. Headless
    // mochitest can default to a window shorter than that, so resize the
    // chrome window before the content tab opens and restore on cleanup
    // so we don't perturb other tests.
    const initialWidth = window.outerWidth;
    const initialHeight = window.outerHeight;
    if (window.outerHeight < 1000) {
      const resized = BrowserTestUtils.waitForEvent(window, "resize", false);
      window.resizeTo(initialWidth, 1000);
      await resized;
    }
    registerCleanupFunction(async () => {
      if (
        window.outerHeight !== initialHeight ||
        window.outerWidth !== initialWidth
      ) {
        const resized = BrowserTestUtils.waitForEvent(window, "resize", false);
        window.resizeTo(initialWidth, initialHeight);
        await resized;
      }
    });

    await pushPrefs(
      ["browser.newtabpage.activity-stream.nova.enabled", true],
      ["browser.newtabpage.activity-stream.showSearch", true],
      ["browser.newtabpage.activity-stream.feeds.topsites", true],
      ["browser.newtabpage.activity-stream.feeds.system.topstories", true],
      [
        "browser.newtabpage.activity-stream.discoverystream.config",
        JSON.stringify({ collapsible: true, enabled: true }),
      ]
    );
  },

  test: async function test_sticky_search_nova() {
    Assert.greater(
      content.window.innerHeight,
      700,
      "Test window should be tall enough for the sticky search media query"
    );

    const wrapper = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector(".search-wrapper"),
      "Wait for the search-wrapper to render"
    );
    const outer = content.document.querySelector(".nova-outer-wrapper");
    const sentinel = content.document.querySelector(".sticky-search-sentinel");

    ok(outer, "Nova layout rendered (.nova-outer-wrapper present)");
    ok(sentinel, "IntersectionObserver sentinel rendered");
    ok(
      !outer.classList.contains("stuck-search"),
      "Not stuck on initial render"
    );

    // By default, we don't show stories for mochitest-browser tests, but that
    // makes scroll tests hard. So we inject a tall spacer into .content to make
    // the page scrollable.
    const contentEl = content.document.querySelector(".content");
    const spacer = content.document.createElement("div");
    spacer.dataset.testSpacer = "sticky-search";
    spacer.style.cssText = "block-size: 3000px; visibility: hidden;";
    contentEl.appendChild(spacer);

    // Scroll just past the wrapper to engage sticky. getBoundingClientRect
    // will flush layout, so we can assume that the spacer will have taken
    // effect.
    const wrapperTopInitial = wrapper.getBoundingClientRect().top;
    content.window.scrollTo(0, wrapperTopInitial + 50);

    await ContentTaskUtils.waitForCondition(
      () => outer.classList.contains("stuck-search"),
      "Wait for stuck-search class to be applied"
    );

    const wrapperTopWhenStuck = wrapper.getBoundingClientRect().top;
    Assert.less(
      Math.abs(wrapperTopWhenStuck),
      5,
      `Sticky wrapper sits at viewport top after engaging (top=${wrapperTopWhenStuck})`
    );

    // Now scroll quite a ways down and ensure that the stickyness persists.
    content.window.scrollTo(0, wrapperTopInitial + 1000);
    const wrapperTopAfterLongScroll = wrapper.getBoundingClientRect().top;
    Assert.less(
      Math.abs(wrapperTopAfterLongScroll),
      5,
      "Sticky wrapper remains pinned at viewport top after long scroll " +
        `(top=${wrapperTopAfterLongScroll})`
    );
    ok(
      outer.classList.contains("stuck-search"),
      "stuck-search class remains applied after long scroll"
    );

    // Scroll back to the top — wrapper should unstick.
    content.window.scrollTo(0, 0);
    await ContentTaskUtils.waitForCondition(
      () => !outer.classList.contains("stuck-search"),
      "Wait for stuck-search class to be removed"
    );

    spacer.remove();
  },
});
