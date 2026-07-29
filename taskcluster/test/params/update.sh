#!/bin/bash
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This script uses the yq command from https://github.com/kislyuk/yq.
# There is another yq (https://github.com/mikefarah/yq) with incompatible
# interface.

set -ex

TASKCLUSTER_ROOT_URL=https://firefox-ci-tc.services.mozilla.com

dir=$(dirname "$0")
if [ -n "$1" ]; then
    files="$@"
else
    files=$(ls -1 "$dir"/*.yml)
fi
for f in $files; do
    base=$(basename "$f" .yml)
    prefix=${base%%-*}
    action=${base#*-}
    trust_domain=gecko
    # remove people's email addresses
    filter='.owner="user@example.com"'

    case $prefix in
        mc)
            path=mozilla-central
            ;;
        mb)
            path=mozilla-beta
            ;;
        mr)
            path=mozilla-release
            ;;
        me)
            version=$(curl -s https://product-details.mozilla.org/1.0/firefox_versions.json | jq -r  .FIREFOX_ESR)
            version=${version%%.*}
            path=mozilla-esr${version}
            # unset enable_always_target to fall back to the default, to avoid
            # generating a broken graph with esr115 params
            filter="$filter | del(.enable_always_target)"
            ;;
        autoland)
            path=autoland
            ;;
        em)
            trust_domain=enterprise
            path=enterprise-firefox.branch.enterprise-main
            ;;
        github)
            continue
            ;;
        try)
            continue
            ;;
        *)
            echo unknown prefix $prefix >&2
            exit 1
            ;;
    esac

    case $action in
        onpush)
            task=${trust_domain}.v2.${path}.latest.taskgraph.decision
            service=index
            # find a non-DONTBUILD push
            while :; do
                params=$(curl -f -L ${TASKCLUSTER_ROOT_URL}/api/${service}/v1/task/${task}/artifacts/public%2Fparameters.yml)
                method=$(echo "$params" | yq -r .target_tasks_method)
                pushlog_id=$(echo "$params" | yq -r .pushlog_id)
                if [ "$method" != nothing ] || [ "$pushlog_id" -eq 0 ]; then
                    break
                fi
                task=${trust_domain}.v2.${path}.pushlog-id.$((pushlog_id - 1)).decision
            done
            ;;
        onpush-geckoview)
            # this one is weird, ignore it
            continue
            ;;
        cron-*)
            task=${action#cron-}
            task=${trust_domain}.v2.${path}.latest.taskgraph.decision-${task}
            service=index
            ;;
        nightly-all)
            task=${trust_domain}.v2.${path}.latest.taskgraph.decision-nightly-all
            service=index
            ;;
        android-nightly)
            task=${trust_domain}.v2.${path}.latest.taskgraph.decision-nightly-android
            service=index
            ;;
        desktop-nightly)
            task=${trust_domain}.v2.${path}.latest.taskgraph.decision-nightly-desktop
            service=index
            ;;
        push*|promote*|ship*)
            case $action in
                *-partials)
                    action=${action%-partials}
                    ;;
                *)
                    filter="$filter | .release_history={}"
                    ;;
            esac
            suffix=
            case $action in
                *-firefox-rc)
                    product=firefox
                    action=${action%-firefox-rc}
                    phase=${action}_${product}_rc
                    ;;
                *-firefox)
                    product=firefox
                    action=${action%-$product}
                    phase=${action}_${product}
                    ;;
                *-devedition)
                    product=devedition
                    action=${action%-$product}
                    phase=${action}_${product}
                    ;;
                *-android)
                    product=firefox-android
                    action=${action%-android}
                    phase=${action}_android
                    ;;
                *)
                    echo unknown action $action >&2
                    exit 1
                    ;;
            esac
            # grab the action task id from the latest release where this phase wasn't skipped
            task=$(curl -s "https://shipitapi-public.services.mozilla.com/releases?product=${product}&branch=releases/${path}&status=shipped" | \
                jq -r "map(.phases[] | select(.name == "'"'"$phase"'"'" and (.skipped | not)))[-1].actionTaskId")
            service=queue
            ;;
        *merge-automation)
            # these tasks have no useful indexes; unable to update them automatically
            continue
            ;;
        *)
            echo unknown action $action >&2
            exit 1
            ;;
    esac

    curl -f -L ${TASKCLUSTER_ROOT_URL}/api/${service}/v1/task/${task}/artifacts/public%2Fparameters.yml | yq -y "$filter" > "${f}"
done
