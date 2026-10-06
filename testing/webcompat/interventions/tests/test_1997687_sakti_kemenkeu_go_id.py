import pytest

URL = "https://sakti.kemenkeu.go.id/"
SUPPORTED_CSS = "input[name=username]"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUPPORTED_CSS, is_displayed=True, timeout=45)
