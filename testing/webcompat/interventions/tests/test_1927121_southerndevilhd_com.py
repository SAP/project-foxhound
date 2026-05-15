import pytest

URL = (
    "https://www.southerndevilhd.com/default.asp?page=xallinventory&customSearch=harley"
)
GOOD_CSS = ".vehicle__image.b-loaded[style*=background-image]"
BAD_MSG = "WebKitMutationObserver is not defined"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL, wait="none")
    assert client.await_css(GOOD_CSS, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL, await_console_message=BAD_MSG)
