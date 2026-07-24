/* -*- Mode: IDL; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Portions Copyright 2013 Microsoft Open Technologies, Inc. */

interface WindowProxy;

[Exposed=Window]
interface PointerEvent : MouseEvent
{
  constructor(DOMString type, optional PointerEventInit eventInitDict = {});

  [NeedsCallerType]
  readonly attribute long pointerId;

  [NeedsCallerType]
  readonly attribute double width;
  [NeedsCallerType]
  readonly attribute double height;
  [NeedsCallerType]
  readonly attribute float pressure;
  [NeedsCallerType]
  readonly attribute float tangentialPressure;
  [NeedsCallerType]
  readonly attribute long tiltX;
  [NeedsCallerType]
  readonly attribute long tiltY;
  [NeedsCallerType]
  readonly attribute long twist;
  [NeedsCallerType]
  readonly attribute double altitudeAngle;
  [NeedsCallerType]
  readonly attribute double azimuthAngle;

  [NeedsCallerType]
  readonly attribute DOMString pointerType;
  readonly attribute boolean isPrimary;
  [NeedsCallerType]
  readonly attribute long persistentDeviceId;

  [Func="nsContentUtils::IsSecureContextOrWebExtension"]
  sequence<PointerEvent> getCoalescedEvents();
  sequence<PointerEvent> getPredictedEvents();
};

dictionary PointerEventInit : MouseEventInit
{
  long pointerId = 0;
  double width = 1.0;
  double height = 1.0;
  float pressure = 0;
  float tangentialPressure = 0;
  long tiltX;
  long tiltY;
  long twist = 0;
  double altitudeAngle;
  double azimuthAngle;
  DOMString pointerType = "";
  boolean isPrimary = false;
  long persistentDeviceId = 0;
  sequence<PointerEvent> coalescedEvents = [];
  sequence<PointerEvent> predictedEvents = [];
};
