import pytest


@pytest.fixture
def browser_chrome_url(current_session):
    if current_session.capabilities["platformName"] == "android":
        return "chrome://geckoview/content/geckoview.xhtml"
    else:
        return "chrome://browser/content/browser.xhtml"
