/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

#include "mozilla/IceServerParser.h"

#include "nsFmtString.h"
#include "nsIURI.h"
#include "nsNetUtil.h"

namespace mozilla {

Result<IceServerParser::StunTurnUri, ErrorResult>
IceServerParser::ParseStunTurnUri(const nsACString& aUri) {
  if (aUri.IsEmpty()) {
    ErrorResult rv;
    rv.ThrowSyntaxError("ICE server URL is empty");
    return Err(std::move(rv));
  }

  // Let parsedURL be the result of parsing url.
  nsCOMPtr<nsIURI> parsedURL;
  nsresult nrv = NS_NewURI(getter_AddRefs(parsedURL), aUri);
  // If any of the following conditions apply,
  // then throw a "SyntaxError" DOMException:
  // - parsedURL is failure
  if (NS_FAILED(nrv)) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString("'{}' is not a valid URI", aUri));
    return Err(std::move(rv));
  }

  // - parsedURL's scheme is neither "stun", "stuns", "turn", nor "turns"
  // NS_NewURI lowercases the scheme for us.
  nsAutoCString scheme;
  (void)parsedURL->GetScheme(scheme);

  StunTurnScheme stunScheme;
  if (scheme.EqualsLiteral("stun")) {
    stunScheme = StunTurnScheme::Stun;
  } else if (scheme.EqualsLiteral("stuns")) {
    stunScheme = StunTurnScheme::Stuns;
  } else if (scheme.EqualsLiteral("turn")) {
    stunScheme = StunTurnScheme::Turn;
  } else if (scheme.EqualsLiteral("turns")) {
    stunScheme = StunTurnScheme::Turns;
  } else {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString(
        "'{}' has unsupported scheme '{}' (must be stun/stuns/turn/turns)",
        aUri, scheme));
    return Err(std::move(rv));
  }

  // - parsedURL does not have an opaque path
  // DefaultURI gives us the opaque path via GetFilePath() (everything
  // after "scheme:" and before "?" or "#").
  nsAutoCString hostPort;
  (void)parsedURL->GetFilePath(hostPort);

  if (hostPort.IsEmpty()) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString("'{}' must have a host", aUri));
    return Err(std::move(rv));
  }

  // - parsedURL's opaque path contains one or more "/" or "@"
  // Note: We use a more specific error string for "//"
  if (StringBeginsWith(hostPort, "//"_ns)) {
    ErrorResult rv;
    rv.ThrowSyntaxError(
        nsFmtCString("'{}' must not use '//' authority syntax", aUri));
    return Err(std::move(rv));
  }

  if (hostPort.FindChar('/') >= 0) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString("'{}' must not contain /", aUri));
    return Err(std::move(rv));
  }

  if (hostPort.FindChar('@') >= 0) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString("'{}' must not contain @", aUri));
    return Err(std::move(rv));
  }

  // - parsedURL's fragment is non-null
  nsAutoCString ref;
  (void)parsedURL->GetRef(ref);
  if (!ref.IsEmpty()) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString("'{}' must not contain a fragment", aUri));
    return Err(std::move(rv));
  }

  // - parsedURL's scheme is "stun" or "stuns", and parsedURL's query is
  // non-null
  bool isStun =
      stunScheme == StunTurnScheme::Stun || stunScheme == StunTurnScheme::Stuns;
  nsAutoCString query;
  (void)parsedURL->GetQuery(query);

  if (isStun && !query.IsEmpty()) {
    ErrorResult rv;
    rv.ThrowSyntaxError(
        nsFmtCString("'{}': STUN URLs must not have query parameters", aUri));
    return Err(std::move(rv));
  }

  // If parsedURL's scheme is not implemented by the user agent, throw a
  // "NotSupportedError" DOMException.
  if (stunScheme == StunTurnScheme::Stuns) {
    ErrorResult rv;
    rv.ThrowNotSupportedError(
        nsFmtCString("'{}': stuns scheme is not supported", aUri));
    return Err(std::move(rv));
  }

  // Let hostAndPortURL be result of parsing the concatenation of "https://" and
  // parsedURL's path.
  nsCOMPtr<nsIURI> hostAndPortURL;
  nrv = NS_NewURI(getter_AddRefs(hostAndPortURL),
                  nsFmtCString("https://{}", hostPort));
  // If hostAndPortURL is failure, then throw a "SyntaxError" DOMException.
  if (NS_FAILED(nrv)) {
    ErrorResult rv;
    rv.ThrowSyntaxError(
        nsFmtCString("'{}' does not contain a host and optional port", aUri));
    return Err(std::move(rv));
  }

  // If hostAndPortURL's path, username, or password is non-null, then throw a
  // "SyntaxError" DOMException.
  nsAutoCString path;
  (void)hostAndPortURL->GetFilePath(path);
  // GetFilePath is a little squirrely:
  // - Returns "/" if there's no path, or if the path is "/"
  // - Returns "/" if the path is "\" (looks exactly like no path!)
  // - Returns "/path" if the path was "/path" or "\path"
  // This means that catching something like "stun:example.com\" is either going
  // to require some other API, or scanning for "\".
  // The scan for '/' above catches "stun:example.com/"
  if ((!path.IsEmpty() && !path.EqualsLiteral("/")) ||
      hostPort.FindChar('\\') >= 0) {
    ErrorResult rv;
    rv.ThrowSyntaxError(
        nsFmtCString("'{}' must not contain a path ({})", aUri, path));
    return Err(std::move(rv));
  }

  nsAutoCString userPass;
  (void)hostAndPortURL->GetUserPass(userPass);
  if (!userPass.IsEmpty()) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString(
        "'{}' must not contain a username or password ({})", aUri, userPass));
    return Err(std::move(rv));
  }

  // If parsedURL's query is non-null and if parsedURL's query is different from
  // either "transport=udp" or "transport=tcp", throw a "SyntaxError"
  // DOMException.
  IceTransport transport;
  bool isTls = stunScheme == StunTurnScheme::Stuns ||
               stunScheme == StunTurnScheme::Turns;
  if (!query.IsEmpty()) {
    if (!StringBeginsWith(query, "transport="_ns)) {
      ErrorResult rv;
      rv.ThrowSyntaxError(nsFmtCString(
          "'{}' has invalid query (must be ?transport=udp or ?transport=tcp)",
          aUri));
      return Err(std::move(rv));
    }
    nsAutoCString transportStr(Substring(query, 10));
    if (transportStr.EqualsLiteral("udp")) {
      transport = IceTransport::Udp;
    } else if (transportStr.EqualsLiteral("tcp")) {
      transport = IceTransport::Tcp;
    } else {
      ErrorResult rv;
      rv.ThrowSyntaxError(nsFmtCString(
          "'{}' has disallowed transport '{}' (must be udp or tcp)", aUri,
          transportStr));
      return Err(std::move(rv));
    }
  } else {
    // Default: stun/turn -> Udp, stuns/turns -> Tcp (RFC 7064/7065)
    transport = isTls ? IceTransport::Tcp : IceTransport::Udp;
  }

  // Parse host and port from the host:port string.
  const uint16_t defaultPort = isTls ? 5349 : 3478;

  nsAutoCString host;
  (void)hostAndPortURL->GetHost(host);
  if (host.IsEmpty()) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString("'{}' has empty host", aUri));
    return Err(std::move(rv));
  }

  int32_t port;
  nrv = hostAndPortURL->GetPort(&port);
  if (NS_FAILED(nrv)) {
    ErrorResult rv;
    rv.ThrowSyntaxError(nsFmtCString("'{}' has an invalid port", aUri));
    return Err(std::move(rv));
  }

  // nsIURI.idl says "A port value of -1 corresponds to the protocol's default
  // port"
  if (port == -1) {
    // Workaround: The URL parser gives us -1 if the port is 443.
    auto idx = hostPort.RFind(":443");
    if (idx != kNotFound && (hostPort.Length() - idx == 4)) {
      port = 443;
    } else {
      port = defaultPort;
    }
  }

  // Parsing out hostAndPortUrl seems to catch this, but the type it uses is
  // inconsistent with valid port numbers, so we do belt-and-suspenders here.
  if (port < 0 || port > std::numeric_limits<uint16_t>::max()) {
    ErrorResult rv;
    rv.ThrowSyntaxError(
        nsFmtCString("'{}' has a port that is too small or large", aUri));
    return Err(std::move(rv));
  }

  StunTurnUri result;
  result.mScheme = stunScheme;
  result.mHost = std::move(host);
  result.mPort = port;
  result.mTransport = transport;
  return result;
}

