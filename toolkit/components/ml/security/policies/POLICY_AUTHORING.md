# Security Policy Authorship Guide

## Overview

Security policies are defined in JSON files and evaluated by the `PolicyEvaluator` at runtime. This allows security policies to be added or modified without creating new JavaScript modules.

## Enforcement

Policies in `tool-execution-policies.json` are evaluated at the **tool dispatch** layer. When AI Window attempts to execute a tool (e.g., `get_page_content`), the security layer evaluates the request against registered policies and returns an allow or deny decision. If denied, the tool call is blocked.

The evaluation flow:

1. AI Window prepares a tool execution request
2. Request is sent to `SecurityOrchestrator.evaluate()` with phase, action, and context
3. PolicyEvaluator checks all policies registered for that phase
4. First matching policy that denies blocks the request ("first deny wins")
5. If no policy denies, the action is allowed

**Session Ledger Lifetime:** The session ledger used by policies is in-memory only. It is scoped to the current browser session and cleared on restart. Ledgers are not persisted to disk or restored via session restore.

## Policy Trust Model

Policies are **bundled with Firefox** as part of the source tree. They are reviewed like any other code change and are not loaded from the network or from user-modifiable locations.

In the current design, policies are treated as trusted configuration, not untrusted input. This means:

- Policies go through standard code review before landing
- End users cannot modify or inject custom policies
- Runtime validation exists as a development aid, not a security boundary

## Policy File Structure

```json
{
  "description": "Brief description of this policy file",
  "policies": [
    { /* policy object */ },
    { /* policy object */ }
  ]
}
```

## Policy Object Schema

### Required Fields

**`id`** (string): Unique identifier for the policy
- Must be unique across all policy files
- Use kebab-case: "block-unseen-links"
- Appears in logs and decision metadata

**`phase`** (string): Security phase where policy applies
- Current phases: "tool.execution", "inference.request", "inference.response"
- Must match the phase used in SecurityOrchestrator.evaluate()

**`enabled`** (boolean): Whether this policy is active
- `true`: Policy will be evaluated
- `false`: Policy will be skipped (useful for testing)

**`match`** (object): Criteria to determine if policy applies
- Key: Dot-notation path (e.g., "action.type")
- Value: Expected value or wildcard pattern
- Policy only evaluates if ALL match criteria are met

**`conditions`** (array): Conditions that must be satisfied
- Each condition is an object with a `type` field
- All conditions must pass for action to be allowed
- If any condition fails, policy effect is applied

**`effect`** (string): What happens when conditions fail
- "deny": Block the action
- "allow": Permit the action (rarely used - policies typically deny)

**`onDeny`** (object): Information returned when denying
- `code`: Code for type of denial (e.g., "UNSEEN_LINK")
- `reason`: Explanation of denial

### Optional Fields

**`description`** (string): Explanation of policy purpose
- Appears in logs
- Helps future maintainers understand intent

## Match Criteria

Match criteria determine whether a policy applies to an action.

### Syntax

```json
"match": {
  "path.to.field": "expected-value",
  "another.field": "value"
}
```

### Dot-Notation Paths

Access nested fields using dots:
- `"action.type"` → `action.type`
- `"action.params.url"` → `action.params.url`
- `"context.sessionId"` → `context.sessionId`

### Wildcard Matching

Use pipe (`|`) for OR conditions:

```json
"match": {
  "action.tool": "get_page_content|search_history"
}
```

Matches if tool is either get_page_content OR search_history.

Use asterisk (`*`) to match anything:

```json
"match": {
  "action.tool": "*"
}
```

Matches any tool (policy applies to all tools).

### Examples

**Match specific tool**:
```json
"match": {
  "action.type": "tool.call",
  "action.tool": "get_page_content"
}
```

**Match multiple tools**:
```json
"match": {
  "action.type": "tool.call",
  "action.tool": "get_page_content|search_history"
}
```

**Match all tool calls**:
```json
"match": {
  "action.type": "tool.call",
  "action.tool": "*"
}
```

