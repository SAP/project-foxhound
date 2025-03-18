const br = browser.runtime;
const listeners = {};

export function emit(type, data) {
  if (arguments.length > 2) {
    throw new Error('There should be exactly two arguments, currently there are ' + arguments.length);
  }

  if (typeof type !== 'string') {
    throw new Error('Property "type" needs to exist and to be of type string.');
  }

  if (data == undefined) {
    throw new Error('Property "data" needs to be given!');
  }

  br.sendMessage({
    type,
    data
  });
}

export function on(type, handler) {
  if (typeof type !== 'string') {
    throw new Error('"type" has to be of type string.');
  }

  if (typeof handler !== 'function') {
    throw new Error('"handler" has to be of type function.');
  }

  if (!listeners[type]) {
    listeners[type] = [];
  }

  listeners[type].push(handler);
}

export function remove(type, handler) {
  if (typeof type !== 'string') {
    throw new Error('"type" has to be of type string.');
  }

  if (typeof handler !== 'function') {
    throw new Error('"handler" has to be of type function.');
  }

  if (listeners[type]) {
    listeners[type] = listeners[type].filter(l => l != handler);
  }

  if (listeners[type].length === 0) {
    delete listeners[type];
  }
}

br.onMessage.addListener((msg, sender, sendResponse) => {
  // There cannot be empty lists of listeners for a type, they get pruned in remove()
  if (!listeners[msg.type]) {
    dispatchToListeners({
      type: '__UNKNOWN_TYPE__',
      data: msg.type
    });
    return;
  }
  dispatchToListeners(msg, sender, sendResponse);
});

function dispatchToListeners(msg, sender, sendResponse) {
  (listeners[msg.type] || []).forEach(l => l(msg.data, sender, sendResponse));
}
