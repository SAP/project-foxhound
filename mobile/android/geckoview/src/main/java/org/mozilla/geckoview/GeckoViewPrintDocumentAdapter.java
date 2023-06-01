/* -*- Mode: Java; c-basic-offset: 4; tab-width: 20; indent-tabs-mode: nil; -*-
 * vim: ts=4 sw=4 expandtab:
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
package org.mozilla.geckoview;

import android.content.Context;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.ParcelFileDescriptor;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintDocumentInfo;
import android.util.Log;
import androidx.annotation.AnyThread;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import java.io.BufferedOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import org.mozilla.gecko.util.ThreadUtils;

public class GeckoViewPrintDocumentAdapter extends PrintDocumentAdapter {
  private static final String LOGTAG = "GVPrintDocumentAdapter";
  private String mPrintName = "Document";
  private File mPdfFile;
  private InputStream mPdfInputStream;
  private Context mContext;
  private Boolean mDoDeleteTmpPdf;

  /**
   * Default GeckoView PrintDocumentAdapter to be used with a PrintManager to print documents using
   * the default Android print functionality. Will make a temporary PDF file from InputStream.
   *
   * @param pdfInputStream an input stream containing a PDF
   * @param context context that should be used for making a temporary file
   */
  public GeckoViewPrintDocumentAdapter(
      @NonNull final InputStream pdfInputStream, @NonNull final Context context) {
    this.mPdfInputStream = pdfInputStream;
    this.mContext = context;
    this.mDoDeleteTmpPdf = true;
  }

  /**
   * Default GeckoView PrintDocumentAdapter to be used with a PrintManager to print documents using
   * the default Android print functionality. Will use existing PDF file for rendering. The filename
   * may be displayed to users.
   *
   * <p>Note: Recommend using other constructor if the PDF file still needs to be created so that
   * the UI reflects progress.
   *
   * @param pdfFile PDF file
   */
  public GeckoViewPrintDocumentAdapter(@NonNull final File pdfFile) {
    this.mPdfFile = pdfFile;
    this.mDoDeleteTmpPdf = false;
    this.mPrintName = mPdfFile.getName();
  }

  /**
   * Writes the PDF InputStream to a file for the PrintDocumentAdapter to use.
   *
   * @param pdfInputStream - InputStream containing a PDF
   * @param context context that should be used for making a temporary file
   * @return temporary PDF file
   */
  @AnyThread
  public static @Nullable File makeTempPdfFile(
      @NonNull final InputStream pdfInputStream, @NonNull final Context context) {
    File file = null;
    try {
      file = File.createTempFile("temp", ".pdf", context.getCacheDir());
    } catch (final IOException ioe) {
      Log.e(LOGTAG, "Could not make a file in the cache dir: ", ioe);
    }
    final int bufferSize = 8192;
    final byte[] buffer = new byte[bufferSize];
    try (final OutputStream out = new BufferedOutputStream(new FileOutputStream(file))) {
      int len;
      while ((len = pdfInputStream.read(buffer)) != -1) {
        out.write(buffer, 0, len);
      }
    } catch (final IOException ioe) {
      Log.e(LOGTAG, "Writing temporary PDF file failed: ", ioe);
    }
    return file;
  }

  @Override
  public void onStart() {
    // Making the PDF file late, if needed, so that the UI reflects that it is preparing
    if (mPdfFile == null && mPdfInputStream != null && mContext != null) {
      this.mPdfFile = makeTempPdfFile(mPdfInputStream, mContext);
      if (mPdfFile != null) {
        this.mPrintName = mPdfFile.getName();
      }
    }
  }

  @Override
  public void onLayout(
      final PrintAttributes oldAttributes,
      final PrintAttributes newAttributes,
      final CancellationSignal cancellationSignal,
      final LayoutResultCallback layoutResultCallback,
      final Bundle bundle) {
    if (cancellationSignal.isCanceled()) {
      layoutResultCallback.onLayoutCancelled();
      return;
    }
    final PrintDocumentInfo pdi =
        new PrintDocumentInfo.Builder(mPrintName)
            .setContentType(PrintDocumentInfo.CONTENT_TYPE_DOCUMENT)
            .build();
    layoutResultCallback.onLayoutFinished(pdi, true);
  }

  @Override
  public void onWrite(
      final PageRange[] pageRanges,
      final ParcelFileDescriptor parcelFileDescriptor,
      final CancellationSignal cancellationSignal,
      final WriteResultCallback writeResultCallback) {
    ThreadUtils.postToBackgroundThread(
        new Runnable() {
          @Override
          public void run() {
            InputStream input = null;
            OutputStream output = null;
            try {
              input = new FileInputStream(mPdfFile);
              output = new FileOutputStream(parcelFileDescriptor.getFileDescriptor());
              final int bufferSize = 8192;
              final byte[] buffer = new byte[bufferSize];
              int bytesRead;
              while ((bytesRead = input.read(buffer)) > 0) {
                output.write(buffer, 0, bytesRead);
              }
              writeResultCallback.onWriteFinished(new PageRange[] {PageRange.ALL_PAGES});
            } catch (final Exception ex) {
              Log.e(LOGTAG, "Could not complete onWrite for printing: ", ex);
              writeResultCallback.onWriteFailed(null);
            } finally {
              try {
                input.close();
                output.close();
              } catch (final Exception ex) {
                Log.e(LOGTAG, "Could not close i/o stream: ", ex);
              }
            }
          }
        });
  }

  @Override
  public void onFinish() {
    // Remove the temporary file when the printing system is finished.
    try {
      if (mPdfFile != null && mDoDeleteTmpPdf) {
        mPdfFile.delete();
      }
    } catch (final NullPointerException npe) {
      // Silence the exception. We only want to delete a real file. We don't
      // care if the file doesn't exist.
    }
  }
}
