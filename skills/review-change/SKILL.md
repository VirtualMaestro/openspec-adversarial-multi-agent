---
name: opsx:review-change
description: Adversarial review of OpenSpec change artifacts before implementation.
             Runs five parallel critics (proposal, design, specs, tasks, consistency), then
             synthesizes a verdict. Usage: /opsx:review-change <path-to-change>
disable-model-invocation: true
---

## Setup

Set CHANGE_PATH = $ARGUMENTS (normalize: replace backslashes with forward slashes)
Set CHANGE_NAME = last segment of CHANGE_PATH
  (e.g. "openspec/changes/platform-integration" → "platform-integration")
Set REVIEW_DIR = /tmp/review-change/$CHANGE_NAME

Verify the following files exist, abort with error if any missing:
- $CHANGE_PATH/proposal.md
- $CHANGE_PATH/design.md
- $CHANGE_PATH/tasks.md
- $CHANGE_PATH/specs/ (directory)

Validate artifact quality (abort with error if validation fails):
- Check proposal.md is non-empty: test -s $CHANGE_PATH/proposal.md || abort "proposal.md is empty"
- Check design.md is non-empty: test -s $CHANGE_PATH/design.md || abort "design.md is empty"
- Check tasks.md is non-empty: test -s $CHANGE_PATH/tasks.md || abort "tasks.md is empty"
- Check specs/ contains at least one .md file: find $CHANGE_PATH/specs/ -name "*.md" | grep -q . || abort "specs/ contains no .md files"

Run: mkdir -p $REVIEW_DIR

---

## Phase 1 — Parallel critique (all five in background)

Launch all five critics simultaneously using the Agent tool with run_in_background: true

**Critic 1 — Proposal**
```
Agent tool:
  subagent_type: "opsx-critic-proposal"
  prompt: "Review the change at $CHANGE_PATH. Write your findings to $REVIEW_DIR/critique-proposal.md"
  run_in_background: true
  description: "Critique proposal"
```

**Critic 2 — Design**
```
Agent tool:
  subagent_type: "opsx-critic-design"
  prompt: "Review the change at $CHANGE_PATH. Write your findings to $REVIEW_DIR/critique-design.md"
  run_in_background: true
  description: "Critique design"
```

**Critic 3 — Specs**
```
Agent tool:
  subagent_type: "opsx-critic-specs"
  prompt: "Review the change at $CHANGE_PATH. Write your findings to $REVIEW_DIR/critique-specs.md"
  run_in_background: true
  description: "Critique specs"
```

**Critic 4 — Tasks**
```
Agent tool:
  subagent_type: "opsx-critic-tasks"
  prompt: "Review the change at $CHANGE_PATH. Write your findings to $REVIEW_DIR/critique-tasks.md"
  run_in_background: true
  description: "Critique tasks"
```

**Critic 5 — Consistency**
```
Agent tool:
  subagent_type: "opsx-critic-consistency"
  prompt: "Review the change at $CHANGE_PATH. Write your findings to $REVIEW_DIR/critique-consistency.md"
  run_in_background: true
  description: "Critique consistency"
```

**Wait for completion:**
Poll for all five critique files to exist with a 5-minute timeout per critic:
- $REVIEW_DIR/critique-proposal.md
- $REVIEW_DIR/critique-design.md
- $REVIEW_DIR/critique-specs.md
- $REVIEW_DIR/critique-tasks.md
- $REVIEW_DIR/critique-consistency.md

**Error handling:**
- If 1 critic fails (file missing or empty after timeout): proceed with 4 critiques, note missing critic in verdict
- If 2+ critics fail: abort review with error message listing which critics failed
- Validate each critique file is non-empty before proceeding to Phase 2

---

## Phase 2 — Verdict (main agent)

Read all five critique files:
- $REVIEW_DIR/critique-proposal.md
- $REVIEW_DIR/critique-design.md
- $REVIEW_DIR/critique-specs.md
- $REVIEW_DIR/critique-tasks.md
- $REVIEW_DIR/critique-consistency.md

For each issue raised by critics, mark it as:
- VALID — genuine problem, supported by evidence in artifacts, actionable
- NOISE — overly defensive, speculative, already addressed in artifacts, or outside critic's scope

**Decision Rules:**
- **STOP**: One or more VALID CRITICAL issues that represent fundamental flaws (contradicts existing specs, unsolvable problem, wrong problem being solved)
- **REVISE**: One or more VALID CRITICAL issues (implementation blockers), OR 3+ VALID MAJOR issues
- **GO**: Zero VALID CRITICAL issues AND fewer than 3 VALID MAJOR issues

**Confidence Calculation:**
- **HIGH**: Issues have clear evidence, multiple critics agree on related concerns, severity is unambiguous
- **MEDIUM**: Issues have evidence but some interpretation required, or critics disagree on severity
- **LOW**: Issues are speculative, evidence is weak, or critics found very little to critique

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

## Cleanup and Preservation

Preserve critique files for audit trail:
Run: mkdir -p $CHANGE_PATH/.review
Run: cp -r $REVIEW_DIR/* $CHANGE_PATH/.review/
Run: rm -rf $REVIEW_DIR

The critique files and verdict are now preserved in $CHANGE_PATH/.review/ for future reference.
