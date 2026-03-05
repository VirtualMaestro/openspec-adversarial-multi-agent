---
name: opsx-review
description: Adversarial review of OpenSpec change artifacts before implementation.
             Runs four parallel critics (proposal, design, specs, tasks), then
             synthesizes a verdict. Usage: /opsx:review <path-to-change>
disable-model-invocation: true
---

## Setup

Set CHANGE_PATH = $ARGUMENTS (normalize: replace backslashes with forward slashes)
Set CHANGE_NAME = last segment of CHANGE_PATH
  (e.g. "openspec/changes/platform-integration" → "platform-integration")
Set REVIEW_DIR = /tmp/opsx-review/$CHANGE_NAME

Verify the following files exist, abort with error if any missing:
- $CHANGE_PATH/proposal.md
- $CHANGE_PATH/design.md
- $CHANGE_PATH/tasks.md
- $CHANGE_PATH/specs/ (directory)

Run: mkdir -p $REVIEW_DIR

---

## Phase 1 — Parallel critique (all four in background)

Launch simultaneously using background Task tool:

**Critic 1 — Proposal**
Use subagent `opsx-critic-proposal`, prompt:
"Review the change at $CHANGE_PATH.
Write your findings to $REVIEW_DIR/critique-proposal.md"

**Critic 2 — Design**
Use subagent `opsx-critic-design`, prompt:
"Review the change at $CHANGE_PATH.
Write your findings to $REVIEW_DIR/critique-design.md"

**Critic 3 — Specs**
Use subagent `opsx-critic-specs`, prompt:
"Review the change at $CHANGE_PATH.
Write your findings to $REVIEW_DIR/critique-specs.md"

**Critic 4 — Tasks**
Use subagent `opsx-critic-tasks`, prompt:
"Review the change at $CHANGE_PATH.
Write your findings to $REVIEW_DIR/critique-tasks.md"

Wait for all four subagents to complete before proceeding.

---

## Phase 2 — Verdict (main agent)

Read all four critique files:
- $REVIEW_DIR/critique-proposal.md
- $REVIEW_DIR/critique-design.md
- $REVIEW_DIR/critique-specs.md
- $REVIEW_DIR/critique-tasks.md

For each issue raised by critics, mark it as:
- VALID — genuine problem, supported by evidence in artifacts
- NOISE — overly defensive, speculative, or already addressed

Produce a verdict and write it to $REVIEW_DIR/verdict.md:
```
# OpenSpec Review Verdict: $CHANGE_NAME

## Decision
GO | REVISE | STOP
Confidence: HIGH | MEDIUM | LOW

## Blocking Issues (VALID CRITICAL)
- [issue] — from [critic]: [brief evidence]

## Should Fix (VALID MAJOR)
- [issue] — from [critic]: [brief evidence]

## Consider (VALID MINOR)
- [issue] — from [critic]

## Dismissed as Noise
- [issue] — reason dismissed
```

---

## Phase 3 — Present and act

Display verdict.md to the user in full.

If decision is GO: confirm ready for /opsx:apply
If decision is REVISE: list blocking and major issues, suggest edits
If decision is STOP: explain why implementation should not proceed

---

## Cleanup

Run: rm -rf $REVIEW_DIR