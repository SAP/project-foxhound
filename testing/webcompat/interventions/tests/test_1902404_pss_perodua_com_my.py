import pytest

URL = "https://pss.perodua.com.my/"

SUPPORTED_CSS = "#userid"
UNSUPPORTED_ALERT = "use Google Chrome"
UNSUPPORTED_TEXT = "Forgot password?"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    assert client.await_css(SUPPORTED_CSS)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not await client.find_alert(delay=3)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert await client.await_alert(UNSUPPORTED_ALERT)
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_css(SUPPORTED_CSS, is_displayed=True)
