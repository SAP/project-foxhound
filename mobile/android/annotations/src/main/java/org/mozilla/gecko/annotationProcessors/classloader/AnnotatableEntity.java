/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.annotationProcessors.classloader;

import java.lang.reflect.Constructor;
import java.lang.reflect.Field;
import java.lang.reflect.Member;
import java.lang.reflect.Method;
import java.lang.reflect.Modifier;
import org.mozilla.gecko.annotationProcessors.AnnotationInfo;

/**
 * Union type to hold either a method, field, or ctor. Allows us to iterate "The generatable stuff",
 * despite the fact that such things can be of either flavour.
 */
public class AnnotatableEntity {
  /** Entity type definitions. */
  public enum ENTITY_TYPE {
    /** Method entity type. */
    METHOD,
    /** Native method entity type. */
    NATIVE,
    /** Field entity type. */
    FIELD,
    /** Constructor entity type. */
    CONSTRUCTOR
  }

  private final Member mMember;

  /** The type of entity this represents. */
  public final ENTITY_TYPE mEntityType;

  /** The annotation information for this entity. */
  public final AnnotationInfo mAnnotationInfo;

  /**
   * Constructor for AnnotatableEntity.
   *
   * @param aObject The member object (method, field, or constructor)
   * @param aAnnotationInfo The annotation information for this entity
   */
  public AnnotatableEntity(Member aObject, AnnotationInfo aAnnotationInfo) {
    mMember = aObject;
    mAnnotationInfo = aAnnotationInfo;

    if (aObject instanceof Method) {
      if (Modifier.isNative(aObject.getModifiers())) {
        mEntityType = ENTITY_TYPE.NATIVE;
      } else {
        mEntityType = ENTITY_TYPE.METHOD;
      }
    } else if (aObject instanceof Field) {
      mEntityType = ENTITY_TYPE.FIELD;
    } else {
      mEntityType = ENTITY_TYPE.CONSTRUCTOR;
    }
  }

  /**
   * Gets the method if this entity is a method or native method.
   *
   * @return The method
   * @throws UnsupportedOperationException if this entity is not a method
   */
  public Method getMethod() {
    if (mEntityType != ENTITY_TYPE.METHOD && mEntityType != ENTITY_TYPE.NATIVE) {
      throw new UnsupportedOperationException("Attempt to cast to unsupported member type.");
    }
    return (Method) mMember;
  }

  /**
   * Gets the field if this entity is a field.
   *
   * @return The field
   * @throws UnsupportedOperationException if this entity is not a field
   */
  public Field getField() {
    if (mEntityType != ENTITY_TYPE.FIELD) {
      throw new UnsupportedOperationException("Attempt to cast to unsupported member type.");
    }
    return (Field) mMember;
  }

  /**
   * Gets the constructor if this entity is a constructor.
   *
   * @return The constructor
   * @throws UnsupportedOperationException if this entity is not a constructor
   */
  public Constructor<?> getConstructor() {
    if (mEntityType != ENTITY_TYPE.CONSTRUCTOR) {
      throw new UnsupportedOperationException("Attempt to cast to unsupported member type.");
    }
    return (Constructor<?>) mMember;
  }
}
