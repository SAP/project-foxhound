import pytest

URL = "https://indices.circana.com"
OLD_URL = "https://indices.iriworldwide.com"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression_site_is_gone(client):
    await client.navigate(URL, wait="none")
    assert client.await_text("404 Not Found")

    await client.navigate(OLD_URL, wait="none")
    assert client.await_text("404 Not Found")
