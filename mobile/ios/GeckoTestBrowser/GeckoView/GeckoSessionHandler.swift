// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

protocol GeckoSessionHandlerCommon: EventListener {
    var moduleName: String { get }
    var events: [String] { get }
    var enabled: Bool { get }
}

class GeckoSessionHandler<Delegate, Event: CaseIterable & RawRepresentable<String>>:
    GeckoSessionHandlerCommon
{
    let moduleName: String
    let handle: @MainActor (GeckoSession, Delegate?, Event, [String: Any?]?) async throws -> Any?

    private(set) weak var session: GeckoSession?
    private var registeredListeners: Bool = false
    var delegate: Delegate? {
        didSet {
            if let session {
                if !registeredListeners && delegate != nil {
                    for event in events {
                        session.dispatcher.addListener(type: event, listener: self)
                    }
                    registeredListeners = true
                }

                // If session is not open, we will update module state during session opening.
                if !session.isOpen() {
                    return
                }

                let message: [String: Any] = [
                    "module": moduleName,
                    "enabled": delegate != nil,
                ]
                session.dispatcher.dispatch(type: "GeckoView:UpdateModuleState", message: message)
            }
        }
    }

    var events: [String] {
        Event.allCases.map { $0.rawValue }
    }
    var enabled: Bool {
        delegate != nil
    }

    init(
        moduleName: String, session: GeckoSession,
        handle: @escaping @MainActor (GeckoSession, Delegate?, Event, [String: Any?]?) async throws
            ->
            Any?
    ) {
        self.moduleName = moduleName
        self.session = session
        self.handle = handle
    }

    func handleMessage(type: String, message: [String: Any?]?) async throws -> Any? {
        guard let event = Event(rawValue: type) else {
            throw HandlerError("unknown message \(type)")
        }
        guard let session else { throw HandlerError("session has been destroyed") }

        return try await self.handle(session, delegate, event, message)
    }
}
