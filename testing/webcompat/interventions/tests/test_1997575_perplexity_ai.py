import pytest

URL = "https://perplexity.ai?pc=firefox&q=firefox"
ASK_INPUT_CSS = "#ask-input"


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    await client.navigate(URL)

    viewport = client.execute_script(
        "return document.querySelector('meta[name=viewport]').content"
    )

    assert (
        viewport
        == "width=device-width,initial-scale=1,interactive-widget=resizes-content"
    )


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    await client.navigate(URL)

    viewport = client.execute_script(
        "return document.querySelector('meta[name=viewport]').content"
    )

    assert viewport == "width=device-width,initial-scale=1"
