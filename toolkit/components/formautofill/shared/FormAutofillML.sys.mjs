/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import {
  createEngine,
  FEATURES,
} from "chrome://global/content/ml/EngineProcess.sys.mjs";

const FORM_AUTOFILL_FEATURE_ID = "formfill-classification";
const ML_TASKNAME = "text-classification";

const FormFill_Config = {
  timeoutMS: 2 * 60 * 1000, // 2 minutes
  taskName: ML_TASKNAME,
  featureId: FORM_AUTOFILL_FEATURE_ID,
  engineId: FEATURES[FORM_AUTOFILL_FEATURE_ID].engineId,
  backend: "onnx-native",
  fallbackBackend: "onnx",
  modelId: "mozilla/tinybert-address-autofill",
  modelRevision: "v0.1.0",
  // The dtype will need to be updated as needed.
  dtype: "fp32",
};

export class FormAutofillML {
  #engine;

  async detectFields(fieldDetails) {
    if (!this.#engine || this.#engine.engineStatus == "closed") {
      try {
        this.#engine = await createEngine(FormFill_Config);
      } catch (ex) {
        return;
      }
    }

    for (let fd of fieldDetails) {
      if (fd.fieldName || !fd.mlData) {
        continue;
      }

      const request = {
        args: [fd.mlData],
        options: { pooling: "mean", normalize: true },
      };

      let result = await this.#engine.run(request);
      let fieldName = result[0].label;
      if (fieldName && fieldName != "other") {
        fd.fieldName = fieldName;
      }

      fd.reason = "ml";
    }
  }
}
