# Compiled Patch Accessibility Review Runsheet

Use this as the core checklist for frontend accessibility review of Firefox patches. The goal is to catch the kinds of issues the accessibility team repeatedly identified in historical reviews, while avoiding platform-only accessibility-engine issues.

## Visibility, Readability, and Discoverability

- Run a contrast check on all modified components, verify WCAG level AA compliance.
- Check that controls needed to complete a task are persistently discoverable and not revealed only by hover or prior keyboard focus; hidden controls are easy for keyboard, switch, touch, screen reader, and low-vision users to miss. They also have the potential to create S2 navigation issues with VoiceOver specifically.
- Check that browser chrome text meets the team's minimum readability threshold, no smaller than 12px / 0.75rem; users cannot reliably enlarge Firefox chrome text with web content zoom or page font preferences. Developers should *never* use the xxsmall font token. This token requires explicit approval from the a11y team.
- Check that cursor styling matches the interaction model; users infer behavior from cursor shape, and cursor mismatch, ex. a text cursor on non-editable content, suggests the wrong action. Links should use "hand" pointer, buttons should use "cursor" pointer, and text inputs should use the text-insertion cursor.
- Check that all available states (ex. focused, selected, hovered, active, checked, expanded, disabled, etc.) are visually distinguishable. States which can appear next to one another (ex. selected, non-selected) must have 3:1 contrast. Disabled states must have 3:1 contrast.
- Check that states remain perceptible when a control has keyboard focus; users still need feedback that activation, hover, selection, etc. occurred when focus styling is present.
- Check that controls are not hidden with opacity or styled with disabled tokens unless they are truly disabled; visually hidden or misleading active controls can become undiscoverable or look unavailable.
- Check that transient UI state changes like "download completed", "file uploaded" remain visible long enough (minimum 5 seconds). Ideally, they should remain until dismissed by user action.
- When animation is used, it must settle within 5 seconds. Animation lasting longer than 5 seconds must be controllable by the user with play, pause, stop, hide controls.
- Non-essential animation should be disabled for `prefers-reduced-motion` users. Essential animation should be considerate, preferring fade-in/fade-out mechanics over slide/scroll mechanics.
- Animations must not flash more than 3 times per second. They must also adhere to the other animation rules above.
- Interactive areas must meet WCAG requirements for minimum target size.

## Names, Labels, Descriptions, and Text Alternatives

- Check that every interactive element has an accessible name from visible text, localized markup, `aria-label`, `aria-labelledby`, or an equivalent native mechanism; an unnamed control may be announced only as "button" or "menu item" with no useful purpose. Prefer associating labels using visible text (e.g. HTML `label` element or `aria-labelledby`) over accessibility specific labels (e.g. `aria-label`) for the most equivalent experience.
- Check that labels are connected using a mechanism supported by the specific element type and namespace; a visual label does not help assistive technology unless it participates in accessible name computation.
- Check that icon-only and repeated controls have unique contextual names and visible tooltips when appropriate
- Check that associated controls are identified via relations or descriptions in addition to labels when labels alone are vague; labels like "More options" or "Learn more" are ambiguous without the row, item, or feature they apply to.
- Check that visible tooltips, titles, and ARIA labels do not duplicate the same accessible name; duplicate naming creates noisy or repeated screen reader output.
- Check that meaningful images and icons have an equivalent accessible text representation, and that decorative images use empty alt text or another supported hiding mechanism; screen reader users need the same state or identity information sighted users get from visual symbols.
- Check that information conveyed only through visual design elements, such as favicons, color indicators, badges, or container identity, is also exposed through text, accessible names, or descriptions; visual-only identity cues create an information gap for screen reader users.
- Check that elements using `aria-description` or `aria-describedby` also have an accessible label; some assistive technologies ignore descriptions on unlabelled elements.
- Check that explanatory text for a suggestion, row, or dialog page is associated with the element that receives focus (e.g. using `aria-describedby`); screen readers generally announce the focused control, not nearby visual text outside its name or description.
- Check that alert dialogs and dialogs expose both a title and the relevant body content through supported naming and description mechanisms; announcing only the title can leave users without the message they need in order to respond. If there is a large amount of static content inside a dialog, consider using the `document` role inside the dialog role. This will allow screen reader users to navigate through the static content at their own pace as they would on a web page.
- Check that nested interactive elements inside a control's `<label>` do not contribute unintended text to the labelled control's accessible name; label text is folded into name computation and can create verbose or misleading announcements.
- Check that accessible names describe the thing being controlled rather than embedding the action, state, or role when that would be confusing; names like "switch" can be mistaken for the control role instead of the setting label. Similarly, names like "Turn VPN on" make controls difficult to re-locate when their state changes, and may confuse users about control state.
- Check that controls that perform actions have their actions communicated clearly; users need to know whether activating a control will add, remove, open, close, enable, or disable something. Ex. "Trash icon" is a far less helpful name than "Remove row".
- Check that authors do not add redundant or duplicate labels. Consider a button with internal, visible text "hello" and `aria-label="hello"`. Accessible-name computation already uses the internal text, and redundant ARIA creates extra maintenance without improving output.
- Check that row and column headers are announced when focus moves into row actions; users need row metadata to understand what an inner control will affect.
- Check that link destination behavior is included in the accessible name or tooltip when it is shown visually; opening a new tab or external target changes user expectations before activation. If this is being included in the name, ensure that it doesn't completely replace the name; e.g. `aria-label="Opens in a new tab"` will mean that the user can no longer perceive the actual label of the control.
- Check that menu selections expose only the actual selected item and that the menu button has a stable, neutral setting name; duplicate selected announcements and stateful button names make it unclear what state the control represents.
- Avoid using text positioned off-screen for screen reader users. Where there is no visual text, prefer proper semantics like labels and descriptions.
- Avoid usage hints (e.g. keyboard usage instructions) in names and descriptions; reporting these repeatedly makes the experience extremely inefficient for screen reader users.

