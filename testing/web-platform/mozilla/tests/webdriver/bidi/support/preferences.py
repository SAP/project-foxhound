import json

from webdriver.bidi.modules.script import ContextTarget


async def clear_pref(bidi_session, chrome_context, pref_name):
    """Clear the user-defined value from the specified preference.

    :param pref: Name of the preference.
    """
    await bidi_session.script.call_function(
        function_declaration="""prefName => {
            const { Preferences } = ChromeUtils.importESModule(
                "resource://gre/modules/Preferences.sys.mjs"
            );
            Preferences.reset(prefName);
        }
        """,
        arguments=[{"type": "string", "value": pref_name}],
        target=ContextTarget(chrome_context["context"]),
        await_promise=False,
    )


async def get_pref(bidi_session, chrome_context, pref_name):
    """Get the value of the specified preference.

    :param pref: Name of the preference.
    """
    result = await bidi_session.script.call_function(
        function_declaration="""prefName => {
            const { Preferences } = ChromeUtils.importESModule(
              "resource://gre/modules/Preferences.sys.mjs"
            );

            return JSON.stringify(Preferences.get(prefName, null));
        }
        """,
        arguments=[{"type": "string", "value": pref_name}],
        target=ContextTarget(chrome_context["context"]),
        await_promise=False,
    )

    return json.loads(result["value"])


async def set_pref(bidi_session, chrome_context, pref_name, pref_value):
    """Set the value of the specified preference.

    :param pref: Name of the preference.
    :param value: The value to set the preference to. If the value is None,
                  reset the preference to its default value. If no default
                  value exists, the preference will cease to exist.
    """
    if pref_value is None:
        await clear_pref(bidi_session, chrome_context, pref_name)
        return

    await bidi_session.script.call_function(
        function_declaration="""(prefName, json) => {
            const { Preferences } = ChromeUtils.importESModule(
              "resource://gre/modules/Preferences.sys.mjs"
            );

            const prefValue = JSON.parse(json);
            Preferences.set(prefName, prefValue);
        }
        """,
        arguments=[
            {"type": "string", "value": pref_name},
            {"type": "string", "value": json.dumps(pref_value)},
        ],
        target=ContextTarget(chrome_context["context"]),
        await_promise=False,
    )
