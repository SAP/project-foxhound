from copy import deepcopy

import pytest
from webdriver.bidi.error import UnsupportedOperationException
from webdriver.bidi.modules.script import ContextTarget

pytestmark = pytest.mark.asyncio


async def test_evaluate_parent_process_context(configuration, geckodriver):
    """Note: This uses geckodriver instead of the browser/new_session fixture
    because the browser fixture doesn't support Android yet (bug 2040886).
    """
    url = "about:about"

    # Bug 2038624 will make it impossible to navigate to those pages without
    # allow_system_access, we will need to find an alternative way to open
    # those pages.
    config = deepcopy(configuration)
    config["capabilities"]["moz:firefoxOptions"]["args"].append(url)
    config["capabilities"]["moz:firefoxOptions"]["androidIntentArguments"] = [
        "-d",
        url,
    ]
    config["capabilities"]["webSocketUrl"] = True

    driver = geckodriver(config=config)
    try:
        driver.new_session()

        bidi_session = driver.session.bidi_session
        await bidi_session.start()

        contexts = await bidi_session.browsing_context.get_tree(max_depth=0)
        page_context = next(
            (context for context in contexts if context["url"] == url), None
        )
        assert page_context is not None, f"No context found with URL {url}"

        with pytest.raises(UnsupportedOperationException):
            await bidi_session.script.evaluate(
                expression="1 + 1",
                target=ContextTarget(page_context["context"]),
                await_promise=False,
            )
    finally:
        await driver.stop()


@pytest.mark.allow_system_access
async def test_evaluate_parent_process_context_with_system_access(
    bidi_session, new_tab
):
    await bidi_session.browsing_context.navigate(
        context=new_tab["context"], url="about:about", wait="complete"
    )

    result = await bidi_session.script.evaluate(
        expression="1 + 1",
        target=ContextTarget(new_tab["context"]),
        await_promise=False,
    )

    assert result == {"type": "number", "value": 2}
