import pytest
from webdriver.error import NoSuchElementException

URL = "https://www.toei-anim.co.jp/"

SUCCESS_CSS = ".splide__list"
ERROR_TEXT = "a client-side exception has occurred"


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    for _ in range(5):
        await client.navigate(URL)
        assert client.await_css(SUCCESS_CSS, is_displayed=True, timeout=4)
        assert not client.find_text(ERROR_TEXT, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    saw_failure = False
    for _ in range(5):
        await client.navigate(URL)
        try:
            assert client.await_text(ERROR_TEXT, is_displayed=True, timeout=4)
        except NoSuchElementException:
            continue
        saw_failure = True
        assert not client.find_css(SUCCESS_CSS, is_displayed=True)
    assert saw_failure
