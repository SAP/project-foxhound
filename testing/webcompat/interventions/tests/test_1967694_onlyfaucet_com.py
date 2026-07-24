import pytest

URL = "https://onlyfaucet.com/"
BLOCKED_CSS = "#cf-error-details"
UNBLOCKED_CSS = "#content"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL)
    assert client.await_css(UNBLOCKED_CSS, is_displayed=True)
    assert not client.find_css(BLOCKED_CSS, is_displayed=True)
