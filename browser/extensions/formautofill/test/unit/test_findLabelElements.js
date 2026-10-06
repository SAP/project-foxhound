"use strict";

var { LabelUtils } = ChromeUtils.importESModule(
  "resource://gre/modules/shared/LabelUtils.sys.mjs"
);

const TESTCASES = [
  {
    description: "Input contains in a label element.",
    document: `<form>
                 <label id="labelA"> label type A
                   <input id="typeA" type="text">
                 </label>
               </form>`,
    expectedLabelIds: [["labelA"]],
    expectedText: ["label type A"],
  },
  {
    description: "Input contains in a label element.",
    document: `<label id="labelB"> label type B
                 <div> inner div
                   <input id="typeB" type="text">
                 </div>
               </label>`,
    inputId: "typeB",
    expectedLabelIds: [["labelB"]],
    expectedText: ["label type B inner div"],
  },
  {
    description: '"for" attribute used to indicate input by one label.',
    document: `<label id="labelC" for="typeC">label type C</label>
               <input id="typeC" type="text">`,
    inputId: "typeC",
    expectedLabelIds: [["labelC"]],
    expectedText: [""],
  },
  {
    description: '"for" attribute used to indicate input by multiple labels.',
    document: `<form>
                 <label id="labelD1" for="typeD">label type D1</label>
                 <label id="labelD2" for="typeD">label type D2</label>
                 <label id="labelD3" for="typeD">label type D3</label>
                 <input id="typeD" type="text">
               </form>`,
    inputId: "typeD",
    expectedLabelIds: [["labelD1", "labelD2", "labelD3"]],
    expectedText: [""],
  },
  {
    description:
      '"for" attribute used to indicate input by multiple labels with space prefix/postfix.',
    document: `<label id="labelE1" for="typeE">label type E1</label>
               <label id="labelE2" for="typeE  ">label type E2</label>
               <label id="labelE3" for="  TYPEe">label type E3</label>
               <label id="labelE4" for="  typeE  ">label type E4</label>
               <input id="   typeE  " type="text">`,
    inputId: "   typeE  ",
    expectedLabelIds: [["labelE4"]],
    expectedText: [""],
  },
  {
    description: "Input contains in a label element.",
    document: `<label id="labelF"> label type F
                 <label for="dummy"> inner label
                   <input id="typeF" type="text">
                   <input id="dummy" type="text">
                 </div>
               </label>`,
    inputId: "typeF",
    expectedLabelIds: [["labelF"], [""]],
    expectedText: ["inner label", ""],
  },
  {
    description:
      '"for" attribute used to indicate input by labels out of the form.',
    document: `<label id="labelG1" for="typeG">label type G1</label>
               <form>
                 <label id="labelG2" for="typeG">label type G2</label>
                 <input id="typeG" type="text">
               </form>
               <label id="labelG3" for="typeG">label type G3</label>`,
    inputId: "typeG",
    expectedLabelIds: [["labelG1", "labelG2", "labelG3"]],
    expectedText: [""],
  },
  {
    description:
      "labels with no for attribute or child with one input at a different level",
    document: `<form>
                 <label id="labelH1">label H1</label>
                 <input>
                 <label id="labelH2">label H2</label>
                 <div><span><input></span></div>
               </form>`,
    inputId: "labelH1",
    expectedLabelIds: [["labelH1"], ["labelH2"]],
    expectedText: ["", ""],
  },
  {
    description:
      "labels with no for attribute or child with an input and button",
    document: `<form>
                 <label id="labelI1">label I1</label>
                 <input>
                 <label id="labelI2">label I2</label>
                 <button>
                 <input>
               </form>`,
    inputId: "labelI1",
    expectedLabelIds: [["labelI1"], []],
    expectedText: ["", ""],
  },
  {
    description: "three labels with no for attribute or child.",
    document: `<form>
                 <button>
                 <label id="labelJ1">label J1</label>
                 <label id="labelJ2">label J2</label>
                 <input>
                 <label id="labelJ3">label J3</label>
                 <meter>
                 <input>
               </form>`,
    inputId: "labelJ1",
    expectedLabelIds: [["labelJ2"], []],
    expectedText: ["", ""],
  },
  {
    description: "four labels with no for attribute or child.",
    document: `<form>
                 <input>
                 <fieldset>
                   <label id="labelK1">label K1</label>
                   <label id="labelK2">label K2</label>
                   <input>
                   <label id="labelK3">label K3</label>
                   <div><b><input></b></div>
                   <label id="labelK4">label K4</label>
                 </fieldset>
                 <input>
               </form>`,
    inputId: "labelK1",
    expectedLabelIds: [[], ["labelK2"], ["labelK3"], []],
    expectedText: ["", "", "", ""],
  },
  {
    description:
      "labels with no for attribute or child and inputs at different level.",
    document: `<form>
                 <input>
                 <div><span><input></span></div>
                 <label id="labelL1">label L1</label>
                 <label id="labelL2">label L2</label>
                 <div><span><input></span></div>
                 </input>
               </form>`,
    inputId: "labelK1",
    expectedLabelIds: [[], [], ["labelL2"], []],
    expectedText: ["", "", "", ""],
  },
  {
    description: "input fields with no labels.",
    document: `<form>
                 First Name: <input id="inputL1">
                 Additional      Name: <input>
                 Last Name: <input>
                 <span>Telephone</span>: <input>
                 <span>Country:</span><select><option>France<option>Germany</select>
                 <span>Email <b>address</b>:</span><input id="inputL2">
               </form>`,
    inputId: "inputL1",
    expectedLabelIds: [[], [], [], [], [], []],
    expectedText: [
      "First Name:",
      "Additional Name:",
      "Last Name:",
      "Telephone:",
      "Country:",
      "Email address:",
    ],
  },
  {
    description: "input fields with no labels and mixed labels.",
    document: `<form>
                 First Name: <input id="inputM1">
                 Last <output>output</output>Name: <input>
                 <div><span>Telephone</span></div>: <input>
                 <input>
                 <label  id="labelL1" for="inputM1">Given Name</label>
               </form>`,
    inputId: "inputM1",
    expectedLabelIds: [["labelL1"], [], [], []],
    expectedText: ["First Name:", "Name:", "Telephone:", ""],
  },
  {
    description: "input fields with no labels with deeply nested text.",
    document: `<form>
                 <p><span><b>First Name</b></span</p>: <input id="inputN1">
                 <p><span><i> Last Name </i> </span </p> : <p><span><input></span></p>
                 <div><div><div><div><div>Telephone</div></div> Number:</div></div></div><input>
                 <p><input>Text</p>
               </form>`,
    inputId: "inputN1",
    expectedLabelIds: [[], [], [], []],
    expectedText: ["First Name:", "Last Name :", "Telephone Number:", ""],
  },
  {
    description:
      "input fields with no labels and other elements that shouldn't be labels.",
    document: `<form>
                 Please fill in:
                 <fieldset>First Name</fieldset><input id="inputO1">
                 (Optional)
                 <button>Last Name</button><input>
                 Telephone<input>
                 <p><input>Text</p>
               </form>`,
    inputId: "inputO1",
    expectedLabelIds: [[], [], [], []],
    expectedText: ["", "", "Telephone", ""],
  },
  {
    description: "input fields labels in other languages.",
    document: `<form>
                 이름 <input id="inputP1">
                 മറുപേര് <input>
                 <span>телефон</span>: <input>
               </form>`,
    inputId: "inputP1",
    expectedLabelIds: [[], [], []],
    expectedText: ["이름", "മറുപേര്", "телефон:"],
  },
  {
    description: "input fields with labels too far away.",
    document: `<form>
                 <span><b>Hello</b>
                 <span><span><span><span><span>
                 </span></span></span></span></span>
                 <input id="inputQ1">
                 <span><b>Goodbye</b>
                 <span><span><span><span><span><span>
                 </span></span></span></span></span></span>
                 <input id="inputQ2">
               </form>`,
    inputId: "inputQ1",
    expectedLabelIds: [[], []],
    expectedText: ["Hello", ""],
  },
];

TESTCASES.forEach(testcase => {
  add_task(async function () {
    info("Starting testcase: " + testcase.description);

    let doc = MockDocument.createTestDocument(
      "http://localhost:8080/test/",
      testcase.document
    );

    let formElements = doc.querySelectorAll("input, select");
    let labelsIndex = 0;
    for (let formElement of formElements) {
      let labels = LabelUtils.findLabelElements(formElement);
      Assert.deepEqual(
        labels.map(l => l.id),
        testcase.expectedLabelIds[labelsIndex]
      );

      let text = LabelUtils.findNearbyText(formElement);
      Assert.deepEqual(text, testcase.expectedText[labelsIndex]);
      labelsIndex++;
    }

    LabelUtils.clearLabelMap();
  });
});
