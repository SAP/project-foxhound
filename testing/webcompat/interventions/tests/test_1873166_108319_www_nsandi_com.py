import pytest

URL = "https://www.nsandi.com/"

CHAT_BUTTON_CSS = "#GCLauncherbtn"
UNSUPPORTED_TEXT = "Chrome or Safari"


async def is_warning_shown(client):
    await client.navigate(URL)
    client.await_css(CHAT_BUTTON_CSS, is_displayed=True)
    return client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await is_warning_shown(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await is_warning_shown(client)
