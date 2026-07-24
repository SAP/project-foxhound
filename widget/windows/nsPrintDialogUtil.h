/* -*- Mode: C++; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
#ifndef nsFlyOwnDialog_h_
#define nsFlyOwnDialog_h_

nsresult NativeShowPrintDialog(HWND aHWnd, bool aHaveSelection,
                               nsIPrintSettings* aPrintSettings);

#endif /* nsFlyOwnDialog_h_ */
