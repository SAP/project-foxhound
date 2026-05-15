import pytest
from tests.classic.perform_actions.support.refine import wait_for_events

pytestmark = pytest.mark.asyncio


@pytest.mark.parametrize("full_zoom", [0.5, 1.0, 2.0])
@pytest.mark.parametrize("devPixelsPerPx", [1.0, 2.0])
async def test_position_with_different_scaling(
    session, http_new_tab, inline, set_full_zoom, use_pref, devPixelsPerPx, full_zoom
):
    use_pref("layout.css.devPixelsPerPx", str(devPixelsPerPx))
    device_pixel_ratio = set_full_zoom(full_zoom)

    assert device_pixel_ratio == devPixelsPerPx * full_zoom

    session.url = inline(
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
        """
    )

    target_point = {
        "x": 25,
        "y": 10,
    }

    mouse_chain = session.actions.sequence(
        "pointer", "pointer_id", {"pointerType": "mouse"}
    )
    mouse_chain.pointer_move(target_point["x"], target_point["y"]).perform()

    events = wait_for_events(session, 1)
    assert len(events) == 1

    assert events[0]["type"] == "mousemove"
    assert events[0]["pageX"] == pytest.approx(target_point["x"], abs=1.0)
    assert events[0]["pageY"] == pytest.approx(target_point["y"], abs=1.0)
