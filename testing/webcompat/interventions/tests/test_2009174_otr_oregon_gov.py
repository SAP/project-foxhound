from asyncio.exceptions import TimeoutError

import pytest

URL = "https://otr.oregon.gov/Web/Account/Login"
SUPPORTED_CSS = "#username-inputEl"
UNSUPPORTED_TEXT = "browser is not supported"


async def visit_site(client):
    try:
        await client.navigate(URL, wait="none", timeout=10, no_skip=True)
    except TimeoutError:
        pytest.skip("Region-locked, cannot test. Try using a VPN set to USA.")


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await visit_site(client)
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await visit_site(client)
    assert client.await_text(UNSUPPORTED_TEXT, is_displayed=True)
    assert not client.find_css(SUPPORTED_CSS, is_displayed=True)
