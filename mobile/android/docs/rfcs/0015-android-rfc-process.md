# Summary

Define a lightweight RFC ("request for comments") process for proposing and discussing "substantial" changes and for building consensus across Android, including `android-components`, GeckoView, Fenix, and Focus.

# Rationale

The existing RFC process (and its update) is not serving the team.  Few team members view the existing process as a part of the day-to-day life of the team, as evidenced by the fact that 2025 has been a year of change within the Android team and yet 0 RFCs have been proposed.

There are multiple reasons to change the existing process now.  First, changes in product direction demand an updated process.  In particular, the existing RFC process centers `android-components` and has not grown to incorporate Fenix after the monorepo; now that Fenix is the Android team's priority, that simply doesn't feel appropriate.

Second, changes in technical leadership within the team deserve an updated process.  The technical stewards of the Android team -- principal and senior staff engineers -- want a process that emphasizes technical thought and building shared context before proposing solutions, but the existing process emphasizes proposed solutions.  We believe strongly in expanding the circle of readers incrementally to better integrate feedback, but the existing process is "open" in the sense that RFCs are brought forward as pull requests and everybody at Mozilla and in the surrounding community is able (if not invited) to comment.

In response, we propose relatively minor changes to the existing process.

* Multiple documents for multiple audiences.  We want a process that starts with a short problem statement (1-pager) introducing a technical challenge and explaining why an RFC may be warranted.
* Deliberately expand the circle of feedback.  We want a process that elicits feedback in stages.  Consider writing your brief with a co-sponsor to help you enunciate your ideas.  We encourage you to solicit early feedback from a small group of peers (potentially your squad and engineers from related teams that you are working with) before presenting your thinking to the team as a whole.  Get feedback from likely critics to course correct early.
* Acknowledge that the stakeholders of record have changed.  The Android technical stewards are responsible for the technical evolution of Firefox for Android, and as such we are the stakeholders in the RFC process.
* De-emphasize code review tooling as the "RFC interface".  We will focus less on review requests in Phabricator and review from all engineers in favour of early conversations and internal documents.  We intend to continue to land RFCs that are adopted into `firefox-main` and `firefox-source-docs`, following successful patterns from GeckoView and `application-services`.

# Motivation

The existing workflow of opening and reviewing pull requests is fully sufficient for many smaller changes.

For substantially larger changes (functionality, behavior, architecture), an RFC process prior to writing any code may help with:

* Discussing a change proposal with other maintainers and consumers of components.
* Gathering and integrating feedback into a proposal.
* Documenting why specific changes and decisions were made.
* Building consensus among teams before potentially writing a lot of code.

A change is substantial if it

* affects multiple components;
* affects how components interact through either their public or internal APIs;
* fundamentally changes how a component is implemented, how it manages state or reacts to changes, in a way that isn't self-explanatory or a direct result of a bug fix.

There is a tension between pursuing any RFC process and experimenting at small scales to prove out technical approaches.  We encourage potential RFC authors to experiment within bounded areas to gain understanding of a problem space and possible solutions before, or concurrently to, starting the RFC process.

# Guide-level explanation

The high-level process of creating an RFC is:

* Talk directly to technical stewards (RFC approvers) to determine whether it is worth investing time on the problem.  Find people who have context on the area of concern and talk to them about the problem.  Use their input to inform your ideas for possible solutions.
* Write a brief or 1-pager motivating the problem as worthy of an RFC.
* Solicit feedback from team-mates, engineers on impacted teams, and Android technical stewards to determine if an RFC is appropriate.  We anticipate that collected feedback will be incorporated into the brief (and potentially other supporting materials) and encourage sharing this early thinking broadly through appropriate communication channels (mailing lists, Matrix, Slack, etc).
* Create an RFC document (like this one) using the [template](https://searchfox.org/firefox-main/source/mobile/android/docs/rfcs/0000-template.md).  Link to your brief as the Motivation section.
* Solicit feedback a second time, generally from Android technical stewards.  This might be by opening a pull request for the RFC document, but is not required.

During the lifetime of the process:

* Build consensus and integrate feedback.

After the feedback phase has concluded:

* Android technical stewards will accept or reject the RFC.
* If changes are agreed upon, the RFC is "accepted" and a version of the RFC will get merged into the repository for documentation purposes.
* If all changes proposed are dismissed, the RFC is "rejected".  It may get revived should the requirements change in the future.  Some RFCs have substantial explanatory value even when rejected, and we anticipate that certain RFCs will be added to `firefox-source-docs` in a `rejected` folder for ease of future reference.

Once the RFC is accepted, implementation may begin.

# Drawbacks

* Writing an RFC is an additional overhead and may feel slower or cumbersome. To drive down this cost, we ask for multiple documents for multiple audiences: a lightweight brief or 1-pager to understand the problem area and gauge interest before committing to a full RFC.
