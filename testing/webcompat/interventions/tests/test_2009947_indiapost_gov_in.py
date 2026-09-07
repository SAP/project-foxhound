from asyncio.exceptions import TimeoutError

import pytest

URL = "https://app.indiapost.gov.in/idam/realms/indiapost/protocol/openid-connect/auth?response_type=code&client_id=internal_client&redirect_uri=https%3A%2F%2Fapp.indiapost.gov.in%2Femployeeportal%2Fapi%2Fauth%2Fcallback%2Fkeycloak&nextauth=keycloak&code_challenge=sCHCi-Bp6I7Lg6s2u-nb8Pb4Elod3j5xG1z33-6mq9M&code_challenge_method=S256&scope=openid+profile+email"
SUPPORTED_CSS = "#username"
UNSUPPORTED_TEXT = "Access Denied"


async def visit_site(client):
    try:
        await client.navigate(URL, timeout=10, no_skip=True, wait="none")
    except TimeoutError:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to India.")


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await visit_site(client)
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)
