import pytest
from support.context import using_context
from support.helpers import get_pref, set_pref


@pytest.fixture
def set_full_zoom(session):
    """Sets the full zoom value for the currently selected tab."""

    def _set_full_zoom(value):
        handle = session.window_handle

        with using_context(session, "chrome"):
            session.execute_script(
                """
                const { NavigableManager } = ChromeUtils.importESModule(
                    "chrome://remote/content/shared/NavigableManager.sys.mjs"
                );

                const [navigableId, value] = arguments;

                const context = NavigableManager.getBrowsingContextById(navigableId);
                if (context === null) {
                    throw new Error(`Browsing Context with id ${navigableId} not found`);
                }

                context.fullZoom = value;
                """,
                args=[handle, value],
            )

        return session.execute_script("return window.devicePixelRatio")

    return _set_full_zoom


@pytest.fixture
def use_pref(session):
    """Set a specific pref value."""
    reset_values = {}

    def _use_pref(pref, value):
        if pref not in reset_values:
            reset_values[pref] = get_pref(session, pref)

        set_pref(session, pref, value)

    yield _use_pref

    for pref, reset_value in reset_values.items():
        set_pref(session, pref, reset_value)
