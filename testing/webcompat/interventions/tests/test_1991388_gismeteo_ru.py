import pytest

URL = "https://gismeteo.ru/"
MOBILE_CSS = "button.btn-burger"
DESKTOP_CSS = ".search-desktop"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL)
    assert client.await_css(MOBILE_CSS, is_displayed=True)
    assert not client.find_css(DESKTOP_CSS, is_displayed=True)
