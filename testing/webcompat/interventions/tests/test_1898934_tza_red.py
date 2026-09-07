import pytest
from webdriver.error import NoSuchElementException

URL = "https://tza.red/"

UNSUPPORTED_TEXT = "browser is partially supported"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    try:
        client.await_text(UNSUPPORTED_TEXT, is_displayed=True, timeout=5)
        assert False
    except NoSuchElementException:
        assert True


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
