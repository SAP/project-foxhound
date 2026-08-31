"use strict";

// These URLs are not actually animated — we only need two distinct,
// load-safe chrome:// URLs to verify that the toggle swaps the rendered
// asset between them.
const HERO_URL_PLAYING = "chrome://branding/content/about-logo.svg";
const HERO_URL_PAUSED = "chrome://branding/content/icon64.png";
const BG_PLAYING = `url(${HERO_URL_PLAYING}) center / cover no-repeat`;
const BG_PAUSED = `url(${HERO_URL_PAUSED}) center / cover no-repeat`;

const BUTTON_SELECTOR = "button.animation-play-pause-button";
const SECTION_SECONDARY_SELECTOR = ".section-secondary";
const HERO_IMG_SELECTOR = ".section-secondary .hero-image img";

add_setup(async function () {
  await SpecialPowers.pushPrefEnv({
    set: [["ui.prefersReducedMotion", 0]],
  });
});

async function clickPlayPauseButton(browser) {
  await SpecialPowers.spawn(browser, [BUTTON_SELECTOR], async sel => {
    const button = await ContentTaskUtils.waitForCondition(
      () => content.document.querySelector(sel),
      `Should find ${sel}`
    );
    button.click();
  });
}

async function expectButtonState(browser, { pressed, paused }) {
  await SpecialPowers.spawn(
    browser,
    [{ pressed, paused, sel: BUTTON_SELECTOR }],
    async ({ pressed: expectPressed, paused: expectPaused, sel }) => {
      await ContentTaskUtils.waitForCondition(() => {
        const btn = content.document.querySelector(sel);
        return (
          btn &&
          btn.getAttribute("aria-pressed") === String(expectPressed) &&
          btn.classList.contains("paused") === expectPaused
        );
      }, `Button aria-pressed=${expectPressed}, paused=${expectPaused}`);
    }
  );
}

async function expectHeroSrc(browser, expectedUrl) {
  await SpecialPowers.spawn(
    browser,
    [{ expectedUrl, sel: HERO_IMG_SELECTOR }],
    async ({ expectedUrl: url, sel }) => {
      await ContentTaskUtils.waitForCondition(() => {
        const img = content.document.querySelector(sel);
        return img && img.getAttribute("src") === url;
      }, `Hero image should resolve to ${url}`);
    }
  );
}

async function expectSectionBackgroundUrl(browser, expectedUrl) {
  await SpecialPowers.spawn(
    browser,
    [{ expectedUrl, sel: SECTION_SECONDARY_SELECTOR }],
    async ({ expectedUrl: url, sel }) => {
      await ContentTaskUtils.waitForCondition(() => {
        const section = content.document.querySelector(sel);
        return section?.style.backgroundImage.includes(url);
      }, `Section secondary background-image should reference ${url}`);
    }
  );
}

/**
 * The toggle should be absent when the screen has no static fallback.
 */
add_task(async function test_no_button_without_static_fallback() {
  const SCREENS = [
    {
      id: "AW_ANIMATED_NO_FALLBACK",
      content: {
        position: "split",
        title: "Animated screen without fallback",
        background: BG_PLAYING,
        hero_image: { url: HERO_URL_PLAYING },
        primary_button: { label: "Next", action: { navigate: true } },
      },
    },
  ];
  const browser = await openAboutWelcome(JSON.stringify(SCREENS));
  await test_screen_content(
    browser,
    "renders split screen without play/pause button",
    [SECTION_SECONDARY_SELECTOR],
    [BUTTON_SELECTOR]
  );
});

/**
 * The toggle should appear and pause/resume animated content for a screen
 * that includes a static fallback for both the background and the hero image.
 */
add_task(async function test_button_toggles_static_and_animated() {
  const SCREENS = [
    {
      id: "AW_ANIMATED_WITH_FALLBACK",
      content: {
        position: "split",
        title: "Animated screen with fallback",
        background: BG_PLAYING,
        background_static: BG_PAUSED,
        hero_image: {
          url: HERO_URL_PLAYING,
          static_url: HERO_URL_PAUSED,
        },
        primary_button: { label: "Next", action: { navigate: true } },
      },
    },
  ];
  const browser = await openAboutWelcome(JSON.stringify(SCREENS));

  // Button is present and starts in the playing state.
  await test_screen_content(
    browser,
    "renders split screen with play/pause button",
    [BUTTON_SELECTOR, HERO_IMG_SELECTOR]
  );
  await expectButtonState(browser, { pressed: false, paused: false });
  await expectHeroSrc(browser, HERO_URL_PLAYING);
  await expectSectionBackgroundUrl(browser, HERO_URL_PLAYING);

  // Pause -> static fallback is shown.
  await clickPlayPauseButton(browser);
  await expectButtonState(browser, { pressed: true, paused: true });
  await expectHeroSrc(browser, HERO_URL_PAUSED);
  await expectSectionBackgroundUrl(browser, HERO_URL_PAUSED);

  // Resume -> animated source is restored.
  await clickPlayPauseButton(browser);
  await expectButtonState(browser, { pressed: false, paused: false });
  await expectHeroSrc(browser, HERO_URL_PLAYING);
  await expectSectionBackgroundUrl(browser, HERO_URL_PLAYING);
});

/**
 * When the user has prefers-reduced-motion: reduce set, the toggle should
 * mount in the paused state and the static fallback assets should be shown
 * without any user interaction.
 */
add_task(async function test_starts_paused_with_reduced_motion() {
  await SpecialPowers.pushPrefEnv({
    set: [["ui.prefersReducedMotion", 1]],
  });
  const SCREENS = [
    {
      id: "AW_ANIMATED_REDUCED_MOTION",
      content: {
        position: "split",
        title: "Animated screen with fallback",
        background: BG_PLAYING,
        background_static: BG_PAUSED,
        hero_image: {
          url: HERO_URL_PLAYING,
          static_url: HERO_URL_PAUSED,
        },
        primary_button: { label: "Next", action: { navigate: true } },
      },
    },
  ];
  const browser = await openAboutWelcome(JSON.stringify(SCREENS));
  await test_screen_content(
    browser,
    "renders split screen with play/pause button",
    [BUTTON_SELECTOR, HERO_IMG_SELECTOR]
  );
  await expectButtonState(browser, { pressed: true, paused: true });
  await expectHeroSrc(browser, HERO_URL_PAUSED);
  await expectSectionBackgroundUrl(browser, HERO_URL_PAUSED);
});
