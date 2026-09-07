import pytest

URL = "https://www.gatufotogruppen.se/?page_id=5497"
DESIRED_CSS = ".ultp-block-image"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL)
    assert client.await_css(DESIRED_CSS, is_displayed=True)
