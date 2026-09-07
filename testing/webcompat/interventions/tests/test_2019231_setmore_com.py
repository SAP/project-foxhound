import pytest

URL = "https://youthrockband.setmore.com/"
BROKEN_TEXT = "something went wrong"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    assert not client.find_text(BROKEN_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert client.find_text(BROKEN_TEXT, is_displayed=True)
