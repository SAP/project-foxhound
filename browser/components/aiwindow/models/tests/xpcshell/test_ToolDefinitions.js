/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Tests for validating tool definitions in Tools.sys.mjs
 *
 * The tests are designed to verify that tool definitions are in compliance
 *   with the OpenAI API standard.
 *
 * These tests ensure that:
 * 1. Tool definitions have the correct structure
 * 2. Parameters match what the actual functions accept
 * 3. Required fields are present and correctly specified
 * 4. Parameter types are valid and consistent
 */

const { toolsConfig, TOOLS } = ChromeUtils.importESModule(
  "moz-src:///browser/components/aiwindow/models/Tools.sys.mjs"
);

/**
 * Test that all tool definitions have the required top-level structure
 */
add_task(function test_toolDefinitions_structure() {
  Assert.ok(Array.isArray(toolsConfig), "toolsConfig should be an array");
  Assert.equal(
    toolsConfig.length,
    TOOLS.length,
    "toolsConfig length should match TOOLS length"
  );

  for (const [index, toolDef] of toolsConfig.entries()) {
    Assert.equal(
      toolDef.type,
      "function",
      `Tool ${index} should have type "function"`
    );
    Assert.ok(
      toolDef.function,
      `Tool ${index} should have a function property`
    );
    Assert.equal(
      typeof toolDef.function.name,
      "string",
      `Tool ${index} function.name should be a string`
    );
    Assert.greater(
      toolDef.function.name.length,
      0,
      `Tool ${index} function.name should not be empty`
    );
    Assert.equal(
      typeof toolDef.function.description,
      "string",
      `Tool ${index} function.description should be a string`
    );
    Assert.greater(
      toolDef.function.description.length,
      0,
      `Tool ${index} function.description should not be empty`
    );
    Assert.ok(
      toolDef.function.parameters,
      `Tool ${index} should have parameters`
    );
    Assert.equal(
      toolDef.function.parameters.type,
      "object",
      `Tool ${index} parameters.type should be "object"`
    );
  }
});

/**
 * Test that all tool names in TOOLS array match the tool definitions
 */
add_task(function test_toolDefinitions_names_match_constants() {
  const definedNames = toolsConfig.map(t => t.function.name);
  const expectedNames = TOOLS;

  Assert.deepEqual(
    definedNames.sort(),
    expectedNames.sort(),
    "Tool names in toolsConfig should match TOOLS constant"
  );
});

/**
 * Test that all parameter types are valid JSON Schema types
 */
add_task(function test_parameter_types_are_valid() {
  const validTypes = [
    "string",
    "number",
    "integer",
    "boolean",
    "array",
    "object",
    "null",
  ];

  for (const toolDef of toolsConfig) {
    const props = toolDef.function.parameters.properties;

    for (const [paramName, paramDef] of Object.entries(props)) {
      Assert.ok(
        validTypes.includes(paramDef.type),
        `Parameter ${paramName} in ${toolDef.function.name} should have valid JSON Schema type`
      );

      // If it's an array, check items type
      if (paramDef.type === "array" && paramDef.items) {
        Assert.ok(
          validTypes.includes(paramDef.items.type),
          `Array items type for ${paramName} in ${toolDef.function.name} should be valid`
        );
      }
    }
  }
});

/**
 * Test that all parameters have non-empty descriptions
 */
add_task(function test_parameter_descriptions_are_meaningful() {
  for (const toolDef of toolsConfig) {
    const props = toolDef.function.parameters.properties;

    for (const [paramName, paramDef] of Object.entries(props)) {
      Assert.greater(
        paramDef.description.length,
        10,
        `Parameter ${paramName} in ${toolDef.function.name} should have meaningful description (>10 chars)`
      );

      // Check nested items descriptions for arrays
      if (paramDef.type === "array" && paramDef.items?.description) {
        Assert.greater(
          paramDef.items.description.length,
          10,
          `Array items description for ${paramName} in ${toolDef.function.name} should be meaningful`
        );
      }
    }
  }
});

/**
 * Test that required parameters are actually defined in properties
 */
add_task(function test_required_parameters_exist_in_properties() {
  for (const toolDef of toolsConfig) {
    const params = toolDef.function.parameters;
    if (params.required) {
      Assert.ok(
        Array.isArray(params.required),
        `Tool ${toolDef.function.name} required field should be an array if present`
      );
      for (const requiredParam of params.required) {
        Assert.ok(
          params.properties[requiredParam],
          `Required parameter ${requiredParam} in ${toolDef.function.name} should exist in properties`
        );
      }
    }
  }
});
