import pytest

URL = "https://aladhan.com/calendar"
INPUT_CSS = "[placeholder='Example: London, UK']"
LOADED_CONTENT_CSS = "table.w-full > tbody:not(:empty)"
ERROR_TEXT = "unable to find this location"


async def type_in_search(client):
    await client.navigate(URL, wait="none")
    input = client.await_css(INPUT_CSS, is_displayed=True)
    # this is awful, but simply calling input.focus() doesn't always work
    focus = None
    while focus != input:
        client.send_key("VK_TAB")
        focus = client.execute_script("return document.activeElement")
    client.send_key("L")
    client.send_key("o")


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await type_in_search(client)
    assert client.await_css(LOADED_CONTENT_CSS, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await type_in_search(client)
    assert client.await_text(ERROR_TEXT, is_displayed=True)
