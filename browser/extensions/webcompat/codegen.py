# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

import json
import os
import re
import shutil
import unicodedata
from functools import cache

import jsonschema
import mozpack.path as mozpath
from mozpack.files import FileFinder


@cache
def interventions_schema():
    schema_path = mozpath.join(
        os.path.dirname(__file__),
        "intervention_schema.json",
    )
    with open(schema_path) as schema_fd:
        return json.load(schema_fd)


def load_intervention_json(json_fd):
    try:
        config = json.load(json_fd)
    except json.decoder.JSONDecodeError as e:
        raise ValueError(f"{mozpath.basename(json_fd.path)} is invalid JSON: {e}")

    try:
        jsonschema.validate(instance=config, schema=interventions_schema())
    except jsonschema.exceptions.ValidationError as e:
        raise ValueError(
            f"{mozpath.basename(json_fd.path)} is invalid intervention JSON: {e}"
        )

    return config


def clear_dir(path):
    if not os.path.isdir(path) and not os.path.islink(path):
        raise Exception(f"{path} is not a directory")
    for filename in os.listdir(path):
        file_path = mozpath.join(path, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            print(f"Failed to delete {file_path}. Reason: {e}")


def safe_filename(raw):
    subbed = re.sub(
        "_+",
        "_",
        raw
        .replace(" ", "_")
        .replace("\\", "_")
        .replace("/", "_")
        .replace(os.path.sep, "_")
        .replace("(", "")
        .replace(")", ""),
    )
    normalized = unicodedata.normalize("NFD", subbed)
    return "".join([c for c in normalized if not unicodedata.combining(c)])


def maybe_lstrip(str, value):
    if str.startswith(str):
        return str[len(value) :].lstrip()
    return str


def clean_script_template(script, filename):
    # drop any license header, linter globals line, and "use strict".
    script = script.rstrip()
    while True:
        script = script.lstrip()
        if script.startswith("/*"):
            script = script.partition("*/")[2]
        elif script.startswith("//"):
            script = script.partition("\n")[2]
        elif script.startswith('"use strict";'):
            script = script[13:]
        else:
            break
    if not script:
        raise ValueError(f"{filename} template does not seem to be a proper template")
    if (
        not script.startswith("{")
        and not script.startswith("try")
        and not script.startswith("if")
    ):
        script = "\n  ".join(script.splitlines())
        script = f"{{\n  {script}\n}}"
    return script


SPECIAL_META_KEYS = ["all_frames", "match_origin_as_fallback"]


class special_js_script_checker:
    def check(self, intervention, src_json_filename):
        data = intervention.pop(self.section, None)

        if data is None:
            return None, None

        metas = {name: False for name in SPECIAL_META_KEYS}
        if type(data) is dict:
            for key in SPECIAL_META_KEYS:
                metas[key] = data.get(key, False)

        return metas, self._get_params_from_data(data, src_json_filename)


class check_hide_alerts_section(special_js_script_checker):
    def __init__(self):
        self.section = "hide_alerts"
        self.json_key = "alerts"
        self.source = "hide_alerts.js"

    def _get_params_from_data(self, data, src_json_filename):
        if type(data) is list:
            alertsToHide = data
        elif type(data) is dict and "alerts" in data:
            alertsToHide = data["alerts"]
        else:
            raise ValueError(
                f"Unexpected data in {self.section} in {src_json_filename}: {str(data)}"
            )

        for alert in alertsToHide:
            if alert.lower() != alert:
                raise ValueError(
                    f"Please use lowercase values for {self.section} values (not `{alert}`) in {src_json_filename}"
                )

        return {"alertsToHide": alertsToHide}


class check_hide_messages_section(special_js_script_checker):
    def __init__(self):
        self.section = "hide_messages"
        self.json_key = "messages"
        self.source = "hide_messages.js"

    def _get_params_from_data(self, data, src_json_filename):
        if type(data) is list:
            messagesToHide = data
        elif type(data) is dict and "message" in data:
            messagesToHide = [data]
        elif type(data) is dict and "messages" in data:
            messagesToHide = data["messages"]
        else:
            raise ValueError(
                f"Unexpected data in {self.section} in {src_json_filename}: {str(data)}"
            )

        return {"messagesToHide": messagesToHide}


class check_modify_meta_viewport_section(special_js_script_checker):
    def __init__(self):
        self.section = "modify_meta_viewport"
        self.json_key = "modify"
        self.source = "modify_meta_viewport.js"

    def _get_params_from_data(self, data, src_json_filename):
        if type(data) is dict and "modify" in data:
            metaViewportChanges = data["modify"]
        elif type(data) is dict:
            metaViewportChanges = data
        else:
            raise ValueError(
                f"Unexpected data in {self.section} in {src_json_filename}: {str(data)}"
            )

        return {"metaViewportChanges": metaViewportChanges}


def bake_params_into_script_template(template, params={}):
    for name, value in params.items():
        template = template.replace(
            f'"param:{name}"', json.dumps(value, sort_keys=True)
        )
    return template


@cache
def get_script_template(filename, *dirs_to_try):
    for dir in dirs_to_try:
        path_to_try = mozpath.join(dir, filename)
        if os.path.isfile(path_to_try) and os.access(path_to_try, os.R_OK):
            with open(path_to_try) as template_fd:
                return clean_script_template(template_fd.read(), filename)

    raise ValueError(
        f"Could not access expected template {filename} in {' or '.join(dirs_to_try)}"
    )


def build_logger_script(config, templates_dir):
    domain_to_bug_numbers = {}
    for bug_number, data in config.get("bugs", {}).items():
        for match in data.get("matches", []):
            domain = match.partition("://")[2].split("/")[0].replace("*.", "")
            domain_to_bug_numbers.setdefault(domain, set())
            domain_to_bug_numbers[domain].add(bug_number)

    bugInfo = [[k, sorted(list(v))] for k, v in domain_to_bug_numbers.items()]
    return bake_params_into_script_template(
        get_script_template("log_console_message.js", templates_dir),
        {"bugInfo": bugInfo},
    )


def determine_generated_content_scripts_for_intervention(
    config, bug_number, src_json_filename, interventions_dir
):
    injections_dir = mozpath.normpath(
        mozpath.join(
            interventions_dir,
            "..",
            "..",
            "injections",
        )
    )

    return determine_generated_css_content_scripts_for_intervention(
        config, bug_number, src_json_filename
    ) | determine_generated_js_content_scripts_for_intervention(
        config, bug_number, src_json_filename, injections_dir
    )


def determine_generated_js_content_scripts_for_intervention(
    config, bug_number, src_json_filename, injections_dir
):
    # The JSON files for interventions may used generic JS scripts, including
    # special ones with special info in the JSON, like this:
    #
    #  "interventions": [
    #    {
    #      "hide_messages": [{ "container": ".header.caution", "message": "unsupported browser"}],
    #      "hide_alerts": { "all_frames": true, "alerts: ["Chrome"] },
    #      "modify_meta_viewport": {
    #         "interactive-widget": "resizes-content",
    #      },
    #      "content_scripts": {
    #        "js": ["use_chrome_useragent.js"]
    #      }
    #    },
    #
    # We want to combine these into one final content-scripts:
    #
    #    {
    #      "content_scripts": {
    #        "js": ["injections/generated/bug12345_whatever.com.js"]
    #      }
    #    },

    files_to_generate = {}
    generated_filenames_cache = {}

    special_checkers = [
        check_hide_alerts_section(),
        check_hide_messages_section(),
        check_modify_meta_viewport_section(),
    ]

    label = safe_filename(config["label"])
    for intervention in config["interventions"]:
        final_metas = None

        content_scripts = intervention.get("content_scripts", {})
        if content_scripts:
            final_metas = {}
            for key in SPECIAL_META_KEYS:
                final_metas[key] = content_scripts.get(key, False)

        js = content_scripts.get("js", [])
        generate_from_sources = []
        if js and any(not script_filename.startswith("bug") for script_filename in js):
            generate_from_sources = [
                {
                    "params": {},
                    "source": script_filename,
                }
                for script_filename in js
            ]

        for checker in special_checkers:
            metas, params = checker.check(intervention, src_json_filename)
            if not metas and not params:
                continue

            if final_metas is None:
                final_metas = metas
            elif final_metas != metas:
                raise ValueError(
                    f"cannot mix true/false values of {SPECIAL_META_KEYS} in the same intervention in {src_json_filename}"
                )

            generate_from_sources.append({
                "params": params,
                "source": checker.source,
            })

        if generate_from_sources:
            cache_key = json.dumps(generate_from_sources, sort_keys=True)
            generated_filename = generated_filenames_cache.get(cache_key, None)
            if not generated_filename:
                suffix = ""
                next_generated_script_num = len(generated_filenames_cache)
                if next_generated_script_num:
                    suffix = f"-{next_generated_script_num}"
                generated_filename = safe_filename(
                    f"bug{bug_number}-{label}{suffix}.js"
                )
                generated_filenames_cache[cache_key] = generated_filename

            content_scripts = intervention.setdefault("content_scripts", {})
            js = content_scripts.setdefault("js", [])
            content_scripts["js"] = [f"injections/generated/{generated_filename}"]
            for name, value in final_metas.items():
                if value:
                    content_scripts[name] = True
            files_to_generate[generated_filename] = generate_from_sources

    return files_to_generate


def determine_generated_css_content_scripts_for_intervention(
    config, bug_number, src_json_filename
):
    # The JSON files for interventions may contain css sections like this:
    #
    #  "label": "whatever.com",
    #  "css": {
    #      "fix_broken_slider": "css text 1",
    #      "remove_extra_scrollbars": "css text 2"
    #  },
    #  "interventions": [
    #    {
    #      "css": ["fix_broken_slider"]
    #    },
    #    {
    #      "css": {
    #        "all_frames": true,
    #        "match_origin_as_fallback": true,
    #        "which": ["fix_broken_slider", "remove_extra_scrollbars"]
    #      }
    #    }
    #  ]
    #
    # These must be replaced with corresponding content_scripts sections while building the
    # final run.js (and the files it references must also be generated):
    #
    #  "label": "whatever.com",
    #  "interventions": [
    #    {
    #      "content_scripts": {
    #        "css": ["injections/generated/bug12345_whatever.com_fix_broken_slider.css"]
    #      }
    #    },
    #    {
    #      "content_scripts": {
    #        "all_frames": true,
    #        "match_origin_as_fallback": true,
    #        "css": ["injections/generated/bug12345_whatever.com_fix_broken_slider.css",
    #                "injections/generated/bug12345_whatever.com_remove_extra_scrollbars.css"]
    #      }
    #    }
    #  ]

    files_to_generate = {}

    if "css" in config and (type(config["css"]) is not dict or not config["css"]):
        raise ValueError(
            f"css section should be a non-empty object or be removed from {src_json_filename}"
        )

    css_files = config.pop("css", None)
    if not css_files:
        for intervention in config["interventions"]:
            if intervention.get("css"):
                raise ValueError(
                    f"css wanted, but none specified for {src_json_filename}"
                )
        return files_to_generate

    actually_used_files = set()

    for cssText in css_files.values():
        if type(cssText) is not str or not cssText:
            raise ValueError(
                f"css text should be a non-empty string in {src_json_filename}"
            )

    label = safe_filename(config["label"])
    for intervention in config["interventions"]:
        css = intervention.pop("css", None)

        if css is None:
            continue

        if type(css) is list:
            css = {"which": css}
        elif type(css) is not dict:
            raise ValueError(
                f"css sections should be a non-empty object or list or be removed from interventions in {src_json_filename}"
            )

        which_css_files_to_add = css.pop("which", None)
        if not which_css_files_to_add or type(which_css_files_to_add) is not list:
            raise ValueError(
                f"intervention with missing `which` key or invalid array of desired css files in {src_json_filename}"
            )

        for file in which_css_files_to_add:
            if type(file) is not str or not file:
                raise ValueError(
                    f"Empty or non-string filename not listed in intervention css section of {src_json_filename}"
                )
            if not css_files.get(file):
                raise ValueError(
                    f"{file} is not listed in css section of {src_json_filename}"
                )
            actually_used_files.add(file)

        metas = {}
        for key in SPECIAL_META_KEYS:
            metas[key] = css.pop(key, False)
            if not isinstance(metas[key], bool):
                raise ValueError(
                    f"{key} must be `true` or `false` in {src_json_filename}"
                )

        unknown_keys = "','".join(css.keys())
        if unknown_keys:
            raise ValueError(
                f"unknown key(s) '{unknown_keys}' in css section of {src_json_filename}"
            )

        content_scripts = intervention.get("content_scripts", None)
        if content_scripts:
            for key in SPECIAL_META_KEYS:
                if content_scripts.get(key, False) != metas[key]:
                    raise ValueError(
                        f"cannot mix value of {key} in css and content_scripts sections in {src_json_filename}"
                    )

        content_scripts = intervention.setdefault("content_scripts", {})

        css = content_scripts.setdefault("css", [])
        for filename in which_css_files_to_add:
            final_filename = safe_filename(f"bug{bug_number}-{label}-{filename}.css")
            css.append(f"injections/generated/{final_filename}")
            files_to_generate[final_filename] = [{"contents": css_files[filename]}]

        for key in SPECIAL_META_KEYS:
            if metas[key]:
                content_scripts[key] = True

    extras = set(css_files.keys()).difference(actually_used_files)
    if extras:
        raise ValueError(
            f"Extra css fragments specified which aren't used in {src_json_filename}: "
            + ", ".join(list(extras))
        )

    return files_to_generate


def generate_run_js(
    output_fd,
    template_path,
    interventions_dir,
    *_preprocessed_intervention_files_mozbuild,
):
    preprocessed_intervention_files_mozbuild = [
        f
        for f in _preprocessed_intervention_files_mozbuild
        if not f.endswith("/codegen.py")
    ]

    with open(template_path) as template_fd:
        input_files = list(FileFinder(interventions_dir).find("*.json"))

        filenames_json_files_expect_to_generate = set()

        final_interventions = {}
        actually_referenced_non_generated_files = set()
        for json_filename, json_fd in input_files:
            bug_number = mozpath.splitext(mozpath.basename(json_filename))[0].split(
                "-"
            )[0]

            config = load_intervention_json(json_fd)

            final_interventions[bug_number] = config

            # Do some sanity checks first
            listed_bugs = config.get("bugs", {}).keys()
            if len(listed_bugs) < 2 and bug_number.split("_")[0] not in listed_bugs:
                raise ValueError(
                    f"Bug number in the filename ({bug_number}) does not match bugs section of {json_filename}"
                )

            for intervention in config["interventions"]:
                content_scripts = intervention.get("content_scripts", {})
                listed_files = set()
                for type in ["css", "js"]:
                    for non_generated_filename in content_scripts.get(type, []):
                        actually_referenced_non_generated_files.add(
                            non_generated_filename
                        )
                        if f"injections/{type}/" in non_generated_filename:
                            raise ValueError(
                                f"Please remove the unneeded 'injections/{type}/' from '{non_generated_filename}' intervention in {json_filename}"
                            )
                        if not non_generated_filename.endswith(f".{type}"):
                            raise ValueError(
                                f"{non_generated_filename} does not end in .{type} in {json_filename}"
                            )
                        if non_generated_filename in listed_files:
                            raise ValueError(
                                f"{non_generated_filename} is listed twice in same intervention in {json_filename}"
                            )
                        listed_files.add(non_generated_filename)
                        actual_path = mozpath.normpath(
                            mozpath.join(
                                interventions_dir,
                                "..",
                                "..",
                                "injections",
                                type,
                                non_generated_filename,
                            )
                        )
                        if not os.path.isfile(actual_path) or not os.access(
                            actual_path, os.R_OK
                        ):
                            raise ValueError(
                                f"{non_generated_filename} is not an accessible file in {json_filename} (expected at {actual_path})"
                            )
                        if os.path.splitext(actual_path)[1] != "." + type:
                            raise ValueError(
                                f"File extension for {actual_path} should be .{type} in {json_filename}"
                            )

            # Now remove each css section in this JSON and ensure that a corresponding
            # content_scripts section exists, with the files named as they will be after
            # they are generated by generate_css_intervention. Also double-check that we
            # will not be stomping over any already-existing non-generated files.

            generated_files = determine_generated_content_scripts_for_intervention(
                config, bug_number, json_filename, interventions_dir
            )

            for filename in generated_files:
                filenames_json_files_expect_to_generate.add(filename)

        # Halt if preprocessed_intervention_files.mozbuild needs to be updated
        filenames_listed_in_mozbuild = set(preprocessed_intervention_files_mozbuild)
        extra_generated_files = sorted(
            filenames_json_files_expect_to_generate.difference(
                filenames_listed_in_mozbuild
            )
        )
        missing_generated_files = sorted(
            filenames_listed_in_mozbuild.difference(
                filenames_json_files_expect_to_generate
            )
        )
        if extra_generated_files or missing_generated_files:
            msg = ""
            if missing_generated_files:
                msg += "\nPlease remove: " + ", ".join(missing_generated_files)
            if extra_generated_files:
                msg += "\nPlease add: " + ", ".join(extra_generated_files)
            raise ValueError(
                "preprocessed_intervention_files.mozbuild is out of date:" + msg
            )

        # Check if any non-generated css/js files aren't being used anymore.
        non_generated_files_path = mozpath.normpath(
            mozpath.join(interventions_dir, "..", "..", "injections")
        )
        non_generated_files = set(
            name
            for name, _ in FileFinder(
                mozpath.join(non_generated_files_path, "css")
            ).find("*")
        )
        non_generated_files.update(
            set(
                name
                for name, _ in FileFinder(
                    mozpath.join(non_generated_files_path, "js")
                ).find("*")
            )
        )
        extra_non_generated_files = sorted(
            non_generated_files.difference(actually_referenced_non_generated_files)
        )
        # Generic css/js files are bundled in case we need them for remote updates,
        # so don't ask for them to be removed even if they seem unreferenced.
        extra_non_generated_files = [
            filename
            for filename in extra_non_generated_files
            if filename.startswith("bug")
        ]
        if extra_non_generated_files:
            raise ValueError(
                "Please remove these files which are not referenced in any intervention JSON file: "
                + ", ".join(extra_non_generated_files)
            )

        # Emit the final run.json
        interventions_json = json.dumps(
            dict(sorted(final_interventions.items())), indent=2, sort_keys=True
        )

        raw = template_fd.read()
        subbed = raw.replace(
            "// Note that this variable is expanded during build-time. See bz2019069 for details.\n",
            "",
        )
        subbed = raw.replace(
            "AVAILABLE_INTERVENTIONS = {}",
            f"AVAILABLE_INTERVENTIONS = {interventions_json}",
        )
        output_fd.write(subbed)


def generate_file(outfile, interventions_dir, *ignored):
    desired_filename = mozpath.basename(outfile.name)
    is_css = outfile.name.endswith(".css")
    is_js = outfile.name.endswith(".js")
    if not is_css and not is_js:
        raise ValueError(f"Do not know how to generate {outfile.name}")

    bug_number = (
        mozpath
        .splitext(mozpath.basename(desired_filename))[0]
        .split("-")[0]
        .lstrip("bug")
    )

    expected_json_filename = "-".join(
        mozpath.splitext(desired_filename.lstrip("bug"))[0].split("-")[0:2]
    )
    json_files = list(
        FileFinder(interventions_dir).find(f"{expected_json_filename}*.json")
    )
    if not json_files:
        raise ValueError(
            f"no json intervention file starting with {expected_json_filename}"
        )
    if len(json_files) > 1:
        json_files = " or ".join(f[0] for f in json_files)
        raise ValueError(
            f"multiple json intervention files starting with {expected_json_filename}.. not sure which to use to generate {desired_filename} from {json_files}"
        )

    json_filename, json_fd = json_files[0]
    config = load_intervention_json(json_fd)

    generated_files = determine_generated_content_scripts_for_intervention(
        config, bug_number, json_filename, interventions_dir
    )

    needed_parts = generated_files.get(desired_filename, None)

    if needed_parts is None or not needed_parts:
        raise ValueError(
            f"No needed parts found to generate {desired_filename} for {json_filename}"
        )

    generated_parts = []

    templates_dir = mozpath.normpath(
        mozpath.join(
            interventions_dir,
            "..",
            "..",
            "templates",
        )
    )

    js_injections_dir = mozpath.normpath(
        mozpath.join(templates_dir, "..", "injections", "js")
    )

    for part_info in needed_parts:
        if part_info.get("contents", None):
            # css files go here
            generated_parts.append(part_info["contents"])
            continue

        params = part_info["params"]
        source_filename = part_info["source"]
        template = get_script_template(
            source_filename, templates_dir, js_injections_dir
        )
        generated_parts.append(bake_params_into_script_template(template, params))

    if not generated_parts:
        raise ValueError(
            f"Failed to generate anything for {outfile.name} in {json_filename}"
        )

    all_parts = "\n\n".join(generated_parts)
    if is_js:
        if "__webcompat_spoof_platform" in all_parts:
            all_parts += "\n\ndelete window.__webcompat_spoof_platform;"
        if "window.__webcompat" in all_parts.replace("__webcompat_spoof_platform", ""):
            all_parts += "\n\n" + build_logger_script(config, templates_dir)

    outfile.write(
        "/* THIS IS AN AUTOGENERATED FILE. DO NOT EDIT THIS FILE DIRECTLY. */\n\n"
    )
    outfile.write(all_parts)


def main(*args):  # mach requires this
    pass
