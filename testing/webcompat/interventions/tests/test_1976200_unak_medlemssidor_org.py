import pytest

URL = "https://unak.medlemssidor.org/admin/Login.aspx"
SUPPORTED_TEXT = "Choose your login method"
UNSUPPORTED_TEXT = "typerna Chrome"


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await client.navigate(URL, wait="none")
    assert client.await_text(SUPPORTED_TEXT, is_displayed=True)
    assert not client.find_text(UNSUPPORTED_TEXT, is_displayed=True)
