/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.annotationProcessors;

/** Object holding annotation data. Used by GeneratableElementIterator. */
public class AnnotationInfo {
  /** Exception handling mode definitions. */
  public enum ExceptionMode {
    /** Abort on exception. */
    ABORT,
    /** Return NSRESULT on exception. */
    NSRESULT,
    /** Ignore exceptions. */
    IGNORE;

    String nativeValue() {
      return "mozilla::jni::ExceptionMode::" + name();
    }
  }

  /** Calling thread definitions. */
  public enum CallingThread {
    /** Gecko thread. */
    GECKO,
    /** UI thread. */
    UI,
    /** Any thread. */
    ANY;

    String nativeValue() {
      return "mozilla::jni::CallingThread::" + name();
    }
  }

  /** Dispatch target definitions. */
  public enum DispatchTarget {
    /** Gecko thread dispatch. */
    GECKO,
    /** Gecko thread priority dispatch. */
    GECKO_PRIORITY,
    /** Proxy dispatch. */
    PROXY,
    /** Current thread dispatch. */
    CURRENT;

    String nativeValue() {
      return "mozilla::jni::DispatchTarget::" + name();
    }
  }

  /** The wrapper name for this annotation. */
  public final String wrapperName;

  /** The exception handling mode for this annotation. */
  public final ExceptionMode exceptionMode;

  /** The calling thread for this annotation. */
  public final CallingThread callingThread;

  /** The dispatch target for this annotation. */
  public final DispatchTarget dispatchTarget;

  /** Whether to disable literal mode for this annotation. */
  public final boolean noLiteral;

  /**
   * Constructor for AnnotationInfo.
   *
   * @param wrapperName The wrapper name for this annotation
   * @param exceptionMode The exception handling mode
   * @param callingThread The calling thread
   * @param dispatchTarget The dispatch target
   * @param noLiteral Whether to disable literal mode
   */
  public AnnotationInfo(
      String wrapperName,
      ExceptionMode exceptionMode,
      CallingThread callingThread,
      DispatchTarget dispatchTarget,
      boolean noLiteral) {

    this.wrapperName = wrapperName;
    this.exceptionMode = exceptionMode;
    this.callingThread = callingThread;
    this.dispatchTarget = dispatchTarget;
    this.noLiteral = noLiteral;
  }
}
