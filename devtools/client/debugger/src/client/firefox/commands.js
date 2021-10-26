/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

// @flow

import { createThread, createFrame } from "./create";
import {
  addThreadEventListeners,
  clientEvents,
  removeThreadEventListeners,
  ensureSourceActor,
} from "./events";
import { makePendingLocationId } from "../../utils/breakpoint";

// $FlowIgnore
import Reps from "devtools/client/shared/components/reps/index";

import type {
  ActorId,
  BreakpointLocation,
  BreakpointOptions,
  PendingLocation,
  Frame,
  FrameId,
  OINode,
  Script,
  SourceId,
  SourceActor,
  Range,
  URL,
  Thread,
} from "../../types";

import type {
  Target,
  DevToolsClient,
  TargetList,
  Grip,
  ThreadFront,
  ObjectFront,
  ExpressionResult,
} from "./types";

import type { EventListenerCategoryList } from "../../actions/types";

let targets: { [string]: Target };
let devToolsClient: DevToolsClient;
let targetList: TargetList;
let sourceActors: { [ActorId]: SourceId };
let breakpoints: { [string]: Object };

const CALL_STACK_PAGE_SIZE = 1000;

type Dependencies = {
  devToolsClient: DevToolsClient,
  targetList: TargetList,
};

function setupCommands(dependencies: Dependencies): void {
  devToolsClient = dependencies.devToolsClient;
  targetList = dependencies.targetList;
  targets = {};
  sourceActors = {};
  breakpoints = {};
}

function currentTarget(): Target {
  return targetList.targetFront;
}

function currentThreadFront(): ThreadFront {
  return currentTarget().threadFront;
}

function createObjectFront(grip: Grip): ObjectFront {
  if (!grip.actor) {
    throw new Error("Actor is missing");
  }

  return devToolsClient.createObjectFront(grip, currentThreadFront());
}

async function loadObjectProperties(root: OINode) {
  const { utils } = Reps.objectInspector;
  const properties = await utils.loadProperties.loadItemProperties(
    root,
    devToolsClient
  );
  return utils.node.getChildren({
    item: root,
    loadedProperties: new Map([[root.path, properties]]),
  });
}

function releaseActor(actor: String) {
  if (!actor) {
    return;
  }
  const objFront = devToolsClient.getFrontByID(actor);

  if (objFront) {
    return objFront.release().catch(() => {});
  }
}

function sendPacket(packet: Object) {
  return devToolsClient.request(packet);
}

// Get a copy of the current targets.
function getTargetsMap(): { string: Target } {
  return Object.assign({}, targets);
}

function lookupTarget(thread: string) {
  if (thread == currentThreadFront().actor) {
    return currentTarget();
  }

  const targetsMap = getTargetsMap();
  if (!targetsMap[thread]) {
    throw new Error(`Unknown thread front: ${thread}`);
  }

  return targetsMap[thread];
}

function lookupThreadFront(thread: string) {
  const target = lookupTarget(thread);
  return target.threadFront;
}

function listThreadFronts() {
  const list = (Object.values(getTargetsMap()): any);
  return list.map(target => target.threadFront).filter(t => !!t);
}

function forEachThread(iteratee) {
  // We have to be careful here to atomically initiate the operation on every
  // thread, with no intervening await. Otherwise, other code could run and
  // trigger additional thread operations. Requests on server threads will
  // resolve in FIFO order, and this could result in client and server state
  // going out of sync.

  const promises = [currentThreadFront(), ...listThreadFronts()].map(
    // If a thread shuts down while sending the message then it will
    // throw. Ignore these exceptions.
    t => iteratee(t).catch(e => console.log(e))
  );

  return Promise.all(promises);
}

function resume(thread: string, frameId: ?FrameId): Promise<*> {
  return lookupThreadFront(thread).resume();
}

function stepIn(thread: string, frameId: ?FrameId): Promise<*> {
  return lookupThreadFront(thread).stepIn(frameId);
}

function stepOver(thread: string, frameId: ?FrameId): Promise<*> {
  return lookupThreadFront(thread).stepOver(frameId);
}

function stepOut(thread: string, frameId: ?FrameId): Promise<*> {
  return lookupThreadFront(thread).stepOut(frameId);
}

function restart(thread: string, frameId: FrameId): Promise<*> {
  return lookupThreadFront(thread).restart(frameId);
}

function breakOnNext(thread: string): Promise<*> {
  return lookupThreadFront(thread).breakOnNext();
}

async function sourceContents({
  actor,
  thread,
}: SourceActor): Promise<{| source: any, contentType: ?string |}> {
  const sourceThreadFront = lookupThreadFront(thread);
  const sourceFront = sourceThreadFront.source({ actor });
  const { source, contentType } = await sourceFront.source();
  return { source, contentType };
}

function setXHRBreakpoint(path: string, method: string) {
  return currentThreadFront().setXHRBreakpoint(path, method);
}

function removeXHRBreakpoint(path: string, method: string) {
  return currentThreadFront().removeXHRBreakpoint(path, method);
}

