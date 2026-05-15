// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

/// Error type thrown by `EventListener` callbacks
struct HandlerError: Error {
    let value: Any?

    init(_ value: Any?) {
        self.value = value
    }
}

/// Protocol implemented by objects which want to listen to messages from `EventDispatcher`.
protocol EventListener {
    /// Handler method for a message dispatched on the `EventDispatcher` by Gecko.
    @MainActor
    func handleMessage(type: String, message: [String: Any?]?) async throws -> Any?
}

extension EventListener {
    /// Internal helper for invoking the callback from a synchronous context.
    func handleMessage(type: String, message: [String: Any?]?, callback: EventCallback?) {
        Task { @MainActor in
            do {
                let result = try await self.handleMessage(type: type, message: message)
                callback?.sendSuccess(result)
            } catch let error as HandlerError {
                callback?.sendError(error.value)
            } catch {
                callback?.sendError("\(error)")
            }
        }
    }
}

class EventDispatcher: NSObject, SwiftEventDispatcher {
    static var runtimeInstance = EventDispatcher()
    static var dispatchers: [String: EventDispatcher] = [:]

    struct QueuedMessage {
        let type: String
        let message: [String: Any?]?
        let callback: EventCallback?
    }

    var gecko: GeckoEventDispatcher?
    var queue: [QueuedMessage]? = []
    var listeners: [String: [EventListener]] = [:]
    var name: String?

    override init() {}

    init(name: String) {
        self.name = name
    }

    public static func lookup(byName: String) -> EventDispatcher {
        if let dispatcher = dispatchers[byName] {
            return dispatcher
        }
        let newDispatcher = EventDispatcher(name: byName)
        dispatchers[byName] = newDispatcher
        return newDispatcher
    }

    public func addListener(type: String, listener: EventListener) {
        listeners[type, default: []] += [listener]
    }

    public func dispatch(
        type: String, message: [String: Any?]? = nil, callback: EventCallback? = nil
    ) {
        if let eventListeners = listeners[type] {
            for listener in eventListeners {
                listener.handleMessage(type: type, message: message, callback: callback)
            }
        } else if queue != nil {
            queue!.append(QueuedMessage(type: type, message: message, callback: callback))
        } else {
            gecko?.dispatch(toGecko: type, message: message, callback: callback)
        }
    }

    public func query(type: String, message: [String: Any?]? = nil) async throws -> Any? {
        class AsyncCallback: NSObject, EventCallback {
            var continuation: CheckedContinuation<Any?, Error>?
            init(_ continuation: CheckedContinuation<Any?, Error>) {
                self.continuation = continuation
            }
            func sendSuccess(_ response: Any?) {
                continuation?.resume(returning: response)
                continuation = nil
            }
            func sendError(_ response: Any?) {
                continuation?.resume(throwing: HandlerError(response))
                continuation = nil
            }
            deinit {
                continuation?.resume(throwing: HandlerError("callback never invoked"))
                continuation = nil
            }
        }

        return try await withCheckedThrowingContinuation({
            dispatch(type: type, message: message, callback: AsyncCallback($0))
        })
    }

    func attach(_ dispatcher: GeckoEventDispatcher?) {
        gecko = dispatcher
    }

    func dispatch(toSwift type: String, message: Any?, callback: EventCallback?) {
        let message = message as! [String: Any?]?
        if let eventListeners = listeners[type] {
            for listener in eventListeners {
                listener.handleMessage(type: type, message: message, callback: callback)
            }
        }
    }

    func activate() {
        // Drain the queue, then clear it out so future messages are dispatched
        // directly.
        if let queue = self.queue {
            self.queue = nil
            for event in queue {
                gecko?.dispatch(toGecko: event.type, message: event.message, callback: event.callback)
            }
        }
    }

    func hasListener(_ type: String) -> Bool {
        listeners.keys.contains(type)
    }
}
