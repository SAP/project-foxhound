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
    assert.equal(wrapper.find("moz-option").length, 1);
    assert.equal(wrapper.find(".task-item").length, 1);
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

  it("should dispatch list change when dropdown selection changes", () => {
    const select = wrapper.find("moz-select").getDOMNode();
    // need to create a new event since I couldnt figure out a way to
    // trigger the change event to the moz-select component
    const event = new Event("change", { bubbles: true });
    select.value = "test-list";
    select.dispatchEvent(event);

    assert.ok(dispatch.calledOnce);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.WIDGETS_LISTS_CHANGE_SELECTED);
    assert.equal(action.data, "test-list");
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

  it("should create a new list and dispatch update and select list actions", () => {
    const createListBtn = wrapper.find("panel-item").at(1); // assumes "Create a new list" is at index 1
    createListBtn.props().onClick();
    assert.equal(dispatch.callCount, 4);
    assert.equal(dispatch.getCall(0).args[0].type, at.WIDGETS_LISTS_UPDATE);
    assert.equal(
      dispatch.getCall(1).args[0].type,
      at.WIDGETS_LISTS_CHANGE_SELECTED
    );

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

  it("should dispatch OPEN_LINK when the Learn More option is clicked", () => {
    const learnMoreItem = wrapper.find(".learn-more");
    learnMoreItem.props().onClick();

    assert.ok(dispatch.calledOnce);
    const [action] = dispatch.getCall(0).args;
    assert.equal(action.type, at.OPEN_LINK);
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

  it("should cancel creating a new list when Escape key is pressed", () => {
    const newListId = "new-list-id";

    // Provide a fallback list so CHANGE_SELECTED has somewhere to go after delete
    const stateWithEmptyAndFallback = {
      ...mockState,
      ListsWidget: {
        selected: newListId,
        lists: {
          [newListId]: { label: "", tasks: [], completed: [] }, // empty "new" list
          "test-list": { label: "test", tasks: [], completed: [] }, // fallback
        },
      },
    };

    const localWrapper = mount(
      <WrapWithProvider state={stateWithEmptyAndFallback}>
        <Lists
          dispatch={dispatch}
          handleUserInteraction={handleUserInteraction}
        />
      </WrapWithProvider>
    );

    const editableText = localWrapper.find("EditableText").at(0);

    assert.ok(editableText.exists());
    editableText.props().setIsEditing(true);
    localWrapper.update();

    let editableInput = localWrapper.find("input.edit-list");
    assert.ok(editableInput.exists());

    // Press Escape to cancel new-list creation
    editableInput.simulate("keyDown", { key: "Escape" });
    localWrapper.update();

    // Test dispatches from handleCancelNewList
    const types = dispatch.getCalls().map(call => call.args[0].type);
    assert.include(
      types,
      at.WIDGETS_LISTS_UPDATE,
      "Expected update dispatch on cancel"
    );
    assert.include(
      types,
      at.WIDGETS_LISTS_CHANGE_SELECTED,
      "Expected selected list to change after cancel"
    );
    assert.include(
      types,
      at.WIDGETS_LISTS_USER_EVENT,
      "Expected telemetry event on cancel"
    );

    const listsState = localWrapper.find("Provider").prop("store").getState()
      .ListsWidget.lists;
    assert.strictEqual(
      Object.keys(listsState).length,
      2,
      "expected total lists count to remain as 2 (no new list created on cancel)"
    );

    // After cancelling, the input should be gone (editing ended / list removed)
    editableInput = localWrapper.find("input.edit-list");
    assert.strictEqual(editableInput.exists(), false);
  });
});
