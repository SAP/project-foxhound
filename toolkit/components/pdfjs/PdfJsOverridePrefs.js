/* Copyright 2024 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#if defined(ANDROID)

  // Editing PDFs is not supported on mobile
  pref("pdfjs.annotationEditorMode", -1);

  pref("pdfjs.capCanvasAreaFactor", 100);

#else

  pref("pdfjs.enableUpdatedAddImage", true);
  pref("pdfjs.enableSignatureEditor", true);
  pref("pdfjs.enableComment", true);
  pref("pdfjs.enableHighlightFloatingButton", true);

  pref("pdfjs.enableAltTextForEnglish", false);
  pref("pdfjs.enableAltText", true);
  pref("pdfjs.enableAltTextModelDownload", false);
  pref("pdfjs.enableGuessAltText", false);

  pref("pdfjs.enableHWA", true);

#endif
