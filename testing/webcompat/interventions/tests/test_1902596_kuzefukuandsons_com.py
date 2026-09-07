import pytest

URL = "https://kuzefukuandsons.com/"

UNSUPPORTED_ALERT = "Chrome"
HERO_CSS = ".fa-cart-shopping"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(HERO_CSS, is_displayed=True)
    assert not await client.find_alert(delay=3)
