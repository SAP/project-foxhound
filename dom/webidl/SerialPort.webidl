/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * The origin of this IDL file is
 * https://wicg.github.io/serial/
 */

enum ParityType {
  "none",
  "even",
  "odd"
};

enum FlowControlType {
  "none",
  "hardware"
};

dictionary SerialOptions {
  required [EnforceRange] unsigned long baudRate;
  [EnforceRange] octet dataBits = 8;
  [EnforceRange] octet stopBits = 1;
  ParityType parity = "none";
  [EnforceRange] unsigned long bufferSize = 255;
  FlowControlType flowControl = "none";
};

dictionary SerialOutputSignals {
  boolean dataTerminalReady;
  boolean requestToSend;
  boolean break;
};

dictionary SerialInputSignals {
  required boolean dataCarrierDetect;
  required boolean clearToSend;
  required boolean ringIndicator;
  required boolean dataSetReady;
};

dictionary SerialPortInfo {
  unsigned short usbVendorId;
  unsigned short usbProductId;
  BluetoothServiceUUID bluetoothServiceClassId;
};

[SecureContext, Pref="dom.webserial.enabled",
 Exposed=(Window,DedicatedWorker)]
interface SerialPort : EventTarget {
  attribute EventHandler onconnect;
  attribute EventHandler ondisconnect;
  readonly attribute boolean connected;
  readonly attribute ReadableStream? readable;
  readonly attribute WritableStream? writable;

  [Throws] SerialPortInfo getInfo();
  [UseCounter, Throws] Promise<undefined> open(SerialOptions options);
  [Throws] Promise<undefined> setSignals(optional SerialOutputSignals signals = {});
  [Throws] Promise<SerialInputSignals> getSignals();
  [Throws] Promise<undefined> close();
  [Throws] Promise<undefined> forget();
};
