import pytest
from webdriver.bidi.error import UnknownErrorException

URL = "https://esampark.wondercement.com/"

UNSUPPORTED_ALERT = "Google Chrome"
LOGIN_CSS = "#UserName"
VPN_TEXT = "502 - Bad Gateway"


async def visit_site(client):
    await client.navigate(URL, wait="none")
    login, vpn = client.await_first_element_of(
        [client.css(LOGIN_CSS), client.text(VPN_TEXT)], is_displayed=True, timeout=20
    )
    if vpn:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to the USA.")


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await visit_site(client)
    assert not await client.find_alert(delay=3)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    try:
        await visit_site(client)
    except UnknownErrorException:
        pass
    assert await client.await_alert(UNSUPPORTED_ALERT)
