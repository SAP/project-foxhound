import pytest

URL = "https://sekowf.wns.com/sekoapin/#/login?authenticated=true&sso=true"

UNSUPPORTED_ALERT = "chrome browser"
LOGIN_CSS = "#logindiv"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(LOGIN_CSS, is_displayed=True)
    assert not await client.find_alert(delay=3)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.make_preload_script("window.close = function() {}")
    await client.navigate(URL, wait="none")
    assert await client.await_alert(UNSUPPORTED_ALERT)
