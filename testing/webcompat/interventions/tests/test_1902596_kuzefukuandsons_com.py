import pytest

URL = "https://kuzefukuandsons.com/"

UNSUPPORTED_ALERT = "Google Chrome"
LOGIN_CSS = "#kuze-fuku-amp-sons"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(LOGIN_CSS, is_displayed=True)
    assert not await client.find_alert(delay=3)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    assert await client.await_alert(UNSUPPORTED_ALERT)
