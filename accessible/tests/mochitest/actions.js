/* import-globals-from common.js */
/* import-globals-from events.js */

// //////////////////////////////////////////////////////////////////////////////
// Event constants

const MOUSEDOWN_EVENT = 1;
const MOUSEUP_EVENT = 2;
const CLICK_EVENT = 4;
const COMMAND_EVENT = 8;
const FOCUS_EVENT = 16;

const CLICK_EVENTS = MOUSEDOWN_EVENT | MOUSEUP_EVENT | CLICK_EVENT;
const XUL_EVENTS = CLICK_EVENTS | COMMAND_EVENT;

async function testAction({
  id,
  actionName,
  events,
  actionIndex = 0,
  targetId = null,
  checkOnClickEvent = null,
  eventSeq = [],
}) {
  const acc = getAccessible(id);
  if (!acc) {
    ok(false, `Can't get accessible for '${id}'`);
    return;
  }

  if (!acc.actionCount) {
    ok(false, `No actions on ${prettyName(acc)}`);
    return;
  }

  is(
    acc.getActionName(actionIndex),
    actionName,
    "Wrong action name of the accessible for " + prettyName(acc)
  );

  const target = getNode(targetId || id);
  const promises = [];

  if (events) {
    for (const [flag, type] of [
      [MOUSEDOWN_EVENT, "mousedown"],
      [MOUSEUP_EVENT, "mouseup"],
      [CLICK_EVENT, "click"],
      [COMMAND_EVENT, "command"],
    ]) {
      if (events & flag) {
        promises.push(
          new Promise(resolve => {
            target.addEventListener(
              type,
              evt => {
                if (type == "click" && checkOnClickEvent) {
                  checkOnClickEvent(evt);
                }
                resolve(evt);
              },
              { once: true }
            );
          })
        );
      }
    }

    if (events & FOCUS_EVENT) {
      promises.push(waitForEvent(EVENT_FOCUS, target));
    }
  }

  for (const [eventType, criteria, checkFn] of eventSeq) {
    const p = waitForEvent(eventType, criteria);
    promises.push(checkFn ? p.then(evt => checkFn(evt)) : p);
  }

  acc.doAction(actionIndex);

  await Promise.all(promises);
}

/**
 * Test action names and descriptions.
 */
function testActionNames(aID, aActions) {
  var actions = typeof aActions == "string" ? [aActions] : aActions || [];

  const actionDescrMap = {
    jump: "Jump",
    press: "Press",
    check: "Check",
    uncheck: "Uncheck",
    select: "Select",
    open: "Open",
    close: "Close",
    switch: "Switch",
    click: "Click",
    collapse: "Collapse",
    expand: "Expand",
    activate: "Activate",
    cycle: "Cycle",
    clickAncestor: "Click ancestor",
  };

  var acc = getAccessible(aID);
  is(acc.actionCount, actions.length, "Wrong number of actions.");
  for (var i = 0; i < actions.length; i++) {
    is(
      acc.getActionName(i),
      actions[i],
      "Wrong action name at " + i + " index."
    );
    is(
      acc.getActionDescription(0),
      actionDescrMap[actions[i]],
      "Wrong action description at " + i + "index."
    );
  }
}
