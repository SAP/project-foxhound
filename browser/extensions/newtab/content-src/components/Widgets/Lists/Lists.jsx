/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useSelector, batch } from "react-redux";
import { actionCreators as ac, actionTypes as at } from "common/Actions.mjs";
import { useIntersectionObserver, useConfetti } from "../../../lib/utils";

const TASK_TYPE = {
  IN_PROGRESS: "tasks",
  COMPLETED: "completed",
};

const USER_ACTION_TYPES = {
  LIST_COPY: "list_copy",
  LIST_CREATE: "list_create",
  LIST_EDIT: "list_edit",
  LIST_DELETE: "list_delete",
  TASK_CREATE: "task_create",
  TASK_EDIT: "task_edit",
  TASK_DELETE: "task_delete",
  TASK_COMPLETE: "task_complete",
};

const PREF_WIDGETS_LISTS_MAX_LISTS = "widgets.lists.maxLists";
const PREF_WIDGETS_LISTS_MAX_LISTITEMS = "widgets.lists.maxListItems";
const PREF_WIDGETS_LISTS_BADGE_ENABLED = "widgets.lists.badge.enabled";
const PREF_WIDGETS_LISTS_BADGE_LABEL = "widgets.lists.badge.label";

// eslint-disable-next-line max-statements
function Lists({
  dispatch,
  handleUserInteraction,
  isMaximized,
  widgetsMayBeMaximized,
}) {
  const prefs = useSelector(state => state.Prefs.values);
  const { selected, lists } = useSelector(state => state.ListsWidget);
  const [newTask, setNewTask] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [pendingNewList, setPendingNewList] = useState(null);
  const selectedList = useMemo(() => lists[selected], [lists, selected]);

  // Bug 2012829 - Calculate widget size dynamically based on isMaximized prop.
  // Future sizes: mini, medium, large.
  const widgetSize = isMaximized ? "medium" : "small";

  const prevCompletedCount = useRef(selectedList?.completed?.length || 0);
  const inputRef = useRef(null);
  const selectRef = useRef(null);
  const reorderListRef = useRef(null);
  const [canvasRef, fireConfetti] = useConfetti();
  const impressionFired = useRef(false);

  const handleListInteraction = useCallback(
    () => handleUserInteraction("lists"),
    [handleUserInteraction]
  );

  // store selectedList with useMemo so it isnt re-calculated on every re-render
  const isValidUrl = useCallback(str => URL.canParse(str), []);

  const handleIntersection = useCallback(() => {
    if (impressionFired.current) {
      return;
    }
    impressionFired.current = true;

    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_LISTS_USER_IMPRESSION,
        })
      );
      const telemetryData = {
        widget_name: "lists",
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
      };
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_IMPRESSION,
          data: telemetryData,
        })
      );
    });
  }, [dispatch, widgetsMayBeMaximized, widgetSize]);

  const listsRef = useIntersectionObserver(handleIntersection);

  const reorderLists = useCallback(
    (draggedElement, targetElement, before = false) => {
      const draggedIndex = selectedList.tasks.findIndex(
        ({ id }) => id === draggedElement.id
      );
      const targetIndex = selectedList.tasks.findIndex(
        ({ id }) => id === targetElement.id
      );

      // return early is index is not found
      if (
        draggedIndex === -1 ||
        targetIndex === -1 ||
        draggedIndex === targetIndex
      ) {
        return;
      }

      const reordered = [...selectedList.tasks];
      const [removed] = reordered.splice(draggedIndex, 1);
      const insertIndex = before ? targetIndex : targetIndex + 1;

      reordered.splice(
        insertIndex > draggedIndex ? insertIndex - 1 : insertIndex,
        0,
        removed
      );

      const updatedLists = {
        ...lists,
        [selected]: {
          ...selectedList,
          tasks: reordered,
        },
      };

      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_LISTS_UPDATE,
          data: { lists: updatedLists },
        })
      );
      handleListInteraction();
    },
    [lists, selected, selectedList, dispatch, handleListInteraction]
  );

  const moveTask = useCallback(
    (task, direction) => {
      const index = selectedList.tasks.findIndex(({ id }) => id === task.id);

      // guardrail a falsey index
      if (index === -1) {
        return;
      }

      const targetIndex = direction === "up" ? index - 1 : index + 1;
      const before = direction === "up";
      const targetTask = selectedList.tasks[targetIndex];

      if (targetTask) {
        reorderLists(task, targetTask, before);
      }
    },
    [selectedList, reorderLists]
  );

  useEffect(() => {
    const selectNode = selectRef.current;
    const reorderNode = reorderListRef.current;

    if (!selectNode || !reorderNode) {
      return undefined;
    }

    function handleSelectChange(e) {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_LISTS_CHANGE_SELECTED,
          data: e.target.value,
        })
      );
      handleListInteraction();
    }

    function handleReorder(e) {
      const { draggedElement, targetElement, position } = e.detail;
      reorderLists(draggedElement, targetElement, position === -1);
    }

    reorderNode.addEventListener("reorder", handleReorder);
    selectNode.addEventListener("change", handleSelectChange);

    return () => {
      selectNode.removeEventListener("change", handleSelectChange);
      reorderNode.removeEventListener("reorder", handleReorder);
    };
  }, [dispatch, isEditing, reorderLists, handleListInteraction]);

  // effect that enables editing new list name only after store has been hydrated
  useEffect(() => {
    if (selected === pendingNewList) {
      setIsEditing(true);
      setPendingNewList(null);
    }
  }, [selected, pendingNewList]);

  function saveTask() {
    const trimmedTask = newTask.trimEnd();
    // only add new task if it has a length, to avoid creating empty tasks
    if (trimmedTask) {
      const formattedTask = {
        value: trimmedTask,
        completed: false,
        created: Date.now(),
        id: crypto.randomUUID(),
        isUrl: isValidUrl(trimmedTask),
      };
      const updatedLists = {
        ...lists,
        [selected]: {
          ...selectedList,
          tasks: [formattedTask, ...lists[selected].tasks],
        },
      };
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_LISTS_UPDATE,
            data: { lists: updatedLists },
          })
        );
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_LISTS_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.TASK_CREATE },
          })
        );
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.TASK_CREATE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
        };
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
      setNewTask("");
      handleListInteraction();
    }
  }

  function updateTask(updatedTask, type) {
    const isCompletedType = type === TASK_TYPE.COMPLETED;
    const isNowCompleted = updatedTask.completed;

    let newTasks = selectedList.tasks;
    let newCompleted = selectedList.completed;
    let userAction;

    // If the task is in the completed array and is now unchecked
    const shouldMoveToTasks = isCompletedType && !isNowCompleted;

    // If we're moving the task from tasks → completed (user checked it)
    const shouldMoveToCompleted = !isCompletedType && isNowCompleted;

    //  Move task from completed -> task
    if (shouldMoveToTasks) {
      newCompleted = selectedList.completed.filter(
        task => task.id !== updatedTask.id
      );
      newTasks = [...selectedList.tasks, updatedTask];
      // Move task to completed, but also create local version
    } else if (shouldMoveToCompleted) {
      newTasks = selectedList.tasks.filter(task => task.id !== updatedTask.id);
      newCompleted = [...selectedList.completed, updatedTask];

      userAction = USER_ACTION_TYPES.TASK_COMPLETE;
    } else {
      const targetKey = isCompletedType ? "completed" : "tasks";
      const updatedArray = selectedList[targetKey].map(task =>
        task.id === updatedTask.id ? updatedTask : task
      );
      // In-place update: toggle checkbox (but stay in same array or edit name)
      if (targetKey === "tasks") {
        newTasks = updatedArray;
      } else {
        newCompleted = updatedArray;
      }
      userAction = USER_ACTION_TYPES.TASK_EDIT;
    }

    const updatedLists = {
      ...lists,
      [selected]: {
        ...selectedList,
        tasks: newTasks,
        completed: newCompleted,
      },
    };

    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_LISTS_UPDATE,
          data: { lists: updatedLists },
        })
      );
      if (userAction) {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_LISTS_USER_EVENT,
            data: { userAction },
          })
        );
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: userAction,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
        };
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      }
    });
    handleListInteraction();
  }

  function deleteTask(task, type) {
    const selectedTasks = lists[selected][type];
    const updatedTasks = selectedTasks.filter(({ id }) => id !== task.id);

    const updatedLists = {
      ...lists,
      [selected]: {
        ...selectedList,
        [type]: updatedTasks,
      },
    };
    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_LISTS_UPDATE,
          data: { lists: updatedLists },
        })
      );
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_LISTS_USER_EVENT,
          data: { userAction: USER_ACTION_TYPES.TASK_DELETE },
        })
      );
      const telemetryData = {
        widget_name: "lists",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.TASK_DELETE,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
    handleListInteraction();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && document.activeElement === inputRef.current) {
      saveTask();
    } else if (
      e.key === "Escape" &&
      document.activeElement === inputRef.current
    ) {
      // Clear out the input when esc is pressed
      setNewTask("");
    }
  }

  function handleListNameSave(newLabel) {
    const trimmedLabel = newLabel.trimEnd();
    if (trimmedLabel && trimmedLabel !== selectedList?.label) {
      const updatedLists = {
        ...lists,
        [selected]: {
          ...selectedList,
          label: trimmedLabel,
        },
      };
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_LISTS_UPDATE,
            data: { lists: updatedLists },
          })
        );
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_LISTS_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.LIST_EDIT },
          })
        );
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.LIST_EDIT,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
        };
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
      setIsEditing(false);
      handleListInteraction();
    }
  }

  function handleCreateNewList() {
    const id = crypto.randomUUID();
    const newLists = {
      ...lists,
      [id]: {
        label: "",
        tasks: [],
        completed: [],
      },
    };

    batch(() => {
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_LISTS_UPDATE,
          data: { lists: newLists },
        })
      );
      dispatch(
        ac.AlsoToMain({
          type: at.WIDGETS_LISTS_CHANGE_SELECTED,
          data: id,
        })
      );
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_LISTS_USER_EVENT,
          data: { userAction: USER_ACTION_TYPES.LIST_CREATE },
        })
      );
      const telemetryData = {
        widget_name: "lists",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.LIST_CREATE,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
    setPendingNewList(id);
    handleListInteraction();
  }

  function handleCancelNewList() {
    // If current list is new and has no label/tasks, remove it
    if (!selectedList?.label && selectedList?.tasks?.length === 0) {
      const updatedLists = { ...lists };
      delete updatedLists[selected];

      const listKeys = Object.keys(updatedLists);
      const key = listKeys[listKeys.length - 1];
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_LISTS_UPDATE,
            data: { lists: updatedLists },
          })
        );
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_LISTS_CHANGE_SELECTED,
            data: key,
          })
        );
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_LISTS_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.LIST_DELETE },
          })
        );
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.LIST_DELETE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
        };
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
    }

    handleListInteraction();
  }

  function handleDeleteList() {
    let updatedLists = { ...lists };
    if (updatedLists[selected]) {
      delete updatedLists[selected];

      // if this list was the last one created, add a new list as default
      if (Object.keys(updatedLists)?.length === 0) {
        updatedLists = {
          [crypto.randomUUID()]: {
            label: "",
            tasks: [],
            completed: [],
          },
        };
      }
      const listKeys = Object.keys(updatedLists);
      const key = listKeys[listKeys.length - 1];
      batch(() => {
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_LISTS_UPDATE,
            data: { lists: updatedLists },
          })
        );
        dispatch(
          ac.AlsoToMain({
            type: at.WIDGETS_LISTS_CHANGE_SELECTED,
            data: key,
          })
        );
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_LISTS_USER_EVENT,
            data: { userAction: USER_ACTION_TYPES.LIST_DELETE },
          })
        );
        const telemetryData = {
          widget_name: "lists",
          widget_source: "widget",
          user_action: USER_ACTION_TYPES.LIST_DELETE,
          widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
        };
        dispatch(
          ac.OnlyToMain({
            type: at.WIDGETS_USER_EVENT,
            data: telemetryData,
          })
        );
      });
    }
    handleListInteraction();
  }

  function handleHideLists() {
    batch(() => {
      dispatch(
        ac.OnlyToMain({
          type: at.SET_PREF,
          data: {
            name: "widgets.lists.enabled",
            value: false,
          },
        })
      );
      const telemetryData = {
        widget_name: "lists",
        widget_source: "context_menu",
        enabled: false,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_ENABLED,
          data: telemetryData,
        })
      );
    });
    handleListInteraction();
  }

  function handleCopyListToClipboard() {
    const currentList = lists[selected];

    if (!currentList) {
      return;
    }

    const { label, tasks = [], completed = [] } = currentList;

    const uncompleted = tasks.filter(task => !task.completed);
    const currentCompleted = tasks.filter(task => task.completed);

    // In order in include all items, we need to iterate through both current and completed tasks list and mark format all completed tasks accordingly.
    const formatted = [
      `List: ${label}`,
      `---`,
      ...uncompleted.map(task => `- [ ] ${task.value}`),
      ...currentCompleted.map(task => `- [x] ${task.value}`),
      ...completed.map(task => `- [x] ${task.value}`),
    ].join("\n");

    try {
      navigator.clipboard.writeText(formatted);
    } catch (err) {
      console.error("Copy failed", err);
    }

    batch(() => {
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_LISTS_USER_EVENT,
          data: { userAction: USER_ACTION_TYPES.LIST_COPY },
        })
      );
      const telemetryData = {
        widget_name: "lists",
        widget_source: "widget",
        user_action: USER_ACTION_TYPES.LIST_COPY,
        widget_size: widgetsMayBeMaximized ? widgetSize : "medium",
      };
      dispatch(
        ac.OnlyToMain({
          type: at.WIDGETS_USER_EVENT,
          data: telemetryData,
        })
      );
    });
    handleListInteraction();
  }

  function handleLearnMore() {
    dispatch(
      ac.OnlyToMain({
        type: at.OPEN_LINK,
        data: {
          url: "https://support.mozilla.org/kb/firefox-new-tab-widgets",
        },
      })
    );
    handleListInteraction();
  }

  // Reset baseline only when switching lists
  useEffect(() => {
    prevCompletedCount.current = selectedList?.completed?.length || 0;
    // intentionally leaving out selectedList from dependency array
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected]);

  useEffect(() => {
    if (selectedList) {
      const doneCount = selectedList.completed?.length || 0;
      const previous = Math.floor(prevCompletedCount.current / 5);
      const current = Math.floor(doneCount / 5);

      if (current > previous) {
        fireConfetti();
      }
      prevCompletedCount.current = doneCount;
    }
  }, [selectedList, fireConfetti, selected]);

  if (!lists) {
    return null;
  }

  // Enforce maximum count limits to lists
  const currentListsCount = Object.keys(lists).length;
  // Ensure a minimum of 1, but allow higher values from prefs
  const maxListsCount = Math.max(1, prefs[PREF_WIDGETS_LISTS_MAX_LISTS]);
  const isAtMaxListsLimit = currentListsCount >= maxListsCount;

  // Enforce maximum count limits to list items
  // The maximum applies to the total number of items (both incomplete and completed items)
  const currentSelectedListItemsCount =
    selectedList?.tasks.length + selectedList?.completed.length;

  // Ensure a minimum of 1, but allow higher values from prefs
  const maxListItemsCount = Math.max(
    1,
    prefs[PREF_WIDGETS_LISTS_MAX_LISTITEMS]
  );

  const isAtMaxListItemsLimit =
    currentSelectedListItemsCount >= maxListItemsCount;

  // Figure out if the selected list is the first (default) or a new one.
  // Index 0 → use "Task list"; any later index → use "New list".
  // Fallback to 0 if the selected id isn’t found.
  const listKeys = Object.keys(lists);
  const selectedIndex = Math.max(0, listKeys.indexOf(selected));

  const listNamePlaceholder =
    currentListsCount > 1 && selectedIndex !== 0
      ? "newtab-widget-lists-name-placeholder-new"
      : "newtab-widget-lists-name-placeholder-default";

  const nimbusBadgeEnabled = prefs.widgetsConfig?.listsBadgeEnabled;
  const nimbusBadgeLabel = prefs.widgetsConfig?.listsBadgeLabel;
  const nimbusBadgeTrainhopEnabled =
    prefs.trainhopConfig?.widgets?.listsBadgeEnabled;
  const nimbusBadgeTrainhopLabel =
    prefs.trainhopConfig?.widgets?.listsBadgeLabel;

  const badgeEnabled =
    (nimbusBadgeEnabled || nimbusBadgeTrainhopEnabled) ??
    prefs[PREF_WIDGETS_LISTS_BADGE_ENABLED] ??
    false;

  const badgeLabel =
    (nimbusBadgeLabel || nimbusBadgeTrainhopLabel) ??
    prefs[PREF_WIDGETS_LISTS_BADGE_LABEL] ??
    "";

  return (
    <article
      className={`lists ${isMaximized ? "is-maximized" : ""}`}
      ref={el => {
        listsRef.current = [el];
      }}
    >
      <div className="select-wrapper">
        <EditableText
          value={lists[selected]?.label || ""}
          onSave={handleListNameSave}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          onCancel={handleCancelNewList}
          type="list"
          maxLength={30}
          dataL10nId={listNamePlaceholder}
        >
          <moz-select ref={selectRef} value={selected}>
            {Object.entries(lists).map(([key, list]) => (
              <moz-option
                key={key}
                value={key}
                // On the first/initial list, use default name
                {...(list.label
                  ? { label: list.label }
                  : {
                      "data-l10n-id": "newtab-widget-lists-name-label-default",
                    })}
              />
            ))}
          </moz-select>
        </EditableText>
        {/* Hide the badge when user is editing task list title */}
        {!isEditing && badgeEnabled && badgeLabel && (
          <moz-badge
            data-l10n-id={(() => {
              if (badgeLabel === "New") {
                return "newtab-widget-lists-label-new";
              }
              if (badgeLabel === "Beta") {
                return "newtab-widget-lists-label-beta";
              }
              return "";
            })()}
          ></moz-badge>
        )}
        <moz-button
          className="lists-panel-button"
          iconSrc="chrome://global/skin/icons/more.svg"
          menuId="lists-panel"
          type="ghost"
        />
        <panel-list id="lists-panel">
          <panel-item
            data-l10n-id="newtab-widget-lists-menu-edit"
            onClick={() => setIsEditing(true)}
          ></panel-item>
          <panel-item
            {...(isAtMaxListsLimit ? { disabled: true } : {})}
            data-l10n-id="newtab-widget-lists-menu-create"
            onClick={() => handleCreateNewList()}
            className="create-list"
          ></panel-item>
          <panel-item
            data-l10n-id="newtab-widget-lists-menu-delete"
            onClick={() => handleDeleteList()}
          ></panel-item>
          <hr />
          <panel-item
            data-l10n-id="newtab-widget-lists-menu-copy"
            onClick={() => handleCopyListToClipboard()}
          ></panel-item>
          <panel-item
            data-l10n-id="newtab-widget-lists-menu-hide"
            onClick={() => handleHideLists()}
          ></panel-item>
          <panel-item
            className="learn-more"
            data-l10n-id="newtab-widget-lists-menu-learn-more"
            onClick={handleLearnMore}
          ></panel-item>
        </panel-list>
      </div>
      <div className="add-task-container">
        <span
          className={`icon icon-add ${isAtMaxListItemsLimit ? "icon-disabled" : ""}`}
        />
        <input
          ref={inputRef}
          onBlur={() => saveTask()}
          onChange={e => setNewTask(e.target.value)}
          value={newTask}
          data-l10n-id="newtab-widget-lists-input-add-an-item"
          className="add-task-input"
          onKeyDown={handleKeyDown}
          type="text"
          maxLength={100}
          disabled={isAtMaxListItemsLimit}
        />
      </div>
      <div className="task-list-wrapper">
        <moz-reorderable-list
          ref={reorderListRef}
          itemSelector="fieldset .task-type-tasks"
          dragSelector=".checkbox-wrapper:has(.task-label)"
        >
          <fieldset>
            {/* Incomplete List  */}
            {selectedList?.tasks.length >= 1 &&
              selectedList.tasks.map((task, index) => (
                <ListItem
                  type={TASK_TYPE.IN_PROGRESS}
                  task={task}
                  key={task.id}
                  updateTask={updateTask}
                  deleteTask={deleteTask}
                  moveTask={moveTask}
                  isValidUrl={isValidUrl}
                  isFirst={index === 0}
                  isLast={index === selectedList.tasks.length - 1}
                />
              ))}
            {/* Completed List */}
            {selectedList?.completed.length >= 1 && (
              <details
                className="completed-task-wrapper"
                open={selectedList?.tasks.length < 1}
              >
                <summary>
                  <span
                    data-l10n-id="newtab-widget-lists-completed-list"
                    data-l10n-args={JSON.stringify({
                      number: lists[selected]?.completed.length,
                    })}
                    className="completed-title"
                  ></span>
                </summary>
                {selectedList?.completed.map(completedTask => (
                  <ListItem
                    key={completedTask.id}
                    type={TASK_TYPE.COMPLETED}
                    task={completedTask}
                    deleteTask={deleteTask}
                    updateTask={updateTask}
                  />
                ))}
              </details>
            )}
          </fieldset>
        </moz-reorderable-list>
        {/* Empty State */}
        {selectedList?.tasks.length < 1 &&
          selectedList?.completed.length < 1 && (
            <div className="empty-list">
              <picture>
                <source
                  srcSet="chrome://newtab/content/data/content/assets/lists-empty-state-dark.svg"
                  media="(prefers-color-scheme: dark)"
                />
                <source
                  srcSet="chrome://newtab/content/data/content/assets/lists-empty-state-light.svg"
                  media="(prefers-color-scheme: light)"
                />
                <img width="100" height="100" alt="" />
              </picture>
              <p
                className="empty-list-text"
                data-l10n-id="newtab-widget-lists-empty-cta"
              ></p>
            </div>
          )}
      </div>
      <canvas className="confetti-canvas" ref={canvasRef} />
    </article>
  );
}