export function toggleJavaScriptEnabled(enabled: Boolean) {
  return currentTarget().reconfigure({
    options: {
      javascriptEnabled: enabled,
    },
  });
}

function addWatchpoint(
  object: Grip,
  property: string,
  label: string,
  watchpointType: string
) {
  if (currentTarget().traits.watchpoints) {
    const objectFront = createObjectFront(object);
    return objectFront.addWatchpoint(property, label, watchpointType);
  }
}

async function removeWatchpoint(object: Grip, property: string) {
  if (currentTarget().traits.watchpoints) {
    const objectFront = createObjectFront(object);
    await objectFront.removeWatchpoint(property);
  }
}

function hasBreakpoint(location: BreakpointLocation) {
  return !!breakpoints[makePendingLocationId(location)];
}

function setBreakpoint(
  location: BreakpointLocation,
  options: BreakpointOptions
) {
  breakpoints[makePendingLocationId(location)] = { location, options };

  return forEachThread(thread => thread.setBreakpoint(location, options));
}

function removeBreakpoint(location: PendingLocation) {
  delete breakpoints[makePendingLocationId((location: any))];

  return forEachThread(thread => thread.removeBreakpoint(location));
}

function evaluateInFrame(
  script: Script,
  options: EvaluateParam
): Promise<{ result: ExpressionResult }> {
  return evaluate(script, options);
}

async function evaluateExpressions(scripts: Script[], options: EvaluateParam) {
  return Promise.all(scripts.map(script => evaluate(script, options)));
}

type EvaluateParam = { thread: string, frameId: ?FrameId };

async function evaluate(
  script: ?Script,
  { thread, frameId }: EvaluateParam = {}
): Promise<{ result: ExpressionResult }> {
  const params = { thread, frameActor: frameId };
  if (!currentTarget() || !script) {
    return { result: null };
  }

  const target = thread ? lookupTarget(thread) : currentTarget();
  const consoleFront = await target.getFront("console");
  if (!consoleFront) {
    return { result: null };
  }

  return consoleFront.evaluateJSAsync(script, params);
}

async function autocomplete(
  input: string,
  cursor: number,
  frameId: ?string
): Promise<mixed> {
  if (!currentTarget() || !input) {
    return {};
  }
  const consoleFront = await currentTarget().getFront("console");
  if (!consoleFront) {
    return {};
  }

  return new Promise(resolve => {
    consoleFront.autocomplete(
      input,
      cursor,
      result => resolve(result),
      frameId
    );
  });
}

function navigate(url: URL): Promise<*> {
  return currentTarget().navigateTo({ url });
}

function reload(): Promise<*> {
  return currentTarget().reload();
}

function getProperties(thread: string, grip: Grip): Promise<*> {
  const objClient = lookupThreadFront(thread).pauseGrip(grip);

  return objClient.getPrototypeAndProperties().then(resp => {
    const { ownProperties, safeGetterValues } = resp;
    for (const name in safeGetterValues) {
      const { enumerable, writable, getterValue } = safeGetterValues[name];
      ownProperties[name] = { enumerable, writable, value: getterValue };
    }
    return resp;
  });
}

async function getFrames(thread: string) {
  const threadFront = lookupThreadFront(thread);
  const response = await threadFront.getFrames(0, CALL_STACK_PAGE_SIZE);

  // Ensure that each frame has its source already available.
  // Because of throttling, the source may be available a bit late.
  await Promise.all(
    response.frames.map(frame => ensureSourceActor(frame.where.actor))
  );

  return response.frames.map<?Frame>((frame, i) =>
    createFrame(thread, frame, i)
  );
}

async function getFrameScopes(frame: Frame): Promise<*> {
  const frameFront = lookupThreadFront(frame.thread).getActorByID(frame.id);
  return frameFront.getEnvironment();
}

function pauseOnExceptions(
  shouldPauseOnExceptions: boolean,
  shouldPauseOnCaughtExceptions: boolean
): Promise<*> {
  return forEachThread(thread =>
    thread.pauseOnExceptions(
      shouldPauseOnExceptions,
      // Providing opposite value because server
      // uses "shouldIgnoreCaughtExceptions"
      !shouldPauseOnCaughtExceptions
    )
  );
}

async function blackBox(
  sourceActor: SourceActor,
  isBlackBoxed: boolean,
  range?: Range
): Promise<*> {
  const sourceFront = currentThreadFront().source({ actor: sourceActor.actor });
  if (isBlackBoxed) {
    await sourceFront.unblackBox(range);
  } else {
    await sourceFront.blackBox(range);
  }
}

function setSkipPausing(shouldSkip: boolean) {
  return forEachThread(thread => thread.skipBreakpoints(shouldSkip));
}

function interrupt(thread: string): Promise<*> {
  return lookupThreadFront(thread).interrupt();
}

function setEventListenerBreakpoints(ids: string[]) {
  return forEachThread(thread => thread.setActiveEventBreakpoints(ids));
}