## Roles, Semantics, and Structural Patterns

- Check whether content is static or interactive before selecting roles, names, and keyboard behavior; focusability, action semantics, and expected controls depend on the interaction model. If something is interactive, it should almost always have a role (whether implicit or explicit) and it should be operable using the keyboard.
- Check that interactive elements use semantic HTML, such as `<button>` for actions and `<a>` for links, instead of non-interactive elements with click handlers; native elements provide keyboard focus, activation behavior, roles, and accessible names by default.
- Check that boolean HTML attributes, such as `disabled`, are correctly applied and removed during state changes; a present boolean attribute can make a control permanently disabled even when the code intends to enable it with `disabled=false`.
- Check that adding grouping semantics does not destroy native list semantics; list items need a valid list container for screen reader list navigation and structural announcements.
- Check that list, listbox, option, group, and button roles are not mixed in incompatible ways; assistive technologies use those roles to choose navigation commands and announce item counts or selection.
- Check that listbox patterns follow the standard listbox/option model and that group labels are concise rather than instructional; screen readers implement listbox navigation around options, and verbose group labels can be re-announced on every item.
- Check that the supplied role is appropriate for the specified keyboard interaction pattern; listbox, grid, grouped-option, and row-action patterns create different expectations for arrow keys/tab navigation and announcements.
- Check that collections expose item position and set size when users need group context; screen reader users rely on positional metadata (e.g. 1 of 5) to understand how many items exist and where they are in the set. The rendering engine may calculate this information automatically, so do not specify it explicitly unless it is absent or incorrectly exposed.
- Check that visual item state is also exposed to keyboard and assistive technology users; pinned, selected, beta, muted, split-view, or special states are not accessible if they are only conveyed visually.
- Check that custom states communicated with icons or form differences, such as those in the tab strip (audio, muted, selected, split-view, containerized), are exposed to assistive technology; users need non-visual explanations for icon-only state changes.
- Check that buttons which open menus, popups, or panels expose an accessible name, popup semantics, and expanded/collapsed state; users need to discover that the button opens additional content and whether that content is currently visible. Check that they also respond to keyboard controls like escape.
- Check that buttons which show or hide content use `aria-expanded` rather than layering checkbox or pressed state on top of expansion state; conflicting state mechanisms can cause assistive technologies to announce the less useful state.
- Check that mutually exclusive menu items correctly expose only the active item as selected or checked; if every item reports selected, assistive technology users cannot determine the actual setting.
- Check whether native `<dialog>` or `popover` semantics can replace custom dialog, popover, or arrow-key models; native patterns provide expected focus behavior and reduce custom keyboard complexity.
- Check that non-dismissible dialogs use true modal semantics, move focus into the dialog, prevent background interaction, and provide a visible background affordance; users need to know they are constrained to the dialog until it is resolved.
- Ensure that content which is not perceivable visually is also not exposed semantically; assistive technology users should not perceive content which is not intended to be perceived. For example, content with CSS `opacity: 0` is not visible visually, but is still focusable and exposed to assistive technology. Instead, use native hidden semantics, or as a very last resort, use `aria-hidden`.

## Keyboard Navigation, Focus, and Activation

