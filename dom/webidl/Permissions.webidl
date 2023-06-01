/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://w3c.github.io/permissions/#permissions-interface
 */

enum PermissionName {
  "geolocation",
  "notifications",
  "push",
  "persistent-storage",
  "midi"
};

[GenerateInit]
dictionary PermissionDescriptor {
  required PermissionName name;
};

[GenerateInit]
dictionary MidiPermissionDescriptor : PermissionDescriptor {
  boolean sysex;
};

// We don't implement `PushPermissionDescriptor` because we use a background
// message quota instead of `userVisibleOnly`.

[Exposed=Window]
interface Permissions {
  [NewObject]
  Promise<PermissionStatus> query(object permission);
  [NewObject, Pref="dom.permissions.revoke.enable"]
  Promise<PermissionStatus> revoke(object permission);
};