// eslint-disable-next-line
async function getEventListenerBreakpointTypes(): Promise<EventListenerCategoryList> {
  let categories;
  try {
    categories = await currentThreadFront().getAvailableEventBreakpoints();

    if (!Array.isArray(categories)) {
      // When connecting to older browser that had our placeholder
      // implementation of the 'getAvailableEventBreakpoints' endpoint, we
      // actually get back an object with a 'value' property containing
      // the categories. Since that endpoint wasn't actually backed with a
      // functional implementation, we just bail here instead of storing the
      // 'value' property into the categories.
      categories = null;
    }
  } catch (err) {
    // Event bps aren't supported on this firefox version.
  }
  return categories || [];
}

function pauseGrip(thread: string, func: Function): ObjectFront {
  return lookupThreadFront(thread).pauseGrip(func);
}

function registerSourceActor(sourceActorId: string, sourceId: SourceId) {
  sourceActors[sourceActorId] = sourceId;
}

async function toggleEventLogging(logEventBreakpoints: boolean) {
  return forEachThread(thread =>
    thread.toggleEventLogging(logEventBreakpoints)
  );
}

function getAllThreadFronts(): ThreadFront[] {
  const fronts = [currentThreadFront()];
  for (const { threadFront } of (Object.values(targets): any)) {
    fronts.push(threadFront);
  }
  return fronts;
}

// Check if any of the targets were paused before we opened
// the debugger. If one is paused. Fake a `pause` RDP event
// by directly calling the client event listener.
async function checkIfAlreadyPaused() {
  for (const threadFront of getAllThreadFronts()) {
    const pausedPacket = threadFront.getLastPausePacket();
    if (pausedPacket) {
      clientEvents.paused(threadFront, pausedPacket);
    }
  }
}

function getSourceForActor(actor: ActorId) {
  if (!sourceActors[actor]) {
    throw new Error(`Unknown source actor: ${actor}`);
  }
  return sourceActors[actor];
}

async function addThread(targetFront: Target) {
  const threadActorID = targetFront.targetForm.threadActor;
  if (!targets[threadActorID]) {
    targets[threadActorID] = targetFront;
    addThreadEventListeners(targetFront.threadFront);
  }
  return createThread(threadActorID, targetFront);
}

function removeThread(thread: Thread) {
  const targetFront = targets[thread.actor];
  if (targetFront) {
    // Note that if the target is already fully destroyed, threadFront will be
    // null, but event listeners will already have been removed.
    removeThreadEventListeners(targetFront.threadFront);
  }

  delete targets[thread.actor];
}

function getMainThread() {
  return currentThreadFront().actor;
}

async function getSourceActorBreakpointPositions(
  { thread, actor }: SourceActor,
  range: Range
): Promise<{ [number]: number[] }> {
  const sourceThreadFront = lookupThreadFront(thread);
  const sourceFront = sourceThreadFront.source({ actor });
  return sourceFront.getBreakpointPositionsCompressed(range);
}

async function getSourceActorBreakableLines({
  thread,
  actor,
}: SourceActor): Promise<Array<number>> {
  let sourceFront;
  let actorLines = [];
  try {
    const sourceThreadFront = lookupThreadFront(thread);
    sourceFront = sourceThreadFront.source({ actor });
    actorLines = await sourceFront.getBreakableLines();
  } catch (e) {
    // Handle backward compatibility
    if (
      e.message &&
      e.message.match(/does not recognize the packet type getBreakableLines/)
    ) {
      const pos = await (sourceFront: any).getBreakpointPositionsCompressed();
      actorLines = Object.keys(pos).map(line => Number(line));
    } else {
      // Other exceptions could be due to the target thread being shut down.
      console.warn(`getSourceActorBreakableLines failed: ${e}`);
    }
  }

  return actorLines;
}

function getFrontByID(actorID: String) {
  return devToolsClient.getFrontByID(actorID);
}

function fetchAncestorFramePositions(index: number) {
  currentThreadFront().fetchAncestorFramePositions(index);
}

const clientCommands = {
  autocomplete,
  blackBox,
  createObjectFront,
  loadObjectProperties,
  releaseActor,
  interrupt,
  pauseGrip,
  resume,
  stepIn,
  stepOut,
  stepOver,
  restart,
  breakOnNext,
  sourceContents,
  getSourceForActor,
  getSourceActorBreakpointPositions,
  getSourceActorBreakableLines,
  hasBreakpoint,
  setBreakpoint,
  setXHRBreakpoint,
  removeXHRBreakpoint,
  addWatchpoint,
  removeWatchpoint,
  removeBreakpoint,
  evaluate,
  evaluateInFrame,
  evaluateExpressions,
  navigate,
  reload,
  getProperties,
  getFrameScopes,
  getFrames,
  pauseOnExceptions,
  toggleEventLogging,
  checkIfAlreadyPaused,
  registerSourceActor,
  addThread,
  removeThread,
  getMainThread,
  sendPacket,
  setSkipPausing,
  setEventListenerBreakpoints,
  getEventListenerBreakpointTypes,
  lookupTarget,
  getFrontByID,
  fetchAncestorFramePositions,
  toggleJavaScriptEnabled,
};

export { setupCommands, clientCommands };
