import pytest

URL = "https://wms.sso.biglobe.ne.jp/webmail/index-tui.jsp?v=0.30-0"

SUPPORTED_URL = "https://auth.sso.biglobe.ne.jp/mail/"


@pytest.mark.skip_platforms("android")
@pytest.mark.asyncio
async def test_regression(client):
    redirect = await client.promise_navigation_begins(url=SUPPORTED_URL, timeout=20)
    await client.navigate(URL)
    assert await redirect
