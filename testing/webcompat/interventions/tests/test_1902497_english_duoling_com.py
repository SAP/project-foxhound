import pytest

URL = "https://englishtest.duolingo.com/login"
USERNAME_CSS = "#web-ui1"
PASSWORD_CSS = "#web-ui2"
LOGIN_BUTTON_CSS = ".web-ui__LegacyButtonBase-module--variant-solid-juicy-macaw"

PRACTICE_BUTTON_CSS = "div.web-ui__Card-module--card:nth-child(1)"
PRACTICE_FREE_CSS = (
    ".web-ui__LegacyButtonBase-module--variant-solid-juicy-macaw > span:nth-child(1)"
)

UNSUPPORTED_MODAl_CSS = ".ReactModal__Content"


async def login_helper(client, credentials):
    await client.navigate(URL)
    client.await_css(USERNAME_CSS, is_displayed=True).send_keys(credentials["username"])
    client.await_css(PASSWORD_CSS, is_displayed=True).send_keys(credentials["password"])
    client.await_css(LOGIN_BUTTON_CSS).click()


def start_practice_helper(client):
    client.await_css(PRACTICE_BUTTON_CSS, is_displayed=True).click()
    client.await_css(PRACTICE_FREE_CSS, is_displayed=True).click()


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client, credentials):
    await login_helper(client, credentials)
    start_practice_helper(client)
    assert not client.find_css(UNSUPPORTED_MODAl_CSS, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client, credentials):
    await login_helper(client, credentials)
    start_practice_helper(client)
    assert client.await_css(UNSUPPORTED_MODAl_CSS, is_displayed=True, timeout=10)