// Known acceptable ports for webrtc
constexpr uint16_t gGoodWebrtcPortList[] = {
    53,    // Some deployments use DNS port to punch through overzealous NATs
    3478,  // stun or turn
    5349,  // stuns or turns
};

static bool IsPortAllowed(uint16_t aPort) {
  for (const auto port : gGoodWebrtcPortList) {
    if (aPort == port) {
      return true;
    }
  }
  return NS_SUCCEEDED(NS_CheckPortSafety(aPort, nullptr));
}

Result<nsTArray<IceServerParser::ParsedIceServer>, ErrorResult>
IceServerParser::Parse(const nsTArray<dom::RTCIceServer>& aIceServers) {
  nsTArray<ParsedIceServer> entries;

  for (const auto& server : aIceServers) {
    if (!server.mUrls.WasPassed()) {
      continue;
    }

    // - Let urls be server.urls.
    // - If urls is a string, set urls to a list consisting of just that string.
    nsTArray<nsString> urls;
    const auto& urlsUnion = server.mUrls.Value();
    if (urlsUnion.IsString()) {
      urls.AppendElement(urlsUnion.GetAsString());
    } else {
      urls.AppendElements(urlsUnion.GetAsStringSequence());
    }

    // - If urls is empty, throw a "SyntaxError" DOMException.
    if (urls.IsEmpty()) {
      ErrorResult rv;
      rv.ThrowSyntaxError("ICE server has empty urls list");
      return Err(std::move(rv));
    }

    // - For each url in urls, run the validate an ICE server URL algorithm on
    // url.
    for (const auto& url : urls) {
      NS_ConvertUTF16toUTF8 utf8Url(url);
      auto parseResult = ParseStunTurnUri(utf8Url);
      if (parseResult.isErr()) {
        return Err(parseResult.unwrapErr());
      }

      StunTurnUri uri = parseResult.unwrap();

      // This isn't in the spec. Maybe it should be.
      if (!IsPortAllowed(uri.mPort)) {
        ErrorResult rv;
        rv.ThrowSyntaxError(
            nsFmtCString("'{}' uses a port that is blocked", utf8Url));
        return Err(std::move(rv));
      }

      // Spec says to check this as we check each url. We could set a flag to
      // avoid checking multiple times.
      // - If parsedURL's' scheme is "turn" or "turns", and either of
      // server.username or server.credential are missing or their UTF-8
      // representations fail to conform to [RFC8489] section 14.3 and [RFC8265]
      // section 4.1 respectively, then throw an InvalidAccessError.
      if (uri.IsTurn()) {
        if (!server.mUsername.WasPassed()) {
          ErrorResult rv;
          rv.ThrowInvalidAccessError("TURN server requires a username");
          return Err(std::move(rv));
        }
        if (!server.mCredential.WasPassed()) {
          ErrorResult rv;
          rv.ThrowInvalidAccessError("TURN server requires a credential");
          return Err(std::move(rv));
        }
        NS_ConvertUTF16toUTF8 utf8Username(server.mUsername.Value());
        if (utf8Username.Length() > 509) {
          ErrorResult rv;
          rv.ThrowInvalidAccessError(
              "TURN server username exceeds 509 byte limit (RFC 8489 14.3)");
          return Err(std::move(rv));
        }
        NS_ConvertUTF16toUTF8 utf8Credential(server.mCredential.Value());
        if (utf8Credential.Length() == 0) {
          ErrorResult rv;
          rv.ThrowInvalidAccessError(
              "TURN server credential is empty (RFC 8265 4.1)");
          return Err(std::move(rv));
        }
      }

      // This flattens RTCIceServers; each url gets its own entry, with
      // username/credential if they exist.
      ParsedIceServer entry;
      entry.mUri = std::move(uri);
      if (server.mUsername.WasPassed()) {
        entry.mUsername = NS_ConvertUTF16toUTF8(server.mUsername.Value());
      }
      if (server.mCredential.WasPassed()) {
        entry.mPassword = NS_ConvertUTF16toUTF8(server.mCredential.Value());
      }
      entries.AppendElement(std::move(entry));
    }
  }

  return entries;
}

}  // namespace mozilla
