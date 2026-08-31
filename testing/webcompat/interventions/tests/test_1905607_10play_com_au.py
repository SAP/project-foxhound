import pytest

URL = "https://10play.com.au/masterchef/episodes/season-16"
SUPPORTED_TEXT = "Sign in to watch this video"
UNSUPPORTED_TEXT = "Your mobile browser is not supported"
NEED_VPN_TEXT = "not available in your region"


async def visit_site(client, expected):
    await client.navigate(URL)
    expected, vpn = client.await_first_element_of(
        [client.text(expected), client.text(NEED_VPN_TEXT)], is_displayed=True
    )
    if vpn:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to Australia.")
    return expected


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await visit_site(client, SUPPORTED_TEXT)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await visit_site(client, UNSUPPORTED_TEXT)
    assert not client.find_text(SUPPORTED_TEXT)
