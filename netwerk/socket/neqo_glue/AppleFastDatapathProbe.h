/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef AppleFastDatapathProbe_h_
#define AppleFastDatapathProbe_h_

namespace mozilla::net {

// Probes for Apple private sendmsg_x/recvmsg_x API availability and, if
// available, enables the fast datapath for all subsequently created QUIC
// sockets in this process. Records the result as a Glean metric.
//
// Called during socket process initialisation (in RecvInit). Safe to call
// multiple times; only the first call performs the probe. On non-Apple
// platforms this is a no-op and returns false.
//
// Returns true if the fast path was successfully enabled.
bool InitAppleFastDatapathProbe();

}  // namespace mozilla::net

#endif  // AppleFastDatapathProbe_h_
