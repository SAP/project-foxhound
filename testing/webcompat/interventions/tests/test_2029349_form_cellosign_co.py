import pytest
from webdriver.error import NoSuchElementException

URL = "https://www.keter.com/fr-fr/nous-contacter.html"
IFRAME_CSS = "iframe[src*='form.cellosign.co']"
FORM_CSS = "#ReasonforContactingKeter"


async def does_form_appear(client):
    await client.navigate(URL, wait="none")
    try:
        client.switch_to_frame(client.await_css(IFRAME_CSS))
        client.await_css(FORM_CSS, is_displayed=True, timeout=5)
        return True
    except NoSuchElementException:
        return False


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await does_form_appear(client)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await does_form_appear(client)
