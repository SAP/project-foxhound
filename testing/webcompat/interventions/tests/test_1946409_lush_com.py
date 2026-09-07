import pytest

URL = "https://www.lush.com/uk/en/p/spa-party-voucher"

COOKIES_CSS = "#portal-cookie-banner__content"
BOTTOM_COOKIE_BUTTON_CSS = "button[data-test=cookie__accept]"


async def is_cookie_banner_onscreen(client):
    await client.navigate(URL, wait="none")
    cookies = client.await_css(COOKIES_CSS, is_displayed=True)
    button = client.await_css(BOTTOM_COOKIE_BUTTON_CSS, is_displayed=True)
    return client.execute_async_script(
        """
        const [cookies, button, done] = arguments;
        setInterval(() => {
          // wait for the animation to complete of the cookie bar sliding up.
          if (cookies.style.transform === "translate3d(0px, 0%, 0px)") {
            done(button.getBoundingClientRect().bottom <= screen.height);
          }
        }, 100);
      """,
        cookies,
        button,
    )


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.with_interventions
async def test_enabled(client):
    assert await is_cookie_banner_onscreen(client)


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_disabled(client):
    assert not await is_cookie_banner_onscreen(client)
