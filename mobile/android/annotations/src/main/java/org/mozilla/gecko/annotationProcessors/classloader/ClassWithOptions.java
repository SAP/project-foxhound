/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.annotationProcessors.classloader;

import org.mozilla.gecko.annotationProcessors.utils.GeneratableElementIterator;

/** Wrapper class holding a Class and associated generation options. */
public class ClassWithOptions {
  /** The wrapped class. */
  public final Class<?> wrappedClass;

  /** The generated name for this class. */
  public final String generatedName;

  /** The ifdef condition for conditional compilation. */
  public final String ifdef;

  /**
   * Constructor for ClassWithOptions.
   *
   * @param someClass The class to wrap
   * @param name The generated name for this class
   * @param ifdef The ifdef condition for conditional compilation
   */
  public ClassWithOptions(Class<?> someClass, String name, String ifdef) {
    wrappedClass = someClass;
    generatedName = name;
    this.ifdef = ifdef;
  }

  /**
   * Checks if this class has any generated content.
   *
   * @return true if this class or its inner classes have generated content
   */
  public boolean hasGenerated() {
    final GeneratableElementIterator methodIterator = new GeneratableElementIterator(this);

    if (methodIterator.hasNext()) {
      return true;
    }

    final ClassWithOptions[] innerClasses = methodIterator.getInnerClasses();
    for (ClassWithOptions innerClass : innerClasses) {
      if (innerClass.hasGenerated()) {
        return true;
      }
    }

    return false;
  }
}
