import pytest

URL = "https://clw.westminster.gov.uk/"
UNSUPPORTED_CSS = ".w-20"
SUPPORTED_CSS = (
    "body > app-root > main > app-landing > div:nth-child(2) > div:nth-child(1) > p"
)


async def visit_site(client):
    await client.navigate(URL, wait="none")


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await visit_site(client)
    assert client.await_css(SUPPORTED_CSS, is_displayed=True)
    assert not client.find_css(UNSUPPORTED_CSS, is_displayed=True)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await visit_site(client)
    assert client.await_css(UNSUPPORTED_CSS, is_displayed=True)
    assert not client.find_css(SUPPORTED_CSS, is_displayed=True)
