/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://wicg.github.io/serial/
 */

typedef (DOMString or unsigned long) BluetoothServiceUUID;

dictionary SerialPortRequestOptions {
  sequence<SerialPortFilter> filters;
  sequence<BluetoothServiceUUID> allowedBluetoothServiceClassIds;
};

dictionary SerialPortFilter {
  unsigned short usbVendorId;
  unsigned short usbProductId;
  BluetoothServiceUUID bluetoothServiceClassId;
};

[SecureContext, Pref="dom.webserial.enabled",
 Exposed=(Window,DedicatedWorker)]
interface Serial : EventTarget {
  attribute EventHandler onconnect;
  attribute EventHandler ondisconnect;
  [UseCounter, Throws] Promise<sequence<SerialPort>> getPorts();
  [UseCounter, Exposed=Window, Throws] Promise<SerialPort> requestPort(optional SerialPortRequestOptions options = {});

  [Pref="dom.webserial.testing.enabled", Throws]
  Promise<undefined> simulateDeviceConnection(DOMString deviceId, DOMString devicePath,
                                              optional unsigned short vendorId = 0,
                                              optional unsigned short productId = 0);

  [Pref="dom.webserial.testing.enabled", Throws]
  Promise<undefined> simulateDeviceDisconnection(DOMString deviceId);

  [Pref="dom.webserial.testing.enabled", Throws]
  Promise<undefined> removeAllMockDevices();

  [Pref="dom.webserial.testing.enabled", Throws]
  Promise<undefined> resetToDefaultMockDevices();

  [Pref="dom.webserial.testing.enabled", Throws]
  attribute boolean autoselectPorts;
};
