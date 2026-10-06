import React from "react";
import { combineReducers, createStore } from "redux";
import { Provider } from "react-redux";
import { mount } from "enzyme";
import { INITIAL_STATE, reducers } from "common/Reducers.sys.mjs";
import { actionTypes as at } from "common/Actions.mjs";
import { Lists } from "content-src/components/Widgets/Lists/Lists";

const mockState = {
  ...INITIAL_STATE,
  ListsWidget: {
    selected: "test-list",
    lists: {
      "test-list": {
        label: "test",
        tasks: [{ id: "1", value: "task", completed: false, isUrl: false }],
        completed: [],
      },
    },
  },
};

function WrapWithProvider({ children, state = INITIAL_STATE }) {
  let store = createStore(combineReducers(reducers), state);
  return <Provider store={store}>{children}</Provider>;
}

describe("<Lists>", () => {
  let wrapper;
  let sandbox;
  let dispatch;
  let handleUserInteraction;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    handleUserInteraction = sandbox.stub();

    wrapper = mount(
      <WrapWithProvider state={mockState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );
  });

  afterEach(() => {
    // If we defined what the activeElement should be, remove our override
    delete document.activeElement;
  });

  it("should render the component and selected list", () => {
    assert.ok(wrapper.exists());
    assert.ok(wrapper.find(".lists").exists());
    assert.isFalse(wrapper.find(".lists").hasClass("medium-widget"));
    assert.isTrue(wrapper.find(".lists").hasClass("large-widget"));
    assert.equal(wrapper.find("moz-select").length, 0);
    assert.equal(wrapper.find(".lists-add-button").length, 1);
    assert.equal(wrapper.find(".task-item").length, 1);
  });

  it("uses the Checklist fallback title for an unnamed default list", () => {
    const state = {
      ...mockState,
      ListsWidget: {
        ...mockState.ListsWidget,
        lists: {
          "test-list": {
            ...mockState.ListsWidget.lists["test-list"],
            label: "",
          },
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    assert.equal(
      localWrapper.find(".lists-title").prop("data-l10n-id"),
      "newtab-widget-lists-name-default"
    );
  });

  it("adds explicit names to the icon-only menu buttons", () => {
    assert.equal(
      wrapper.find("moz-button.lists-panel-button").prop("data-l10n-id"),
      "newtab-menu-section-tooltip"
    );
    assert.equal(
      wrapper.find(".task-item moz-button").at(0).prop("data-l10n-id"),
      "newtab-menu-section-tooltip"
    );
  });

  it("adds an explicit accessible name to the add-task input", () => {
    const input = wrapper.find("input.add-task-input").at(0);

    assert.equal(
      input.prop("data-l10n-id"),
      "newtab-widget-lists-input-add-an-item2"
    );
    assert.equal(input.prop("data-l10n-attrs"), "placeholder,aria-label");
  });

  it("should update task input and add a new task on Enter key", () => {
    const input = wrapper.find("input").at(0);
    input.simulate("change", { target: { value: "nathan's cool task" } });

    // Override what the current active element so that the dispatch will trigger
    Object.defineProperty(document, "activeElement", {
      value: input.getDOMNode(),
      configurable: true,
    });

    input.simulate("keyDown", { key: "Enter" });

    assert.ok(dispatch.called, "Expected dispatch to be called");

    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_UPDATE);
    assert.ok(
      action.data.lists["test-list"].tasks.some(
        task => task.value === "nathan's cool task"
      )
    );
  });

  it("should toggle task completion", () => {
    const taskItem = wrapper.find(".task-item").at(0);
    const checkbox = wrapper.find("input[type='checkbox']").at(0);
    checkbox.simulate("change", { target: { checked: true } });
    // dispatch not called until transition has ended
    assert.equal(dispatch.callCount, 0);
    taskItem.simulate("transitionEnd", { propertyName: "opacity" });
    assert.ok(dispatch.calledThrice);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_UPDATE);
    assert.ok(action.data.lists["test-list"].completed[0].completed);

    // Verify old telemetry event
    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_LISTS_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "task_complete");

    // Verify new unified telemetry event
    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "lists");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "task_complete");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("should not dispatch an action when input is empty and Enter is pressed", () => {
    const input = wrapper.find("input").at(0);
    input.simulate("change", { target: { value: "" } });
    // Override what the current active element so that the dispatch will trigger
    Object.defineProperty(document, "activeElement", {
      value: input.getDOMNode(),
      configurable: true,
    });
    input.simulate("keyDown", { key: "Enter" });

    assert.ok(dispatch.notCalled);
  });

  it("should remove task when deleteTask is run from task item panel menu", () => {
    // confirm that there is a task available to delete
    const initialTasks = mockState.ListsWidget.lists["test-list"].tasks;
    assert.equal(initialTasks.length, 1);

    const deleteButton = wrapper.find("panel-item.delete-item").at(0);
    deleteButton.props().onClick();

    assert.ok(dispatch.calledThrice);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_UPDATE);

    // Check that the task list is now empty
    const updatedTasks = action.data.lists["test-list"].tasks;
    assert.equal(updatedTasks.length, 0, "Expected task to be removed");

    // Verify old telemetry event
    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_LISTS_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "task_delete");

    // Verify new unified telemetry event
    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "lists");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "task_delete");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("should add a task with a valid URL and render it as a link", () => {
    const input = wrapper.find("input").at(0);
    const testUrl = "https://www.example.com";

    input.simulate("change", { target: { value: testUrl } });

    // Set activeElement for Enter key detection
    Object.defineProperty(document, "activeElement", {
      value: input.getDOMNode(),
      configurable: true,
    });

    input.simulate("keyDown", { key: "Enter" });

    assert.ok(dispatch.calledThrice, "Expected dispatch to be called");

    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_UPDATE);

    const newHyperlinkedTask = action.data.lists["test-list"].tasks.find(
      t => t.value === testUrl
    );

    assert.ok(newHyperlinkedTask, "Task with URL should be added");
    assert.ok(newHyperlinkedTask.isUrl, "Task should be marked as a URL");

    // Verify old telemetry event
    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_LISTS_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "task_create");

    // Verify new unified telemetry event
    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "lists");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "task_create");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("should dispatch list change when switcher selection changes", () => {
    const stateWithMultipleLists = {
      ...mockState,
      ListsWidget: {
        ...mockState.ListsWidget,
        lists: {
          "test-list": mockState.ListsWidget.lists["test-list"],
          "other-list": {
            label: "other",
            tasks: [],
            completed: [],
          },
        },
      },
    };
    const localWrapper = mount(
      <WrapWithProvider state={stateWithMultipleLists}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );
    localWrapper
      .find("panel-list#lists-switcher-panel panel-item")
      .at(1)
      .props()
      .onClick();

    assert.ok(dispatch.calledOnce);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_CHANGE_SELECTED);
    assert.equal(action.data, "other-list");
  });

  it("marks only the selected list as checked in the switcher", () => {
    const stateWithMultipleLists = {
      ...mockState,
      ListsWidget: {
        selected: "test-list",
        lists: {
          "test-list": {
            label: "Checklist",
            tasks: [],
            completed: [],
          },
          "other-list": {
            label: "Shopping",
            tasks: [],
            completed: [],
          },
        },
      },
    };

    const selectedFirstWrapper = mount(
      <WrapWithProvider state={stateWithMultipleLists}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const firstSelectionItems = selectedFirstWrapper.find(
      "panel-list#lists-switcher-panel panel-item"
    );

    assert.strictEqual(firstSelectionItems.at(0).prop("checked"), true);
    assert.strictEqual(firstSelectionItems.at(1).prop("checked"), false);

    const selectedSecondWrapper = mount(
      <WrapWithProvider
        state={{
          ...stateWithMultipleLists,
          ListsWidget: {
            ...stateWithMultipleLists.ListsWidget,
            selected: "other-list",
          },
        }}
      >
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const secondSelectionItems = selectedSecondWrapper.find(
      "panel-list#lists-switcher-panel panel-item"
    );

    assert.strictEqual(secondSelectionItems.at(0).prop("checked"), false);
    assert.strictEqual(secondSelectionItems.at(1).prop("checked"), true);
  });

  it("renders the compact layout when widgets are minimized", () => {
    const state = {
      ...mockState,
      ListsWidget: {
        ...mockState.ListsWidget,
        lists: {
          "test-list": {
            label: "test",
            tasks: [
              { id: "1", value: "task 1", completed: false, isUrl: false },
              { id: "2", value: "task 2", completed: false, isUrl: false },
              { id: "3", value: "task 3", completed: false, isUrl: false },
              { id: "4", value: "task 4", completed: false, isUrl: false },
            ],
            completed: [{ id: "done", value: "done", completed: true }],
          },
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          isMaximized={false}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );

    assert.isTrue(localWrapper.find(".lists").hasClass("compact-widget"));
    assert.isTrue(localWrapper.find(".lists").hasClass("medium-widget"));
    assert.isFalse(localWrapper.find(".lists").hasClass("large-widget"));
    assert.isTrue(localWrapper.find(".lists").hasClass("has-visible-tasks"));
    assert.equal(localWrapper.find(".lists-title").length, 1);
    assert.equal(localWrapper.find(".lists-add-button.icon-only").length, 1);
    assert.equal(
      localWrapper.find(".lists-add-action .lists-add-button").length,
      0
    );
    assert.equal(localWrapper.find(".lists-completed-button").length, 0);
    assert.equal(localWrapper.find("input[type='checkbox']").length, 4);
    assert.equal(localWrapper.find(".task-item").length, 4);
    assert.equal(localWrapper.find(".completed-task-wrapper").length, 0);
  });

  it("renders the full layout as large when widgets are maximized", () => {
    const localWrapper = mount(
      <WrapWithProvider state={mockState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          isMaximized={true}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );

    assert.isTrue(localWrapper.find(".lists").hasClass("large-widget"));
    assert.isFalse(localWrapper.find(".lists").hasClass("medium-widget"));
    assert.isFalse(localWrapper.find(".lists").hasClass("compact-widget"));
  });

  it("respects the Lists widget size pref when resized individually", () => {
    const state = {
      ...mockState,
      Prefs: {
        ...mockState.Prefs,
        values: {
          ...mockState.Prefs.values,
          "widgets.lists.size": "medium",
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          isMaximized={true}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );

    assert.isTrue(localWrapper.find(".lists").hasClass("medium-widget"));
    assert.isTrue(localWrapper.find(".lists").hasClass("compact-widget"));
    assert.isFalse(localWrapper.find(".lists").hasClass("large-widget"));
  });

  it("disables the add button when the selected list is at the item limit", () => {
    const state = {
      ...mockState,
      Prefs: {
        ...mockState.Prefs,
        values: {
          ...mockState.Prefs.values,
          "widgets.lists.maxListItems": 1,
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    assert.isTrue(localWrapper.find(".lists-add-button").prop("disabled"));
  });

  it("renders a list switcher in compact view when there are multiple lists", () => {
    const state = {
      ...mockState,
      ListsWidget: {
        ...mockState.ListsWidget,
        lists: {
          "test-list": {
            label: "Checklist",
            tasks: [{ id: "1", value: "task", completed: false, isUrl: false }],
            completed: [],
          },
          "other-list": {
            label: "Shopping",
            tasks: [],
            completed: [],
          },
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          isMaximized={false}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );

    assert.equal(localWrapper.find(".lists-switcher").length, 1);
    assert.equal(localWrapper.find(".lists-switcher .lists-title").length, 1);
    assert.equal(
      localWrapper.find("moz-button.lists-switcher-button").length,
      1
    );
    assert.equal(localWrapper.find(".lists-add-button.icon-only").length, 1);
  });

  it("uses the Checklist fallback title in the switcher for an unnamed selected list", () => {
    const state = {
      ...mockState,
      ListsWidget: {
        selected: "test-list",
        lists: {
          "test-list": {
            label: "",
            tasks: [],
            completed: [],
          },
          "other-list": {
            label: "Shopping",
            tasks: [],
            completed: [],
          },
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    assert.equal(
      localWrapper.find(".lists-switcher .lists-title").prop("data-l10n-id"),
      "newtab-widget-lists-name-default"
    );
  });

  it("does not render compact completed preview controls in medium view", () => {
    const state = {
      ...mockState,
      ListsWidget: {
        ...mockState.ListsWidget,
        lists: {
          "test-list": {
            label: "Checklist",
            tasks: [{ id: "1", value: "task", completed: false, isUrl: false }],
            completed: [
              { id: "done", value: "done", completed: true, isUrl: false },
            ],
          },
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          isMaximized={false}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );

    assert.equal(localWrapper.find(".lists-completed-button").length, 0);
    assert.equal(localWrapper.find(".task-type-tasks").length, 1);
    assert.equal(localWrapper.find(".task-type-completed").length, 0);
  });

  it("dispatches list change in compact view when the selected list is empty", () => {
    const state = {
      ...mockState,
      ListsWidget: {
        selected: "empty-list",
        lists: {
          "test-list": {
            label: "Checklist",
            tasks: [{ id: "1", value: "task", completed: false, isUrl: false }],
            completed: [],
          },
          "empty-list": {
            label: "Shopping",
            tasks: [],
            completed: [],
          },
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          isMaximized={false}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );

    assert.equal(localWrapper.find(".empty-list").length, 1);

    localWrapper
      .find("panel-list#lists-switcher-panel panel-item")
      .at(0)
      .props()
      .onClick();

    assert.ok(dispatch.calledOnce);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_CHANGE_SELECTED);
    assert.equal(action.data, "test-list");
  });

  it("disables the add button when the selected list is at the item limit", () => {
    const state = {
      ...mockState,
      Prefs: {
        ...mockState.Prefs,
        values: {
          ...mockState.Prefs.values,
          "widgets.lists.maxListItems": 1,
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    assert.isTrue(localWrapper.find(".lists-add-button").prop("disabled"));
  });

  it("should delete list and select a fallback list", () => {
    // Grab panel-item for deleting a list
    const deleteList = wrapper.find("panel-item").at(2);
    deleteList.props().onClick();

    assert.equal(dispatch.callCount, 4);
    assert.equal(dispatch.getCall(0).args[0].type, at.WIDGETS_LISTS_UPDATE);
    assert.equal(
      dispatch.getCall(1).args[0].type,
      at.WIDGETS_LISTS_CHANGE_SELECTED
    );

    // Verify old telemetry event
    const [oldTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_LISTS_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "list_delete");

    // Verify new unified telemetry event
    const [newTelemetryEvent] = dispatch.getCall(3).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "lists");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "list_delete");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("should update list name when edited and saved", () => {
    // Grab panel-item for editing a list
    const editList = wrapper.find("panel-item").at(0);
    editList.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");
    editableInput.simulate("change", { target: { value: "Updated List" } });
    editableInput.simulate("keyDown", { key: "Enter" });

    assert.ok(dispatch.calledThrice);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_UPDATE);
    assert.equal(action.data.lists["test-list"].label, "Updated List");

    // Verify old telemetry event
    const [oldTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_LISTS_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "list_edit");

    // Verify new unified telemetry event
    const [newTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "lists");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "list_edit");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("adds an explicit accessible name to the list-name editor", () => {
    const editList = wrapper.find("panel-item").at(0);
    editList.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");

    assert.equal(
      editableInput.prop("data-l10n-id"),
      "newtab-widget-lists-menu-edit2"
    );
    assert.equal(editableInput.prop("data-l10n-attrs"), "aria-label");
  });

  it("cancels list-name edits without saving", () => {
    const editList = wrapper.find("panel-item").at(0);
    editList.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");
    editableInput.simulate("change", { target: { value: "Updated List" } });

    const cancelButton = wrapper.find("moz-button.edit-list-clear");
    assert.equal(
      cancelButton.prop("data-l10n-id"),
      "newtab-widget-lists-edit-clear"
    );

    cancelButton.props().onClick();
    wrapper.update();

    assert.equal(wrapper.find("input.edit-list").length, 0);
    assert.equal(wrapper.find(".lists-title").text(), "test");
    assert.ok(dispatch.notCalled);
  });

  it("cancels list-name edits via Escape without saving", () => {
    const editList = wrapper.find("panel-item").at(0);
    editList.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");
    editableInput.simulate("change", { target: { value: "Updated List" } });
    editableInput.simulate("keyDown", { key: "Escape" });
    wrapper.update();

    assert.equal(wrapper.find("input.edit-list").length, 0);
    assert.equal(wrapper.find(".lists-title").text(), "test");
    assert.ok(dispatch.notCalled);
  });

  it("does not save edits when Escape restores focus and triggers blur", () => {
    const editList = wrapper.find("panel-item").at(0);
    editList.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");
    editableInput.simulate("change", { target: { value: "Updated List" } });
    editableInput.simulate("keyDown", { key: "Escape" });
    // In the real browser, restoring focus after Escape fires a blur on the
    // input. relatedTarget is the previously focused element, which lives
    // outside the edit wrapper, so the existing wrapper-contains check
    // would not skip the save.
    editableInput.simulate("blur", { relatedTarget: document.body });
    wrapper.update();

    assert.equal(wrapper.find("input.edit-list").length, 0);
    assert.equal(wrapper.find(".lists-title").text(), "test");
    assert.ok(dispatch.notCalled);
  });

  it("does not save when blur moves focus to the cancel button", () => {
    const editList = wrapper.find("panel-item").at(0);
    editList.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");
    editableInput.simulate("change", { target: { value: "Updated List" } });

    const cancelButtonNode = wrapper
      .find("moz-button.edit-list-clear")
      .getDOMNode();
    editableInput.simulate("blur", { relatedTarget: cancelButtonNode });
    wrapper.update();

    assert.equal(wrapper.find("input.edit-list").length, 1);
    assert.ok(dispatch.notCalled);
  });

  it("opens draft list editing without creating a list yet", () => {
    const createListBtn = wrapper.find("panel-item.create-list").at(0);
    createListBtn.props().onClick();

    wrapper.update();

    assert.equal(dispatch.callCount, 0);
    assert.equal(wrapper.find("input.edit-list").length, 1);
    assert.equal(
      wrapper.find("input.edit-list").prop("data-l10n-id"),
      "newtab-widget-lists-name-placeholder-new2"
    );
    assert.equal(
      wrapper.find("input.edit-list").prop("data-l10n-attrs"),
      "placeholder,aria-label"
    );
  });

  it("creates and selects a new list after confirming a non-empty draft name", () => {
    sandbox.stub(crypto, "randomUUID").returns("new-list-id");

    const createListBtn = wrapper.find("panel-item.create-list").at(0);
    createListBtn.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");
    editableInput.simulate("change", { target: { value: "Groceries" } });
    editableInput.simulate("keyDown", { key: "Enter" });

    assert.equal(dispatch.callCount, 4);
    assert.equal(dispatch.getCall(0).args[0].type, at.WIDGETS_LISTS_UPDATE);
    assert.equal(
      dispatch.getCall(0).args[0].data.lists["new-list-id"].label,
      "Groceries"
    );
    assert.equal(
      dispatch.getCall(1).args[0].type,
      at.WIDGETS_LISTS_CHANGE_SELECTED
    );
    assert.equal(dispatch.getCall(1).args[0].data, "new-list-id");

    // Verify old telemetry event
    const [oldTelemetryEvent] = dispatch.getCall(2).args;
    assert.equal(oldTelemetryEvent.type, at.WIDGETS_LISTS_USER_EVENT);
    assert.equal(oldTelemetryEvent.data.userAction, "list_create");

    // Verify new unified telemetry event
    const [newTelemetryEvent] = dispatch.getCall(3).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "lists");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "list_create");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");
  });

  it("does not create a list when draft creation is cancelled with Escape", () => {
    const createListBtn = wrapper.find("panel-item.create-list").at(0);
    createListBtn.props().onClick();
    wrapper.update();

    wrapper.find("input.edit-list").simulate("keyDown", { key: "Escape" });
    wrapper.update();

    assert.ok(dispatch.notCalled);
    assert.equal(wrapper.find("input.edit-list").length, 0);
  });

  it("keeps a draft list name when blurred without pressing Enter", () => {
    const createListBtn = wrapper.find("panel-item.create-list").at(0);
    createListBtn.props().onClick();
    wrapper.update();

    const editableInput = wrapper.find("input.edit-list");
    editableInput.simulate("change", { target: { value: "Groceries" } });
    editableInput.simulate("blur");
    wrapper.update();

    assert.ok(dispatch.notCalled);
    assert.equal(wrapper.find("input.edit-list").length, 1);
    assert.equal(wrapper.find("input.edit-list").prop("value"), "Groceries");
  });

  it("should copy the current list to clipboard with correct formatting", () => {
    // Set up task list with additional "completed" task
    const task1 = {
      id: "1",
      value: "task 1",
      completed: false,
      isUrl: false,
    };
    const task2 = {
      id: "2",
      value: "task 2",
      completed: true,
      isUrl: false,
    };

    mockState.ListsWidget.lists["test-list"].tasks = [task1, task2];

    wrapper = mount(
      <WrapWithProvider state={mockState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const clipboardWriteTextStub = sinon.stub(navigator.clipboard, "writeText");

    // Grab panel-item for copying a list
    const copyList = wrapper.find("panel-item").at(3);
    copyList.props().onClick();

    assert.ok(
      clipboardWriteTextStub.calledOnce,
      "Expected clipboard.writeText to be called"
    );

    const [copiedText] = clipboardWriteTextStub.firstCall.args;
    assert.include(
      copiedText,
      "List: test",
      "Expected list title in copied text"
    );
    assert.include(
      copiedText,
      "- [ ] task 1",
      "- [x] task 2",
      "Expected uncompleted and completed tasks in copied text"
    );

    // Confirm WIDGETS_LISTS_USER_EVENT telemetry `list_copy` event
    assert.ok(dispatch.calledTwice);
    const [copyEvent] = dispatch.getCall(0).args;
    assert.equal(copyEvent.type, at.WIDGETS_LISTS_USER_EVENT);
    assert.equal(copyEvent.data.userAction, "list_copy");

    // Verify new unified telemetry event
    const [newTelemetryEvent] = dispatch.getCall(1).args;
    assert.equal(newTelemetryEvent.type, at.WIDGETS_USER_EVENT);
    assert.equal(newTelemetryEvent.data.widget_name, "lists");
    assert.equal(newTelemetryEvent.data.widget_source, "widget");
    assert.equal(newTelemetryEvent.data.user_action, "list_copy");
    assert.equal(newTelemetryEvent.data.widget_size, "medium");

    clipboardWriteTextStub.restore();
  });

  it("should reorder tasks via reorder event", () => {
    const task1 = {
      id: "1",
      value: "task 1",
      completed: false,
      isUrl: false,
    };
    const task2 = {
      id: "2",
      value: "task 2",
      completed: false,
      isUrl: false,
    };

    mockState.ListsWidget.lists["test-list"].tasks = [task1, task2];

    wrapper = mount(
      <WrapWithProvider state={mockState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const reorderNode = wrapper.find("moz-reorderable-list").getDOMNode();

    // Simulate moving task2 before task1
    const event = new CustomEvent("reorder", {
      detail: {
        draggedElement: { id: "2" },
        targetElement: { id: "1" },
        position: -1,
      },
      bubbles: true,
    });

    reorderNode.dispatchEvent(event);

    assert.ok(dispatch.calledOnce);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_UPDATE);

    const reorderedTasks = action.data.lists["test-list"].tasks;
    assert.deepEqual(reorderedTasks, [task2, task1]);
  });

  it("should hide Lists widget when 'Hide widget' option is clicked", () => {
    const menuItem = wrapper.find(
      "panel-item[data-l10n-id='newtab-widget-menu-hide']"
    );
    menuItem.props().onClick();

    assert.ok(dispatch.calledTwice);

    const [setPrefAction] = dispatch.getCall(0).args;
    assert.equal(setPrefAction.type, at.SET_PREF);
    assert.equal(setPrefAction.data.name, "widgets.lists.enabled");
    assert.equal(setPrefAction.data.value, false);

    const [telemetryEvent] = dispatch.getCall(1).args;
    assert.equal(telemetryEvent.type, at.WIDGETS_ENABLED);
    assert.equal(telemetryEvent.data.widget_name, "lists");
    assert.equal(telemetryEvent.data.widget_source, "context_menu");
    assert.equal(telemetryEvent.data.enabled, false);
    assert.equal(telemetryEvent.data.widget_size, "medium");

    assert.ok(handleUserInteraction.notCalled);
  });

  it("adds an explicit accessible name to the task editor", () => {
    wrapper.find(".task-label").at(0).simulate("click");
    wrapper.update();

    const editableInput = wrapper.find("input.edit-task");

    assert.equal(
      editableInput.prop("data-l10n-id"),
      "newtab-widget-lists-input-menu-edit2"
    );
    assert.equal(editableInput.prop("data-l10n-attrs"), "aria-label");
  });

  it("should dispatch OPEN_LINK when the Learn More option is clicked", () => {
    const learnMoreItem = wrapper.find(".learn-more");
    learnMoreItem.props().onClick();

    assert.ok(dispatch.calledOnce);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.OPEN_LINK);
    assert.equal(action.data.where, "tab");
  });

  it("disables Create new list action (in the panel list) when at the max lists limit", () => {
    // Set temporary maximum list limit
    const stateAtMax = {
      ...mockState,
      Prefs: {
        ...INITIAL_STATE.Prefs,
        values: {
          ...INITIAL_STATE.Prefs.values,
          "widgets.lists.maxLists": 1,
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={stateAtMax}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const createListBtn = localWrapper.find("panel-item.create-list").at(0);
    assert.strictEqual(createListBtn.prop("disabled"), true);
  });

  it("overrides `widgets.lists.maxLists` pref when below `1` value", () => {
    const state = {
      ...mockState,
      Prefs: {
        ...mockState.Prefs,
        values: {
          ...mockState.Prefs.values,
          "widgets.lists.maxLists": 0,
        },
      },
    };
    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );
    const createListBtn = localWrapper.find("panel-item.create-list").at(0);
    // with 1 existing list, and maxLists coerced to 1, it should be disabled
    assert.strictEqual(createListBtn.prop("disabled"), true);
  });

  it("disables Create List option when at the maximum lists limit", () => {
    const state = {
      ...mockState,
      ListsWidget: {
        ...mockState.ListsWidget,
        lists: {
          "list-1": { label: "A", tasks: [], completed: [] },
          "list-2": { label: "B", tasks: [], completed: [] },
        },
      },
      Prefs: {
        ...mockState.Prefs,
        values: {
          ...mockState.Prefs.values,
          "widgets.lists.maxLists": 2,
        },
      },
    };
    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );
    const createListBtn = localWrapper.find("panel-item.create-list").at(0);
    // with 2 existing lists, and maxLists is set to 2, it should be disabled
    assert.strictEqual(createListBtn.prop("disabled"), true);
  });

  it("disables add-task input when at maximum list items limit", () => {
    // total items = tasks + completed = 3
    const state = {
      ...mockState,
      ListsWidget: {
        selected: "test-list",
        lists: {
          "test-list": {
            label: "test",
            tasks: [
              { id: "1", value: "task 1", completed: false, isUrl: false },
              { id: "2", value: "task 2", completed: false, isUrl: false },
            ],
            completed: [
              { id: "c1", value: "done", completed: true, isUrl: false },
            ],
          },
        },
      },
      Prefs: {
        ...mockState.Prefs,
        values: {
          ...mockState.Prefs?.values,
          // At limit (3), so input should be disabled and icon greyed
          "widgets.lists.maxListItems": 3,
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const input = localWrapper.find("input.add-task-input").at(0);
    const addIcon = localWrapper
      .find(".add-task-container .icon.icon-add")
      .at(0);

    assert.strictEqual(
      input.prop("disabled"),
      true,
      "Expected add-task input to be disabled at the maximum list items limit"
    );
    assert.strictEqual(
      addIcon.hasClass("icon-disabled"),
      true,
      "Expected add icon to have icon-disabled class at the maximum list items limit"
    );
  });

  it("enables add-task input when at maximum list items limit", () => {
    // with 3 items in current list, and maxLists coerced to 1, it should be enabled
    const state = {
      ...mockState,
      Prefs: {
        ...mockState.Prefs,
        values: {
          ...mockState.Prefs?.values,
          "widgets.lists.maxListItems": 5,
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={state}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const input = localWrapper.find("input.add-task-input").at(0);
    const addIcon = localWrapper
      .find(".add-task-container .icon.icon-add")
      .at(0);

    assert.strictEqual(
      input.prop("disabled"),
      false,
      "Expected input to be enabled when under limit"
    );
    assert.strictEqual(
      addIcon.hasClass("icon-disabled"),
      false,
      "Expected add icon not to be greyed when under limit"
    );
  });
});

describe("<Lists> size submenu (nova)", () => {
  let sandbox;
  let dispatch;
  let handleUserInteraction;

  const novaState = {
    ...mockState,
    Prefs: {
      ...mockState.Prefs,
      values: {
        ...mockState.Prefs.values,
        "nova.enabled": true,
        "widgets.lists.size": "medium",
      },
    },
  };

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    dispatch = sandbox.stub();
    handleUserInteraction = sandbox.stub();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("does not render size submenu when nova is disabled", () => {
    const wrapper = mount(
      <WrapWithProvider state={mockState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );
    assert.isFalse(
      wrapper.find("panel-list[id='lists-size-submenu']").exists()
    );
  });

  it("renders size submenu with medium/large items when nova is enabled", () => {
    const wrapper = mount(
      <WrapWithProvider state={novaState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );
    const submenu = wrapper.find("panel-list[id='lists-size-submenu']");
    assert.isTrue(submenu.exists());

    const items = submenu.find("panel-item");
    assert.equal(items.length, 2);

    assert.isTrue(
      items.filterWhere(n => n.prop("data-size") === "medium").exists(),
      "medium item should exist"
    );
    assert.isTrue(
      items.filterWhere(n => n.prop("data-size") === "large").exists(),
      "large item should exist"
    );
  });

  it("marks the current size as checked and others as undefined", () => {
    const wrapper = mount(
      <WrapWithProvider state={novaState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );
    const submenu = wrapper.find("panel-list[id='lists-size-submenu']");
    const items = submenu.find("panel-item");

    const mediumItem = items.filterWhere(n => n.prop("data-size") === "medium");
    const largeItem = items.filterWhere(n => n.prop("data-size") === "large");

    assert.equal(mediumItem.prop("checked"), true, "medium should be checked");
    assert.isUndefined(largeItem.prop("checked"), "large should be unchecked");
  });

  it("treats a stale small pref as medium in Nova", () => {
    const staleSmallState = {
      ...novaState,
      Prefs: {
        ...novaState.Prefs,
        values: {
          ...novaState.Prefs.values,
          "widgets.lists.size": "small",
        },
      },
    };
    const wrapper = mount(
      <WrapWithProvider state={staleSmallState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );

    assert.isTrue(
      wrapper.find(".lists.medium-widget").exists(),
      "stale small pref should render as medium in Nova"
    );
    assert.isFalse(
      wrapper.find(".lists.small-widget").exists(),
      "stale small pref should not render an unsupported small class"
    );

    const submenu = wrapper.find("panel-list[id='lists-size-submenu']");
    const items = submenu.find("panel-item");
    const mediumItem = items.filterWhere(n => n.prop("data-size") === "medium");

    assert.equal(mediumItem.prop("checked"), true, "medium should be checked");
  });

  it("dispatches SET_PREF and WIDGETS_USER_EVENT when clicking a size item", () => {
    const wrapper = mount(
      <WrapWithProvider state={novaState}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
          widgetsMayBeMaximized={true}
        />
      </WrapWithProvider>
    );
    const submenuNode = wrapper
      .find("panel-list[id='lists-size-submenu']")
      .getDOMNode();
    const mockItem = document.createElement("div");
    mockItem.dataset.size = "large";
    const event = new MouseEvent("click", { bubbles: true });
    Object.defineProperty(event, "composedPath", { value: () => [mockItem] });
    submenuNode.dispatchEvent(event);

    assert.ok(dispatch.calledTwice);

    const [setPrefAction] = dispatch.getCall(0).args;
    assert.equal(setPrefAction.type, at.SET_PREF);
    assert.equal(setPrefAction.data.name, "widgets.lists.size");
    assert.equal(setPrefAction.data.value, "large");

    const [telemetryAction] = dispatch.getCall(1).args;
    assert.equal(telemetryAction.type, at.WIDGETS_USER_EVENT);
  });
});