## Condition Types

Conditions are evaluated after match criteria. Each condition has a `type` field that determines how it's evaluated.

### `allUrlsIn`

**Purpose**: Check that all URLs are present in a ledger

**Fields**:
- `urls`: Dot-notation path to URL array
- `ledger`: Dot-notation path to ledger object
- `description`: Optional explanation

**Example**:
```json
{
  "type": "allUrlsIn",
  "urls": "action.urls",
  "ledger": "context.linkLedger",
  "description": "URLs must be in trusted ledger"
}
```

**Behavior**:
- Returns `true` if all URLs in the array are found in the ledger
- Returns `true` if URL array is empty (no URLs to check)
- Returns `false` if ledger is missing or any URL is not in ledger
- Uses ledger's `has()` method for checking

### `equals`

**Purpose**: Check exact equality

**Fields**:
- `actual`: Dot-notation path to actual value
- `expected`: Expected value (literal)

**Example**:
```json
{
  "type": "equals",
  "actual": "action.type",
  "expected": "tool.call"
}
```

### `matches`

**Purpose**: Check if value matches a regex pattern

**Fields**:
- `value`: Dot-notation path to value
- `pattern`: Regular expression pattern (string)

**Example**:
```json
{
  "type": "matches",
  "value": "action.params.query",
  "pattern": "^[a-zA-Z0-9\\s]+$",
  "description": "Query must be alphanumeric"
}
```

**Note**: Backslashes in regex must be escaped in JSON (`\\b` not `\b`)

### `noPatternInParams`

**Purpose**: Ensure pattern doesn't appear in parameters (useful for blocking PII)

**Fields**:
- `params`: Dot-notation path to params object
- `pattern`: Regular expression pattern to block

**Example**:
```json
{
  "type": "noPatternInParams",
  "params": "action.params",
  "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
  "description": "Block email addresses in parameters"
}
```

## Complete Policy Examples

> **Note:** The policies in this section are illustrative examples only. They are not the actual policies shipped in Firefox and should not be treated as final security guidance.

### Example 1: Block Unseen Links

```json
{
  "id": "block-unseen-links",
  "phase": "tool.execution",
  "enabled": true,
  "description": "Prevent prompt injection by blocking access to unseen URLs",
  "match": {
    "action.type": "tool.call",
    "action.tool": "get_page_content"
  },
  "conditions": [
    {
      "type": "allUrlsIn",
      "urls": "action.urls",
      "ledger": "context.linkLedger"
    }
  ],
  "effect": "deny",
  "onDeny": {
    "code": "UNSEEN_LINK",
    "reason": "URL not in selected request context"
  }
}
```

### Example 2: Block Email Exfiltration

```json
{
  "id": "block-email-exfiltration",
  "phase": "tool.execution",
  "enabled": true,
  "description": "Prevent email addresses from being used in search queries",
  "match": {
    "action.type": "tool.call",
    "action.tool": "search_history"
  },
  "conditions": [
    {
      "type": "noPatternInParams",
      "params": "action.params",
      "pattern": "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b",
      "description": "Block email address patterns"
    }
  ],
  "effect": "deny",
  "onDeny": {
    "code": "EMAIL_PATTERN_DETECTED",
    "reason": "Search parameters contain email address pattern"
  }
}
```

### Example 3: Multiple Conditions

```json
{
  "id": "strict-page-content-access",
  "phase": "tool.execution",
  "enabled": true,
  "description": "Multiple validation checks for page content access",
  "match": {
    "action.type": "tool.call",
    "action.tool": "get_page_content"
  },
  "conditions": [
    {
      "type": "allUrlsIn",
      "urls": "action.urls",
      "ledger": "context.linkLedger",
      "description": "URLs must be in ledger"
    },
    {
      "type": "equals",
      "actual": "action.params.mode",
      "expected": "viewport",
      "description": "Only viewport mode allowed"
    }
  ],
  "effect": "deny",
  "onDeny": {
    "code": "INVALID_ACCESS",
    "reason": "Page content access validation failed"
  }
}
```

