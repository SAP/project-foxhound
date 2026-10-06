/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

package org.mozilla.gecko.media;

import android.os.Parcel;
import android.os.Parcelable;
import java.io.IOException;
import java.nio.ByteBuffer;
import org.mozilla.gecko.annotation.WrapForJNI;
import org.mozilla.gecko.mozglue.SharedMemory;

public final class SampleBuffer implements Parcelable {
  private SharedMemory mSharedMem;

  /* package */
  public SampleBuffer(final SharedMemory sharedMem) {
    mSharedMem = sharedMem;
  }

  protected SampleBuffer(final Parcel in) {
    mSharedMem = in.readParcelable(SampleBuffer.class.getClassLoader());
  }

  @Override
  public void writeToParcel(final Parcel dest, final int flags) {
    dest.writeParcelable(mSharedMem, flags);
  }

  @Override
  public int describeContents() {
    return 0;
  }

  public static final Creator<SampleBuffer> CREATOR =
      new Creator<SampleBuffer>() {
        @Override
        public SampleBuffer createFromParcel(final Parcel in) {
          return new SampleBuffer(in);
        }

        @Override
        public SampleBuffer[] newArray(final int size) {
          return new SampleBuffer[size];
        }
      };

  public int capacity() {
    return mSharedMem != null ? mSharedMem.getSize() : 0;
  }

  private void checkBounds(
      final int offset, final int size, final int inCapacity, final int outCapacity)
      throws IOException {
    if (mSharedMem == null || !mSharedMem.isValid()) {
      throw new IOException("Invalid state.");
    }
    if (offset < 0 || size < 0) {
      throw new IOException("Illegal source offset/size");
    }
    final long inEnd = (long) offset + size;
    if (inEnd > inCapacity || size > outCapacity) {
      throw new IOException("Out-of-bound: buffer too small.");
    }
  }

  public void readFromByteBuffer(final ByteBuffer src, final int offset, final int size)
      throws IOException {
    if (!src.isDirect()) {
      throw new IOException("SharedMemBuffer only support reading from direct byte buffer.");
    }
    checkBounds(offset, size, src.capacity(), capacity());
    try {
      nativeReadFromDirectBuffer(src, mSharedMem.getPointer(), offset, size);
      mSharedMem.flush();
    } catch (final NullPointerException e) {
      throw new IOException(e);
    }
  }

  private static native void nativeReadFromDirectBuffer(
      ByteBuffer src, long dest, int offset, int size);

  @WrapForJNI
  public void writeToByteBuffer(final ByteBuffer dest, final int offset, final int size)
      throws IOException {
    if (!dest.isDirect()) {
      throw new IOException("SharedMemBuffer only support writing to direct byte buffer.");
    }
    checkBounds(offset, size, capacity(), dest.capacity());
    try {
      nativeWriteToDirectBuffer(mSharedMem.getPointer(), dest, offset, size);
    } catch (final NullPointerException e) {
      throw new IOException(e);
    }
  }

  private static native void nativeWriteToDirectBuffer(
      long src, ByteBuffer dest, int offset, int size);

  @WrapForJNI(exceptionMode = "nsresult")
  public void nativeCopy(final long dest, final int destCapacity, final int offset, final int size)
      throws IOException {
    if (dest == 0) {
      throw new IOException("Null destination pointer.");
    }
    checkBounds(offset, size, capacity(), destCapacity);
    try {
      final long src = mSharedMem.getPointer();
      if (src == 0) {
        throw new IOException("Shared memory not mapped.");
      }
      nativeMemcpy(dest, src + offset, size);
    } catch (final NullPointerException e) {
      throw new IOException(e);
    }
  }

  private static native void nativeMemcpy(long dest, long src, int size);

  public void dispose() {
    if (mSharedMem != null) {
      mSharedMem.dispose();
      mSharedMem = null;
    }
  }

  @WrapForJNI
  public boolean isValid() {
    return mSharedMem != null;
  }

  @Override
  public String toString() {
    return "Buffer: " + mSharedMem;
  }
}
