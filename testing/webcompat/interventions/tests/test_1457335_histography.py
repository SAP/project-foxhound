import pytest

URL = "http://histography.io/"
SUPPORT_URL = "http://histography.io/browser_support.htm"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    assert client.current_url == URL


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert client.current_url == SUPPORT_URL
