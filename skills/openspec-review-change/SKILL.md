---
name: openspec-review-change
description: Adversarial review of OpenSpec change artifacts before implementation. Runs five parallel critics (proposal, design, specs, tasks, consistency), then synthesizes a verdict. Usage: /openspec-review-change <path-to-change>
disable-model-invocation: true
---

## Setup

Set CHANGE_PATH = $ARGUMENTS (normalize: replace backslashes with forward slashes)
Set CHANGE_NAME = last segment of CHANGE_PATH
  (e.g. "openspec/changes/platform-integration" → "platform-integration")
Set REVIEW_DIR = $CHANGE_PATH/.review

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

Launch five critic agents in parallel to review the change artifacts. All agents should run in the background so they execute simultaneously.

**Critics to launch:**

1. **Proposal Critic** (opsx-critic-proposal): Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-proposal.md

2. **Design Critic** (opsx-critic-design): Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-design.md

3. **Specs Critic** (opsx-critic-specs): Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-specs.md

4. **Tasks Critic** (opsx-critic-tasks): Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-tasks.md

5. **Consistency Critic** (opsx-critic-consistency): Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-consistency.md

**Execution:**
- Launch all five agents with run_in_background enabled
- Each agent should receive the full change path and output file path in its prompt
- Use descriptive labels for each agent launch (e.g., "Critique proposal", "Critique design")

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

The critique files and verdict are preserved in $CHANGE_PATH/.review/ for future reference.
