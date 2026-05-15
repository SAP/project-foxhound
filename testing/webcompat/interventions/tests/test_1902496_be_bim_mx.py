import pytest

URL = "https://be.bim.mx/nb/index.cfm"

UNBLOCKED_CSS = "#myModal"
BLOCKED_TEXT = "Google Chrome"
VPN_TEXT = "Error 403 - Forbidden"


async def visit_site(client, expected):
    await client.navigate(URL, wait="none")
    vpn, expected = client.await_first_element_of(
        [
            client.text(VPN_TEXT),
            expected,
        ],
        is_displayed=True,
    )
    if vpn:
        pytest.skip(
            "Region-locked, cannot test. Try using a VPN set to Canada or the USA."
        )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await visit_site(client, client.css(UNBLOCKED_CSS))
    assert not client.find_text(BLOCKED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await visit_site(client, client.text(BLOCKED_TEXT))
    assert not client.find_css(UNBLOCKED_CSS, is_displayed=True)
