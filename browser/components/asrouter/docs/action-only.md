# ActionOnlyMessage

ActionOnlyMessage is a template for messages that silently execute an allowlisted [Special Message Action](https://firefox-source-docs.mozilla.org/toolkit/components/messaging-system/docs/SpecialMessageActionSchemas/index.html) with no UI. When delivered, ASRouter records a local impression, sends impression telemetry, and executes the action. This templatea should be used with caution, and actions such as `PIN_FIREFOX_TO_TASKBAR` should only be used in cases where an OS level prompt will ask a user's consent to pin.

## Control Messages

A control branch message with no `content` field is valid and will be delivered without executing any action. This allows Nimbus experiments to record exposure events on the control branch.

## Example Message

```json
{
  "id": "EXAMPLE_ACTION_ONLY",
  "template": "action_only",
  "targeting": "true",
  "frequency": { "lifetime": 3 },
  "content": {
    "action": {
      "type": "CONFIRM_LAUNCH_ON_LOGIN"
    }
  }
}
```

## Schema

[ActionOnlyMessage.schema.json](https://searchfox.org/mozilla-central/source/browser/components/asrouter/content-src/templates/OnboardingMessage/ActionOnlyMessage.schema.json)
