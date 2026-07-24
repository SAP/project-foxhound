import pytest
from webdriver import NoSuchElementException

URL = "https://gamma.app/signup"
UNSUPPORTED_TEXT = "works best on Chrome"


async def does_warning_show(client):
    await client.navigate(URL)
    try:
        client.await_text(UNSUPPORTED_TEXT, is_displayed=True, timeout=3)
        return True
    except NoSuchElementException:
        return False


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await does_warning_show(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await does_warning_show(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_not_shown_on_android(client):
    assert not await does_warning_show(client)
