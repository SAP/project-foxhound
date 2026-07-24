import pytest

# This site once failed with a redirect loop with a Firefox UA

URL = "https://fanplus.co.jp/feature/artistarena"
SUCCESS_CSS = "#aacontents"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(SUCCESS_CSS)
