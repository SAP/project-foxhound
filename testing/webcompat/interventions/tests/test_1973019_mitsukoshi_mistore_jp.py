import pytest
from webdriver import NoSuchElementException

URL = "https://mitsukoshi.mistore.jp/bunka/culture/index_sp.html"
HERO_CSS = "#add-main"


async def does_redirect(client):
    await client.navigate(URL)
    try:
        client.await_css(HERO_CSS, is_displayed=True, timeout=10)
        return False
    except NoSuchElementException:
        return True


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await does_redirect(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await does_redirect(client)