- Check that every wizard, dialog, page, or panel can be reached with keyboard and that initial focus is placed sensibly in the reading order; keyboard and screen reader users only hear content that is reachable or correctly associated.
- Check where focus lands after a control opens, closes, or transforms the UI; keyboard and screen reader users should be able to continue from the control they just used rather than being dropped into unrelated content.
- For dialogs, menus and other popups that are directly triggered by the user or are intended to interrupt the user, check that the popup is focused appropriately. When the popup is dismissed, check that focus is restored to where it was before the popup opened.
- Check that programmatic focus on page load or navigation does not skip headings, introductory content, or structural context without strong justification; screen reader users often treat page load as the starting point for reading.
- Check that DOM order for major regions matches the visual tab order; keyboard navigation follows DOM order, and a mismatch forces keyboard users through content in a sequence that contradicts the visual layout.
- Check that controls in large groups (ex. toolbar buttons in a toolbar, menu items in a menu, options in a list, etc.) are reachable with arrow keys and do not require an additional tabstop to move within the group.
- Check that menu buttons support expected keyboard activation keys across platforms; users commonly expect both Space and Enter to open button-like menus.
- Check that keyboard activation performs the same intended action as pointer activation and prepares any required hover, preview, or menu state on focus; keyboard users should not trigger unrelated actions or lose access to menus. Do not assume that all assistive technology users will interact using the keyboard; screen reader commands often activate elements using a click, rather than a key press.
- Check that split-button and composite widgets have appropriate roles on each sub-widget component as well as the widget container. Each sub-widget should also have keyboard reachability, accessible name, and state exposure; every interaction target must be independently discoverable and operable.
- Check that keyboard navigation follows the spatial layout of grid-like content, including responsive card grids; predictable arrow-key movement lets keyboard users build a mental model of rows and columns.
- Check that popups and preview menus close predictably, update their announced state, and show visible open-state styling; stale descriptions or invisible open states make the control hard to reason about.
- Check that expanded/collapsed state and focus transitions are synchronized with the UI update; stale state announcements or temporary panel focus can cause screen readers to read the wrong scope.
- Check that dialog focus-enforcement logic accounts for assistive technologies that can move a virtual cursor to non-focusable elements; aggressive focus snapping can intercept AT navigation and cause Enter or Space to activate the wrong control.

## Dynamic Announcements, Warnings, and Asynchronous UI

- Check that live regions and `ariaNotify` are used only for content that should be announced immediately and is not already communicated through accessible name, state, focus movement, or platform events. These notifications, especially assertive ones, can be disruptive.
- Live region and `ariaNotify` notifications must always be tested with multiple screen readers due to the high potential for user experience problems and subtle implementation bugs. Single-platform testing and speculative explanations about behaviour ("the screen reader should say...", "users will probably hear...") are insufficient to justify live region or `ariaNotify` use.
- Always instruct the author to test on more than one platform and check with the accessibility team to confirm a live region or `ariaNotify` is the best solution. The same goes for uses of `a11yUtils.Announce`.
- Check that live regions are only used for messages which are also visible on screen; off-screen live regions should not be used. If the message is not visible on screen, `ariaNotify` should be used instead.
- Check that live regions are not also bundled into broad static descriptions; screen readers may announce the same information twice or replay unrelated introductory text when only a small status changed.
- Check that message components do not use alert roles for static guidance; static help should be discoverable without interrupting users.
- Check that newly revealed warnings are announced when they appear, and are tied to the content they concern; a visual warning that appears after user action may otherwise be missed by assistive technology users.
- Check that focus and announcement behavior work for each asynchronous response path, not just the simplest path; a loading announcement is not enough if focus moves away and the "completed" response is never announced.

## Semantic HTML, XUL, and Web Components

- Check that ARIA element associations in reusable shadow-DOM components use element references, such as `ariaLabelledByElements` and `ariaDescribedByElements`, where references cross shadow boundaries; string ID references do not work across shadow-DOM boundaries. References across shadow-DOM boundaries are complex and error prone, so always verify these associations with the Accessibility Inspector or a screen reader.
- Check that shadow-DOM and custom-component accessibility-test exceptions are narrowly explained and do not hide semantics from the real target element; redispatched events can make accessible controls look inert to tooling even when the component is implemented correctly.
- Check that automated accessibility tooling understands roving-tabindex and shadow-DOM event behavior for custom components; false positives can push authors toward incorrect focus behavior or obscure the real component contract.
- Check that custom components expose native semantics at the actual interactive element rather than only at a wrapper or host; assistive technology and testing tools need to find the same target users interact with.
- Check that custom element APIs do not require consumers to duplicate IDs, labels, or descriptions manually when the component can own that wiring; repeated manual wiring is fragile and easy to break across refactors.

## Testing, Regression Coverage, and Review Validation

- Check that automated accessibility checks align with the ARIA pattern actually being used; false positives can force authors into incorrect focus behavior or obscure the real contract of a composite widget.
- Do not permit accessibility-checks exceptions, these must be manually reviewed by an accessibility team member. Do not permit accessibility-checks tests to be disabled. This is often done by disabling rules like this: `AccessibilityUtils.setEnv({ mustHaveAccessibleRule: false });` and enabling the rule again after a click or check has been processed.
- Check that custom-component tests click and inspect the semantic target where possible; testing only a host, wrapper, or redispatched event can produce misleading failures or hide real issues.
- Flag cases where runtime testing is required to confirm keyboard navigation, localized labels, focus movement, dynamic announcements, or computed accessible names; some accessibility properties cannot be fully verified from a static diff.
