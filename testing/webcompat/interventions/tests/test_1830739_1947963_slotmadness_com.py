import pytest

URL = "https://www.slotmadness.com/webplay"
PRACTICE_FIRST_GAME_CSS = "button.cta.practice"
GAME_IFRAME_CSS = "#gameiframe"
UNSUPPORTED_CSS = ".unsupported-device-box"
SUPPORTED_CSS = "#game_main"


async def get_to_page(client):
    await client.navigate(URL)
    client.soft_click(client.await_css(PRACTICE_FIRST_GAME_CSS))
    client.switch_frame(client.await_css(GAME_IFRAME_CSS))


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await get_to_page(client)
    assert client.await_css(SUPPORTED_CSS, timeout=30)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await get_to_page(client)
    assert client.await_css(UNSUPPORTED_CSS, timeout=30)
