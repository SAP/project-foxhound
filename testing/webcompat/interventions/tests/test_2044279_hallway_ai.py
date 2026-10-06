import pytest

URL = "https://hallway.ai/"
EMBED_CSS = "hallway-embed"


async def check_if_chat_widget_loads(client):
    await client.navigate(URL, wait="none")
    # the chat widget is a web component which does not attach in the failing case,
    # so we can just wait for it to have a shadowRoot to detect success.
    return client.execute_async_script(
        """
            const [component, done] = arguments;
            let count = 0;
            setInterval(() => {
                if (component?.shadowRoot) {
                    done(true);
                }
                if (++count == 50) {
                    done(false);
                }
            }, 100);
        """,
        client.await_css(EMBED_CSS, is_displayed=True),
    )


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await check_if_chat_widget_loads(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await check_if_chat_widget_loads(client)
