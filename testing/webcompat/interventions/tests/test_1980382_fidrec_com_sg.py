import pytest

URL = "https://www.fidrec.com.sg/diy/"

RADIO_CSS = "input[type=radio]#fidrec_newquestion1_2"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert not client.is_one_solid_color(client.await_css(RADIO_CSS, is_displayed=True))


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, wait="none")
    assert client.is_one_solid_color(client.await_css(RADIO_CSS, is_displayed=True))
