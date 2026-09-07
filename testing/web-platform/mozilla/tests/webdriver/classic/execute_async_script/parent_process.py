from copy import deepcopy

import pytest
from tests.classic.execute_async_script import execute_async_script
from tests.support.classic.asserts import assert_error, assert_success

pytestmark = pytest.mark.asyncio


async def test_execute_async_script_parent_process_context(configuration, geckodriver):
    # Bug 2038624 will make it impossible to navigate to those pages without
    # allow_system_access, we will need to find an alternative way to open
    # those pages.
    config = deepcopy(configuration)
    config["capabilities"]["moz:firefoxOptions"]["args"].append("about:about")
    config["capabilities"]["moz:firefoxOptions"]["androidIntentArguments"] = [
        "-d",
        "about:about",
    ]

    driver = geckodriver(config=config)
    try:
        driver.new_session()

        assert driver.session.url == "about:about"

        response = execute_async_script(driver.session, "arguments[0](1 + 1)")
        assert_error(response, "unsupported operation")

    finally:
        await driver.stop()


@pytest.mark.allow_system_access
def test_execute_async_script_parent_process_context_with_system_access(
    session, new_tab_classic
):
    session.url = "about:about"

    response = execute_async_script(session, "arguments[0](1 + 1)")
    assert_success(response, 2)
