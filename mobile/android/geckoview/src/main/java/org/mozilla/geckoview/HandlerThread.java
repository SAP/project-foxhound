/* -*- Mode: Java; c-basic-offset: 2; tab-width: 20; indent-tabs-mode: nil; -*-
 * vim: ts=2 sw=2 expandtab:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.geckoview;

import static java.lang.annotation.ElementType.CONSTRUCTOR;
import static java.lang.annotation.ElementType.METHOD;
import static java.lang.annotation.ElementType.PARAMETER;
import static java.lang.annotation.ElementType.TYPE;
import static java.lang.annotation.RetentionPolicy.CLASS;

import java.lang.annotation.Documented;
import java.lang.annotation.Retention;
import java.lang.annotation.Target;

/**
 * Indicates that the launching thread must have an Android {@link android.os.Handler} to execute
 * due to the {@link GeckoResult}.
 *
 * <p>If called from a thread without the required Handler, the code will throw {@link
 * IllegalThreadStateException} with message "Must have a Handler".
 *
 * @see GeckoResult
 */
@Documented
@Retention(CLASS)
@Target({METHOD, CONSTRUCTOR, TYPE, PARAMETER})
public @interface HandlerThread {}
