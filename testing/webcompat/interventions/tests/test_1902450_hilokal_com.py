import pytest
from webdriver import NoSuchElementException

URL = "https://www.hilokal.com/"
UNSUPPORTED_TEXT = "Chrome"
HERO_CSS = "button.download-button"
LISTEN_BUTTON_CSS = "button.home-main-listen-button-text"


async def does_warning_appear(client):
    await client.navigate(URL)
    try:
        client.await_text(UNSUPPORTED_TEXT, is_displayed=True, timeout=3)
        return True
    except NoSuchElementException:
        return False


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await does_warning_appear(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await does_warning_appear(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_missing_android_support(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(HERO_CSS, is_displayed=True)
    await client.stall(1)
    assert not client.find_css(LISTEN_BUTTON_CSS, is_displayed=True)
