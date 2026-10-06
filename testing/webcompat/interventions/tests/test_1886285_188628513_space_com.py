import pytest

URL = "https://www.space.com/"
HERO_CSS = "#skywatching"
FUTURE_PLC_TRENDING_LIST_CSS = ".trending__list"


@pytest.mark.skip_platforms("android")
@pytest.mark.need_visible_scrollbars
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    client.await_css(HERO_CSS, is_displayed=True)
    assert not client.find_css(FUTURE_PLC_TRENDING_LIST_CSS, is_displayed=True)
