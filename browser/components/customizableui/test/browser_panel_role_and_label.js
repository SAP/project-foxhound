"use strict";

const widgetData = {
  id: "test-widget",
  type: "view",
  viewId: "PanelUI-testbutton",
  label: "test widget label",
  onViewShowing() {},
  onViewHiding() {},
};

async function openWidget() {
  let testWidgetButton = document.getElementById("test-widget");
  let testWidgetShowing = BrowserTestUtils.waitForEvent(
    document,
    "popupshown",
    true
  );
  testWidgetButton.click();
  return (await testWidgetShowing).target;
}

async function closeWidget() {
  let panel = document.getElementById("customizationui-widget-panel");
  let panelHidden = BrowserTestUtils.waitForEvent(panel, "popuphidden");

  panel.hidePopup();
  await panelHidden;
}

function createPanelView() {
  let panelView = document.createXULElement("panelview");
  panelView.id = "PanelUI-testbutton";
  let vbox = document.createXULElement("vbox");
  panelView.appendChild(vbox);
  return panelView;
}

/**
 * This checks that panels have an accessible role and that they are labelled with their
 * button or a provided name.
 */
add_task(async function check_panel_role_and_label() {
  let viewCache = document.getElementById("appMenu-viewCache");
  let panelView = createPanelView();
  viewCache.appendChild(panelView);

  CustomizableUI.createWidget(widgetData);
  CustomizableUI.addWidgetToArea("test-widget", "nav-bar");

  registerCleanupFunction(async () => {
    if (document.getElementById("customizationui-widget-panel")) {
      await closeWidget();
    }

    CustomizableUI.destroyWidget("test-widget");
    panelView.remove();
    CustomizableUI.reset();
  });

  let button = document.getElementById("test-widget");

  let panel = await openWidget();
  is(panel.role, "group", "Panel should have a group role");
  ok(
    panel.ariaLabelledByElements.includes(button),
    "Panel should have an a11y label of toolbar button"
  );

  await closeWidget();

  // Now add custom role and label to panel via panelview.
  panelView.dataset.panelrole = "dialog";
  panelView.dataset.panelname = "custom name";

  panel = await openWidget();
  is(panel.role, "dialog", "Panel should have a dialog role");
  ok(!panel.ariaLabelledByElements, "Panel should not have aria-labelledby");
  is(panel.ariaLabel, "custom name", "Panel should have correct aria-label");

  await closeWidget();
});
