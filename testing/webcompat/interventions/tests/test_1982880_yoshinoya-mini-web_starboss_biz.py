import pytest

URL = "https://yoshinoya-mini-web.starboss.biz/main"
SUPPORTED_CSS = ".search-form"
UNSUPPORTED_CSS = ".not-support-title"
VPN_TEXT = "403 Forbidden"


async def check_site(client, expected_css):
    await client.navigate(URL, wait="none")
    expected, vpn = client.await_first_element_of(
        [client.css(expected_css), client.text(VPN_TEXT)],
        is_displayed=True,
    )
    if vpn:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to Japan.")


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await check_site(client, SUPPORTED_CSS)
    assert not client.find_css(UNSUPPORTED_CSS, is_displayed=True)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await check_site(client, UNSUPPORTED_CSS)
    assert not client.find_css(SUPPORTED_CSS, is_displayed=True)