## Testing Policies

### Validation Checklist

Before adding a new policy:

1. ✅ **Unique ID**: No other policy uses this ID
2. ✅ **Valid phase**: Phase exists in SecurityOrchestrator
3. ✅ **Match criteria**: Correctly identifies target actions
4. ✅ **Conditions**: All condition types are implemented
5. ✅ **Paths exist**: All dot-notation paths resolve at runtime
6. ✅ **JSON valid**: File parses correctly

### Manual Testing

```javascript
// In Browser Console
const { SecurityOrchestrator } = ChromeUtils.importESModule(
  "chrome://global/content/ml/security/SecurityOrchestrator.sys.mjs"
);

// Test a policy
const decision = await SecurityOrchestrator.evaluate({
  phase: "tool.execution",
  action: {
    type: "tool.call",
    tool: "get_page_content",
    urls: ["https://evil.com"]
  },
  context: {
    currentTabId: "panel-1",
    mentionedTabIds: [],
    requestId: "test-123"
  }
});

console.log(decision);
// Should show: { effect: "deny", code: "UNSEEN_LINK", ... }
```

## Best Practices

### Policy Design

✅ **DO**:
- Use descriptive IDs: "block-email-exfiltration" not "policy-1"
- Add descriptions explaining the security concern
- Test policies before deploying
- Keep conditions simple and focused
- Use fail-closed logic (deny by default)

❌ **DON'T**:
- Create overlapping policies (unclear precedence)
- Use complex regex that's hard to understand
- Make policies too broad (match everything)
- Forget to validate paths exist at runtime

### Condition Design

✅ **DO**:
- Check one thing per condition (single responsibility)
- Add description fields for complex conditions
- Use existing condition types when possible
- Handle edge cases (empty arrays, null values)

❌ **DON'T**:
- Try to implement business logic in conditions
- Create tightly coupled conditions
- Use conditions for logging or side effects

### Match Criteria

✅ **DO**:
- Be specific (match exact tool names)
- Use wildcards sparingly
- Test that policy applies when expected

❌ **DON'T**:
- Use "*" unless truly needed for all actions
- Match on fields that might not exist

## Adding New Condition Types

To add a new condition type, modify `ConditionEvaluator.sys.mjs`:

```javascript
// In ConditionEvaluator.sys.mjs
export class ConditionEvaluator {
  static evaluate(condition, action, context) {
    switch (condition.type) {
      // ... existing types ...

      case 'yourNewType': {
        const value = this.resolvePath(condition.value, action, context);
        // Your validation logic
        return /* true or false */;
      }
    }
  }
}
```

Then document it in this guide and add tests.

## Policy File Organization

### Multiple Policy Files

Organize policies by phase or concern:

```
policies/
├── tool-execution-policies.json      # Smart Window tools
├── inference-pipeline-policies.json  # MLEngine inference
├── content-filtering-policies.json   # Content safety
└── README.md                          # This file
```

All policy files are loaded automatically at startup.

## Troubleshooting

### Policy Not Applying

Check:
1. `enabled: true`?
2. Match criteria correct?
3. Phase name matches SecurityOrchestrator.evaluate() call?
4. Policy file loaded? (Check console logs at startup)

### Condition Always Failing

Check:
1. Dot-notation paths resolve? (Use console.log in ConditionEvaluator)
2. Ledger/data exists at runtime?
3. Condition type implemented?

### Unexpected Denials

Check:
1. Multiple policies applying? (First deny wins)
2. Condition logic correct?
3. Edge cases handled? (empty arrays, null values)

## Support

For questions about policy authorship:
1. Review examples in this guide
2. Check existing policies in policy files
3. Consult security team
4. Review PolicyEvaluator and ConditionEvaluator code

---

**Last Updated**: Phase 2 Implementation (JSON Policy Migration)
**Schema Version**: 1.0
