// This Source Code Form is subject to the terms of the Mozilla Public
// License, v. 2.0. If a copy of the MPL was not distributed with this
// file, You can obtain one at http://mozilla.org/MPL/2.0/.

public struct ContentPermission {
    public enum Permission: String {
        /// Permission for using the geolocation API. See:
        /// https://developer.mozilla.org/en-US/docs/Web/API/Geolocation
        case geolocation = "geolocation"

        /// Permission for using the notifications API. See:
        /// https://developer.mozilla.org/en-US/docs/Web/API/notification
        case desktopNotification = "desktop-notification"

        /// Permission for using the storage API. See:
        /// https://developer.mozilla.org/en-US/docs/Web/API/Storage_API
        case persistentStorage = "persistent-storage"

        /// Permission for using the WebXR API. See: https://www.w3.org/TR/webxr
        case webxr = "xr"

        /// Permission for allowing autoplay of inaudible (silent) video.
        case autoplayInaudible = "autoplay-media-inaudible"

        /// Permission for allowing autoplay of audible video.
        case autoplayAudible = "autoplay-media-audible"

        /// Permission for accessing system media keys used to decode DRM media.
        case mediaKeySystemAccess = "media-key-system-access"

        /// Permission for trackers to operate on the page -- disables all
        /// tracking protection features for a given site.
        case tracking = "trackingprotection"

        /// Permission for third party frames to access first party cookies. May
        /// be granted heuristically in some cases.
        case storageAccess = "storage-access"
    }

    public enum Value: Int32 {
        /// The corresponding permission is currently set to default/prompt behavior.
        case prompt = 3
        /// The corresponding permission is currently set to deny.
        case deny = 2
        /// The corresponding permission is currently set to allow.
        case allow = 1
    }

    /// The URI associated with this content permission.
    public let uri: String

    /// The third party origin associated with the request; currently only used for storage access
    /// permission.
    public let thirdPartyOrigin: String?

    /// A boolean indicating whether this content permission is associated with private browsing.
    public let privateMode: Bool

    /// The type of this permission.
    public let permission: Permission?

    /// The value of the permission.
    public let value: Value

    /// The context ID associated with the permission if any.
    public let contextId: String?

    let principal: String?

    static func fromDictionary(_ dict: [String: Any?]) -> ContentPermission {
        let rawPerm = dict["perm"] as! String

        var permission: Permission? = Permission(rawValue: rawPerm)
        var thirdPartyOrigin = dict["thirdPartyOrigin"] as? String

        // NOTE: This weirdness with how permissions are parsed comes from the JS code,
        // and could be cleaned up in both Java and Swift if we change how the JS code
        // sends permissions.
        if rawPerm.starts(with: "3rdPartyStorage^") {
            thirdPartyOrigin = String(rawPerm.dropFirst(16))
            permission = .storageAccess
        } else if rawPerm.starts(with: "3rdPartyFrameStorage^") {
            thirdPartyOrigin = String(rawPerm.dropFirst(21))
            permission = .storageAccess
        } else if rawPerm == "trackingprotection-pb" {
            permission = .tracking
        }

        return ContentPermission(
            uri: dict["uri"] as! String,
            thirdPartyOrigin: thirdPartyOrigin,
            privateMode: dict["privateMode"] as! Bool,
            permission: permission,
            value: Value(rawValue: dict["value"] as! Int32)!,
            // FIXME: Handle ContextID
            contextId: nil,
            principal: dict["principal"] as? String)
    }
}

public struct MediaSource {
    public enum Source {
        case camera, screen, microphone, audiocapture, other
    }

    public enum MediaType {
        case video, audio
    }

    /// A string giving a unique source identifier.
    public let id: String

    /// A string giving the name of the video source from the system (for example, "Camera 0,
    /// Facing back, Orientation 90"). May be empty.
    public let name: String?

    public let source: Source

    public let type: MediaType

    static func fromDictionary(_ dict: [String: Any?]) -> MediaSource {
        func parseSource(_ source: String) -> Source {
            switch source {
            case "camera":
                return .camera
            case "screen":
                return .screen
            case "window":
                return .screen
            case "browser":
                return .screen
            case "microphone":
                return .microphone
            case "audioCapture":
                return .audiocapture
            default:
                return .other
            }
        }

        func parseType(_ type: String) -> MediaType {
            switch type {
            case "videoinput":
                return .video
            case "audioinput":
                return .audio
            default:
                fatalError("String: " + type + " is not a valid media type string")
            }
        }
        return MediaSource(
            id: dict["id"] as! String,
            name: dict["name"] as? String,
            source: parseSource(dict["source"] as! String),
            type: parseType(dict["type"] as! String))
    }
}

public struct SelectedMediaSources {
    public let video: MediaSource? = nil
    public let audio: MediaSource? = nil
}

public protocol PermissionDelegate {
    /// Request content permission.
    ///
    /// Note, that in the case of `persistentStorage`, once permission has
    /// been granted for a site, it cannot be revoked. If the permission has
    /// previously been granted, it is the responsibility of the consuming app
    /// to remember the permission and prevent the prompt from being redisplayed
    /// to the user.
    func onContentPermissionRequest(session: GeckoSession, perm: ContentPermission) async
        -> ContentPermission.Value

    /// Request content media permissions, including request for which video
    /// and/or audio source to use.
    ///
    /// Media permissions will still be requested if the associated device
    /// permissions have been denied if there are video or audio sources in that
    /// category that can still be accessed. It is the responsibility of
    /// consumers to ensure that media permission requests are not displayed in
    /// this case.
    func onMediaPermissionRequest(
        session: GeckoSession, uri: String, video: [MediaSource]?, audio: [MediaSource]?
    ) async -> SelectedMediaSources?
}

enum PermissionEvents: String, CaseIterable {
    // FIXME: Figure out iOS equivalent to androidPermission msg
    // case androidPermission = "GeckoView:AndroidPermission"
    case contentPermission = "GeckoView:ContentPermission"
    case mediaPermission = "GeckoView:MediaPermission"
}

func newPermissionHandler(_ session: GeckoSession) -> GeckoSessionHandler<
    PermissionDelegate, PermissionEvents
> {
    GeckoSessionHandler(moduleName: "GeckoViewPermission", session: session) {
        @MainActor session, delegate, event, message in
        switch event {
        case .contentPermission:
            let result = await delegate?.onContentPermissionRequest(
                session: session, perm: ContentPermission.fromDictionary(message!))
            return (result ?? .prompt).rawValue

        case .mediaPermission:
            let videoDicts = message!["video"] as? [[String: Any?]]
            let audioDicts = message!["audio"] as? [[String: Any?]]
            let result = await delegate?.onMediaPermissionRequest(
                session: session,
                uri: message!["uri"] as! String,
                video: videoDicts?.map(MediaSource.fromDictionary),
                audio: audioDicts?.map(MediaSource.fromDictionary))
            if result != nil {
                return ["video": result?.video?.id, "audio": result?.video?.id]
            } else {
                // NOTE: This appears to match the behaviour of GeckoView-android, but is strange.
                return false
            }
        }
    }
}
