import asyncio

import pytest

URL = "https://www.bancoentrerios.com.ar/"

FAILURE_CSS = "[data-testid=browser-compatibility-banner]"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    await asyncio.sleep(3)
    assert not client.find_css(FAILURE_CSS, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert client.await_css(FAILURE_CSS, is_displayed=True, timeout=30)
