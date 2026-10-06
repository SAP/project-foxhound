Tree Closures and What They Mean for Developers
=================================================

When you push a patch to **firefox-autoland** via Lando, it lands on a shared integration
branch that is continuously tested. Sometimes that branch is *closed* — meaning
new pushes are temporarily blocked. This page explains why closures happen, how
to check the current status, and what you should do when the tree is closed.

Checking the Tree Status
------------------------

* **Treestatus** — the dedicated treestatus website shows the status of all
  trees: https://lando.services.mozilla.com/treestatus/
  The autoland-specific page is at
  https://lando.services.mozilla.com/treestatus/firefox-autoland/
* **Lando** — the landing page shows the current state at the top.
* **Test infrastructure dashboard** — the red line at the top of
  https://tests.firefox.dev/workers.html indicates the tree is closed.
* **Treeherder** — a red banner appears at the top when the tree is closed.
  The job view at https://treeherder.mozilla.org/#/jobs?repo=autoland might show
  the failing jobs that triggered the closure.

Historical closure logs (JSON) are available at:
https://treestatus.mozilla-releng.net/trees/firefox-autoland/logs_all

Types of Closures
-----------------

`Sheriffs <https://wiki.mozilla.org/Sheriffing>`__ (the people who keep the
tree green) close the tree for different reasons. Each closure is tagged
with one of the categories below.

Test Failures (``checkin_test``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A recently-landed patch caused test failures (mochitest, browser-chrome,
xpcshell, web-platform-tests, etc.). Sheriffs close the tree while they
identify and back out the offending patch.

**What to do:** Wait for the backout to land and the tree to reopen. If
*your* patch was backed out, check Treeherder or Bugzilla for the failure
logs and fix the issue before re-landing.

Waiting for Coverage (``waiting_for_coverage``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A new batch of pushes has landed and too many test jobs are still pending
or running. The tree is temporarily closed so that sheriffs can assess the
results before allowing more patches in. This is the most frequent type of
closure and is usually short (under an hour).

**What to do:** Just wait. This is routine.

Build Failures (``checkin_compilation``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

A patch broke the build on one or more platforms (compile error,
SpiderMonkey build failure, l10n bustage, etc.). The tree stays closed
until the bustage is backed out or fixed.

**What to do:** Same as test failures — wait for the fix, or investigate if
you suspect your patch is the cause.

Infrastructure Issues (``infra``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Something outside the code is broken: Taskcluster workers, Treeherder
ingestion, Lando, hg-git sync, etc. These are rarer but can last longer.

**What to do:** Nothing you can do. Watch the `#sheriffs` Matrix channel for
updates. An incident might be open for a significant issue.

Merges (``merges``)
~~~~~~~~~~~~~~~~~~~

The tree is closed while sheriffs perform a merge (typically merging
autoland back to mozilla-central).

**What to do:** Wait — these are usually brief.

Planned Closures (``planned``)
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

Scheduled closures for known events such as toolchain updates or large
infrastructure migrations (e.g. the Git migration).

**What to do:** These are announced in advance. Plan your landings around
them.

Other (``other``)
~~~~~~~~~~~~~~~~~

Catch-all for unusual situations: backout requests, one-off machine
issues, or ad-hoc maintenance.

What Should I Do When the Tree Is Closed?
-----------------------------------------

* **Do** use the time to run try pushes, review patches, or work on other
  tasks.
* **Watch** the `#sheriffs` Matrix channel or the Lando treestatus page for
  reopening announcements.
* If your patch was backed out, the sheriff will file a comment on your bug
  with the failure details.

For a sheriff's perspective on how closure decisions are made, see
`Deciding To Close A Tree <https://wiki.mozilla.org/Sheriffing/Deciding_To_Close_A_Tree>`__.
