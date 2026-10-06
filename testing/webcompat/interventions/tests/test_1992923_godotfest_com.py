import pytest

URL = "https://godotfest.com/talks"

TOP_BAR_BLUR_CSS = "#menu-blur"


async def are_blurs_working(client):
    # to test, we take a screenshot of the top menu bar, which ought to be blurred,
    # and then hide its blur element and compare the after-screenshot. If they're the
    # same, then the blur would not have actually been working.
    await client.navigate(URL)

    # hide SVGs and text which might interfere with the screenshot.
    client.add_stylesheet(
        """
      * { color: transparent !important; }
      #test { position: fixed; color: white !important; }
      svg { display: none; }
    """
    )

    top_bar_blur = client.await_css(TOP_BAR_BLUR_CSS)

    client.execute_script(
        """
        const test = document.createElement("div");
        test.innerText = test.id = "test";
        document.body.insertBefore(test, document.body.firstElementChild);
        window.scrollTo({ top: 200, behavior: 'instant' });
    """
    )

    # now take a screenshot, remove the blur element, and compare.
    await client.stall(0.5)
    pre = client.find_css("body").screenshot()
    client.execute_script("arguments[0].remove()", top_bar_blur)
    await client.stall(0.5)
    post = client.find_css("body").screenshot()
    return pre != post


@pytest.mark.only_platforms("android")
@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    assert await are_blurs_working(client)
