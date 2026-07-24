import pytest

URL = "https://www.gazetasp.com.br/"

CONTAINER_CSS = "#listaCategorias-1"
CAPTCHA_TEXT = "Verifying you are human"
INFINITE_CAPTCHA_MSG = (
    "Seem to be stuck in an infinite Captcha; please test this page manually."
)


async def is_scrollbar_visible(client):
    await client.navigate(URL)
    container, captcha = client.await_first_element_of(
        [
            client.css(CONTAINER_CSS),
            client.text(CAPTCHA_TEXT),
        ],
        is_displayed=True,
    )
    if captcha:
        pytest.skip(INFINITE_CAPTCHA_MSG)
        return False
    return client.execute_script(
        """
      const container = arguments[0];
      return Math.round(container.getBoundingClientRect().height) != container.clientHeight;
    """,
        container,
    )


@pytest.mark.skip_platforms("android")
@pytest.mark.need_visible_scrollbars
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert not await is_scrollbar_visible(client)


@pytest.mark.skip_platforms("android")
@pytest.mark.need_visible_scrollbars
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert await is_scrollbar_visible(client)
