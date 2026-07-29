# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at https://mozilla.org/MPL/2.0/.

import pathlib
import shutil

from mozlint import result
from mozversioncontrol import (
    InvalidRepoPath,
    MissingVCSInfo,
    MissingVCSTool,
    get_repository_object,
)

CLAUDE_SKILLS = ".claude/skills"
AGENT_SKILLS = ".agents/skills"


def _error(config, path, message):
    return result.from_config(
        config,
        path=str(path),
        lineno=0,
        message=message,
        level="error",
    )


def _walk(base):
    if not base.is_dir():
        return []
    return [p for p in base.rglob("*.md") if p.is_file()]


def _collect_vcs_changes(root):
    """Return a mapping of repo-relative POSIX paths for added/modified and
    deleted files in the working copy, or None if VCS state is unavailable.
    """
    try:
        repo = get_repository_object(str(root))
        added_or_modified = repo.get_changed_files(diff_filter="AM", mode="all")
        deleted = repo.get_changed_files(diff_filter="D", mode="all")
    except (InvalidRepoPath, MissingVCSTool, MissingVCSInfo):
        return None
    return {
        "added_or_modified": {
            pathlib.PurePath(p).as_posix() for p in added_or_modified
        },
        "deleted": {pathlib.PurePath(p).as_posix() for p in deleted},
    }


def lint(paths, config, fix=None, **lintargs):
    root = pathlib.Path(lintargs["root"]).resolve()
    claude_root = root / CLAUDE_SKILLS
    agent_root = root / AGENT_SKILLS

    vcs_changes = _collect_vcs_changes(root) if fix else None

    claude_rels = {p.relative_to(claude_root).as_posix() for p in _walk(claude_root)}
    agent_rels = {p.relative_to(agent_root).as_posix() for p in _walk(agent_root)}

    results = []
    fixed = 0

    for rel in sorted(claude_rels.symmetric_difference(agent_rels)):
        claude_path = claude_root / rel
        agent_path = agent_root / rel
        claude_display = f"{CLAUDE_SKILLS}/{rel}"
        agent_display = f"{AGENT_SKILLS}/{rel}"

        if rel in claude_rels:
            existing_path, missing_path = claude_path, agent_path
            existing_display, missing_display = claude_display, agent_display
        else:
            existing_path, missing_path = agent_path, claude_path
            existing_display, missing_display = agent_display, claude_display

        if fix and vcs_changes is not None:
            existing_added = existing_display in vcs_changes["added_or_modified"]
            missing_deleted = missing_display in vcs_changes["deleted"]
            if existing_added and not missing_deleted:
                missing_path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(existing_path, missing_path)
                fixed += 1
                continue
            if missing_deleted and not existing_added:
                existing_path.unlink()
                fixed += 1
                continue

        if fix:
            results.append(
                _error(
                    config,
                    existing_path,
                    f"{existing_display} has no counterpart {missing_display}. "
                    "Cannot determine from VCS whether to propagate an add or "
                    "a delete; resolve manually.",
                )
            )
        else:
            results.append(
                _error(
                    config,
                    existing_path,
                    f"Missing counterpart {missing_display}. Run "
                    "`./mach lint -l agent-skills-sync --fix`.",
                )
            )

    for rel in sorted(claude_rels.intersection(agent_rels)):
        claude_path = claude_root / rel
        agent_path = agent_root / rel
        if claude_path.read_bytes() == agent_path.read_bytes():
            continue

        claude_display = f"{CLAUDE_SKILLS}/{rel}"
        agent_display = f"{AGENT_SKILLS}/{rel}"

        if fix and vcs_changes is not None:
            claude_changed = claude_display in vcs_changes["added_or_modified"]
            agent_changed = agent_display in vcs_changes["added_or_modified"]
            if claude_changed and not agent_changed:
                shutil.copyfile(claude_path, agent_path)
                fixed += 1
                continue
            if agent_changed and not claude_changed:
                shutil.copyfile(agent_path, claude_path)
                fixed += 1
                continue

        if fix:
            claude_msg = (
                f"This file differs from {agent_display}. Both (or neither) "
                "sides modified in VCS; resolve manually."
            )
            agent_msg = (
                f"This file differs from {claude_display}. Both (or neither) "
                "sides modified in VCS; resolve manually."
            )
        else:
            claude_msg = (
                f"This file differs from {agent_display}. Try "
                "`./mach lint -l agent-skills-sync --fix`, else resolve "
                "manually."
            )
            agent_msg = (
                f"This file differs from {claude_display}. Try "
                "`./mach lint -l agent-skills-sync --fix`, else resolve "
                "manually."
            )
        results.append(_error(config, claude_path, claude_msg))
        results.append(_error(config, agent_path, agent_msg))

    return {"results": results, "fixed": fixed}
