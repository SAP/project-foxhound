import pytest
from tests.bidi.input import wait_for_events
from webdriver.bidi.modules.input import Actions

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("full_zoom", [0.5, 1.0, 2.0])
@pytest.mark.parametrize("devPixelsPerPx", [1.0, 2.0])
async def test_position_with_different_scaling(
    bidi_session,
    inline,
    new_tab,
    use_pref,
    set_full_zoom,
    devPixelsPerPx,
    full_zoom,
):
    await use_pref("layout.css.devPixelsPerPx", str(devPixelsPerPx))
    device_pixel_ratio = await set_full_zoom(new_tab["context"], full_zoom)

    assert device_pixel_ratio == devPixelsPerPx * full_zoom

    await bidi_session.browsing_context.navigate(
        context=new_tab["context"],
        url=inline(
            """
        <script>
          var allEvents = { events: [] };
          window.addEventListener("mousemove", event => {
            allEvents.events.push({
                "type": event.type,
                "pageX": event.pageX,
                "pageY": event.pageY,
            });
          }, { once: true });
        </script>
        <div>Foo</div>
        """
        ),
        wait="complete",
    )

    target_point = {
        "x": 25,
        "y": 10,
    }

    actions = Actions()
    actions.add_pointer().pointer_move(target_point["x"], target_point["y"])

    await bidi_session.input.perform_actions(
        actions=actions, context=new_tab["context"]
    )

    events = await wait_for_events(bidi_session, new_tab["context"], 1)
    assert len(events) == 1

    assert events[0]["type"] == "mousemove"
    assert events[0]["pageX"] == pytest.approx(target_point["x"], abs=1.0)
    assert events[0]["pageY"] == pytest.approx(target_point["y"], abs=1.0)
