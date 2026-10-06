import pytest

URL = "https://www.camper-van-week-end.fr/chantilly/"
LOADING_CSS = "#pageloader"
ERROR_MSG = "TypeError: can't access property 0, match is null"


@pytest.mark.only_platforms("linux")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    client.await_css(LOADING_CSS, is_displayed=True)
    client.await_css(LOADING_CSS, is_displayed=False)


@pytest.mark.only_platforms("linux")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, await_console_message=ERROR_MSG)
    client.await_css(LOADING_CSS, is_displayed=True)