function ListItem({
  task,
  updateTask,
  deleteTask,
  moveTask,
  isValidUrl,
  type,
  isFirst = false,
  isLast = false,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [exiting, setExiting] = useState(false);
  const isCompleted = type === TASK_TYPE.COMPLETED;

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function handleCheckboxChange(e) {
    const { checked } = e.target;
    const updatedTask = { ...task, completed: checked };
    if (checked && !prefersReducedMotion) {
      setExiting(true);
    } else {
      updateTask(updatedTask, type);
    }
  }

  // When the CSS transition finishes, dispatch the real “completed = true”
  function handleTransitionEnd(e) {
    // only fire once for the exit:
    if (e.propertyName === "opacity" && exiting) {
      updateTask({ ...task, completed: true }, type);
      setExiting(false);
    }
  }

  function handleSave(newValue) {
    const trimmedTask = newValue.trimEnd();
    if (trimmedTask && trimmedTask !== task.value) {
      updateTask(
        { ...task, value: newValue, isUrl: isValidUrl(trimmedTask) },
        type
      );
      setIsEditing(false);
    }
  }

  function handleDelete() {
    deleteTask(task, type);
  }

  const taskLabel = task.isUrl ? (
    <a
      href={task.value}
      rel="noopener noreferrer"
      target="_blank"
      className="task-label"
      title={task.value}
    >
      {task.value}
    </a>
  ) : (
    <label
      className="task-label"
      title={task.value}
      htmlFor={`task-${task.id}`}
      onClick={() => setIsEditing(true)}
    >
      {task.value}
    </label>
  );

  return (
    <div
      className={`task-item task-type-${type} ${exiting ? " exiting" : ""}`}
      id={task.id}
      key={task.id}
      onTransitionEnd={handleTransitionEnd}
    >
      <div className="checkbox-wrapper" key={isEditing}>
        <input
          type="checkbox"
          onChange={handleCheckboxChange}
          checked={task.completed || exiting}
          id={`task-${task.id}`}
        />
        {isCompleted ? (
          taskLabel
        ) : (
          <EditableText
            isEditing={isEditing}
            setIsEditing={setIsEditing}
            value={task.value}
            onSave={handleSave}
            type="task"
          >
            {taskLabel}
          </EditableText>
        )}
      </div>
      <moz-button
        iconSrc="chrome://global/skin/icons/more.svg"
        menuId={`panel-task-${task.id}`}
        type="ghost"
      />
      <panel-list id={`panel-task-${task.id}`}>
        {!isCompleted && (
          <>
            {task.isUrl && (
              <panel-item
                data-l10n-id="newtab-widget-lists-input-menu-open-link"
                onClick={() => window.open(task.value, "_blank", "noopener")}
              ></panel-item>
            )}
            <panel-item
              {...(isFirst ? { disabled: true } : {})}
              onClick={() => moveTask(task, "up")}
              data-l10n-id="newtab-widget-lists-input-menu-move-up"
            ></panel-item>
            <panel-item
              {...(isLast ? { disabled: true } : {})}
              onClick={() => moveTask(task, "down")}
              data-l10n-id="newtab-widget-lists-input-menu-move-down"
            ></panel-item>
            <panel-item
              data-l10n-id="newtab-widget-lists-input-menu-edit"
              className="edit-item"
              onClick={() => setIsEditing(true)}
            ></panel-item>
          </>
        )}
        <panel-item
          data-l10n-id="newtab-widget-lists-input-menu-delete"
          className="delete-item"
          onClick={handleDelete}
        ></panel-item>
      </panel-list>
    </div>
  );
}

function EditableText({
  value,
  isEditing,
  setIsEditing,
  onSave,
  onCancel,
  children,
  type,
  dataL10nId = null,
  maxLength = 100,
}) {
  const [tempValue, setTempValue] = useState(value);
  const inputRef = useRef(null);

  // True if tempValue is empty, null/undefined, or only whitespace
  const showPlaceholder = (tempValue ?? "").trim() === "";

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
    } else {
      setTempValue(value);
    }
  }, [isEditing, value]);

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      onSave(tempValue.trim());
      setIsEditing(false);
    } else if (e.key === "Escape") {
      setIsEditing(false);
      setTempValue(value);
      onCancel?.();
    }
  }

  function handleOnBlur() {
    onSave(tempValue.trim());
    setIsEditing(false);
  }

  return isEditing ? (
    <input
      className={`edit-${type}`}
      ref={inputRef}
      type="text"
      value={tempValue}
      maxLength={maxLength}
      onChange={event => setTempValue(event.target.value)}
      onBlur={handleOnBlur}
      onKeyDown={handleKeyDown}
      // Note that if a user has a custom name set, it will override the placeholder
      {...(showPlaceholder && dataL10nId ? { "data-l10n-id": dataL10nId } : {})}
    />
  ) : (
    [children]
  );
}

export { Lists };
