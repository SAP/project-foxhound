import pytest

URL = "https://www.jw.org/en/library/bible/kingdom-interlinear-greek-translation/books/revelation/22/"

ARTICLE_CSS = "#bibleText"


async def does_text_wrap(client):
    await client.navigate(URL, wait="none")
    text = client.await_css(ARTICLE_CSS, is_displayed=True)
    return client.execute_script(
        """
        const container = arguments[0];
        const verse = container.querySelector(":scope > .verse");
        return verse.getBoundingClientRect().width <= container.getBoundingClientRect().width;
      """,
        text,
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await does_text_wrap(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await does_text_wrap(client)
