import pytest
from webdriver.error import NoSuchElementException, NoSuchWindowException

URL = "https://www.doubao.com/slides/X7hPs44sPlRWkUd1qCscZiscngd"
IFRAME_CSS = "#flow-slides-iframe"
MOBILE_HERO_CSS = ".slide-page-block"
DESKTOP_HERO_CSS = "[data-test-id=TransformationBtn]"
UNSUPPORTED_TEXT = "此浏览器存在兼容性问题会影响你的正常使用"


async def visit_site(client, platform):
    for _ in range(5):
        await client.navigate(URL)
        try:
            client.switch_to_frame(client.await_css(IFRAME_CSS, is_displayed=True))
            hero = MOBILE_HERO_CSS if platform == "android" else DESKTOP_HERO_CSS
            client.await_css(hero, is_displayed=True, timeout=45)
            return
        except (NoSuchElementException, NoSuchWindowException):
            pass
    raise ValueError("Site appears to be unable to load successfully")


# The page fails to load when we spoof Android, so require the emulator
@pytest.mark.actual_platform_required
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client, platform):
    await visit_site(client, platform)
    await client.stall(5)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.actual_platform_required
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client, platform):
    await visit_site(client, platform)
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
