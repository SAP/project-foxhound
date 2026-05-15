import pytest

URL = "https://character.ai/chat/NrVgl5IP6AyWq7ZCQtzJ6Y8TZHevcJtD7FJxOiUpOD0"
DESCRIPTION_CSS = "[data-testid=product-description]"


async def is_text_italicized(client):
    await client.navigate(URL)
    # rather than trying to log in and such, let's just create the markup the site is
    # expected to make, and check whether the font appears italicized by comparing it
    # to a screenshot after italics have been forced using the CSS we are applying.
    client.execute_script(
        """document.body.innerHTML = `<div class="font-display"><em>T</em></div>`"""
    )
    t = client.await_css("div.font-display")
    pre = t.screenshot()
    client.execute_script(
        """document.body.style["font-variation-settings"] = "'ital' 10";"""
    )
    return pre == t.screenshot()


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await is_text_italicized(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await is_text_italicized(client)
