import pytest

URL = "https://www.pge.com/"
UNSUPPORTED_TEXT = "use a browser listed at"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    await client.stall(4)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
