import pytest

URL = "https://myaccount.flypeach.com/login"
LOGIN_CSS = "input[name=email]"


async def visit_site(client):
    # the site briefly flashes the "use Chrome" popup before the page finishes loading,
    # so we need to watch for it, and check whether our intervention has hidden it.
    await client.make_preload_script(
        """
      delete navigator.__proto__.webdriver;
      new MutationObserver((mutations, observer) => {
        const search = document.evaluate(
          "//*[text()[contains(., 'Google Chrome')]]",
          document,
          null,
          4
        );
        const found = search.iterateNext();
        if (found) {
          const box = found.getBoundingClientRect();
          if (box.width || box.height) {
            alert("found");
            observer.disconnect();
          }
        }
      }).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
      """
    )
    await client.navigate(URL, wait="none")


@pytest.mark.asyncio
@pytest.mark.without_interventions
async def test_regression(client):
    await visit_site(client)
    client.await_css(LOGIN_CSS, is_displayed=True, timeout=20)
    assert not await client.find_alert()
