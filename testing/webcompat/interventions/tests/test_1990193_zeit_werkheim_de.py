import pytest
from webdriver.error import NoSuchElementException

URL = "http://zeit.werkheim.de:8080/"
LOGIN_CSS = "#InputBenutzername"


async def does_site_finish_loading(client):
    await client.navigate(URL)
    try:
        client.await_css(LOGIN_CSS, is_displayed=True, timeout=10)
        return True
    except NoSuchElementException:
        return False


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await does_site_finish_loading(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await does_site_finish_loading(client)
