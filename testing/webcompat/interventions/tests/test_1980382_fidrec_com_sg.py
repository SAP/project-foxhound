import pytest

URL = "https://www.fidrec.com.sg/diy/"

RADIO_CSS = "input[type=radio]#fidrec_newquestion1_2"


async def radio_is_one_solid_color(client):
    await client.navigate(URL, wait="none")
    radio = client.await_css(RADIO_CSS, is_displayed=True)
    await client.stall(1)
    return client.is_one_solid_color(radio)


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await radio_is_one_solid_color(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await radio_is_one_solid_color(client)
