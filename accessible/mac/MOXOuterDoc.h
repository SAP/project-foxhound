/* -*- Mode: Objective-C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset:
 * 2 -*- */
/* vim:expandtab:shiftwidth=2:tabstop=2:
 */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

#ifndef ACCESSIBLE_MAC_MOXOUTERDOC_H_
#define ACCESSIBLE_MAC_MOXOUTERDOC_H_

#import "mozAccessible.h"

@interface MOXOuterDoc : mozAccessible

// overrides
- (NSString*)moxContents;

@end

#endif  // ACCESSIBLE_MAC_MOXOUTERDOC_H_
