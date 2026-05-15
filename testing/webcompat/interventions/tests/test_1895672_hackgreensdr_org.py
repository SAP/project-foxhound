import pytest

URL = "http://hackgreensdr.org:8901/"

AUDIO_START_CSS = "input[type=button][value='Chrome audio start']"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    client.await_css(AUDIO_START_CSS, is_displayed=True, timeout=4000)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    await client.stall(3)
    assert not client.find_css(AUDIO_START_CSS, is_displayed=True)
