import asyncio

import pytest

URL = "https://mgr.knowbe.jp/"

FAILURE_TEXT = "推奨の機器、ブラウザをお使いください"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)
    await asyncio.sleep(3)
    assert not client.find_text(FAILURE_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)
    assert client.await_text(FAILURE_TEXT, is_displayed=True)
