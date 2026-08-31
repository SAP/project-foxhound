import pytest

URL = "https://workhub.transcribeme.com/Exam"

CAPTCHA_CSS = "re-captcha"
USERNAME_CSS = "input[name=username]"
PASSWORD_CSS = "input[name=password]"
EXPIRED_CSS = "app-renewpassword"
SIGN_IN_CSS = "#btn-login"
UNSUPPORTED_CSS = "#chromeOnlyPopup"


async def does_unsupported_popup_appear(client, credentials):
    await client.navigate(URL)

    username = client.await_css(USERNAME_CSS)
    password = client.find_css(PASSWORD_CSS)
    sign_in = client.find_css(SIGN_IN_CSS)
    assert client.is_displayed(username)
    assert client.is_displayed(password)
    assert client.is_displayed(sign_in)

    username.send_keys(credentials["username"])
    password.send_keys(credentials["password"])
    sign_in.click()

    for _ in range(10):
        captcha, unsupported, expired = client.await_first_element_of([
            client.css(CAPTCHA_CSS),
            client.css(UNSUPPORTED_CSS),
            client.css(EXPIRED_CSS),
        ])
        if captcha:
            print("\a")  # beep to let the user know to do the captcha
            client.await_element_hidden(client.css(CAPTCHA_CSS), timeout=90)
        else:
            break
    if expired:
        pytest.skip("Your password has expired. Please visit the site and renew it.")
        return

    await client.stall(1)
    return client.find_css(UNSUPPORTED_CSS, is_displayed=True)


@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client, credentials):
    assert not await does_unsupported_popup_appear(client, credentials)


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client, credentials):
    assert await does_unsupported_popup_appear(client, credentials)
