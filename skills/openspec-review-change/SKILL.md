---
name: openspec-review-change
description: Adversarial review of OpenSpec change artifacts before implementation. Conditionally runs 2-5 parallel critics based on available artifacts (proposal, design, specs, tasks, consistency), then synthesizes a verdict. Usage: /openspec-review-change <path-to-change>
disable-model-invocation: true
---

## Setup

Set CHANGE_PATH = $ARGUMENTS (normalize: replace backslashes with forward slashes)
Set CHANGE_NAME = last segment of CHANGE_PATH
  (e.g. "openspec/changes/platform-integration" → "platform-integration")
Set REVIEW_DIR = $CHANGE_PATH/.review

Verify REQUIRED artifacts exist (abort with error if any missing):
- $CHANGE_PATH/proposal.md
- $CHANGE_PATH/tasks.md

Validate REQUIRED artifact quality (abort with error if validation fails):
- Check proposal.md is non-empty: test -s $CHANGE_PATH/proposal.md || abort "proposal.md is empty"
- Check tasks.md is non-empty: test -s $CHANGE_PATH/tasks.md || abort "tasks.md is empty"

Detect OPTIONAL artifacts and set flags:
- Check if design.md exists and is non-empty:
  if [ -f $CHANGE_PATH/design.md ] && [ -s $CHANGE_PATH/design.md ]; then HAS_DESIGN=true; else HAS_DESIGN=false; fi
- Check if specs/ directory exists and contains .md files:
  if [ -d $CHANGE_PATH/specs ] && find $CHANGE_PATH/specs -name "*.md" -type f | grep -q .; then HAS_SPECS=true; else HAS_SPECS=false; fi
- Set consistency flag (requires all 4 artifacts):
  if $HAS_DESIGN && $HAS_SPECS; then CAN_RUN_CONSISTENCY=true; else CAN_RUN_CONSISTENCY=false; fi

Run: mkdir -p $REVIEW_DIR

---

## Phase 1 — Red Team Critique (conditional launch based on available artifacts)

Launch red team critic agents in parallel to review the change artifacts. All agents should run in the background so they execute simultaneously.

**Critics to launch (conditionally):**

1. **Proposal Critic** (opsx-critic-proposal) — ALWAYS LAUNCH: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-proposal.md

2. **Design Critic** (opsx-critic-design) — LAUNCH IF $HAS_DESIGN is true: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-design.md

3. **Specs Critic** (opsx-critic-specs) — LAUNCH IF $HAS_SPECS is true: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-specs.md

4. **Tasks Critic** (opsx-critic-tasks) — ALWAYS LAUNCH: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-tasks.md

5. **Consistency Critic** (opsx-critic-consistency) — LAUNCH IF $CAN_RUN_CONSISTENCY is true: Review the change at $CHANGE_PATH and write findings to $REVIEW_DIR/critique-consistency.md

**Execution:**
- Launch each agent with run_in_background enabled ONLY if its condition is met
- Each agent should receive the full change path and output file path in its prompt
- Use descriptive labels for each agent launch (e.g., "Critique proposal", "Critique design")
- Build a list of expected critique files based on which critics were launched

**Wait for completion:**

Poll for critique files to exist with a 5-minute timeout per critic. Only wait for files from critics that were actually launched:
- $REVIEW_DIR/critique-proposal.md (always expected)
- $REVIEW_DIR/critique-design.md (expected if $HAS_DESIGN is true)
- $REVIEW_DIR/critique-specs.md (expected if $HAS_SPECS is true)
- $REVIEW_DIR/critique-tasks.md (always expected)
- $REVIEW_DIR/critique-consistency.md (expected if $CAN_RUN_CONSISTENCY is true)

**Error handling:**
- If 1 critic fails (file missing or empty after timeout): proceed with remaining critiques, note missing critic in verdict
- If 2+ critics fail: abort review with error message listing which critics failed
- Validate each expected critique file is non-empty before proceeding to Phase 2

---

## Phase 2 — Blue Team Verdict (main agent)

Read critique files that were generated (only read files from critics that were launched):
- $REVIEW_DIR/critique-proposal.md (always read)
- $REVIEW_DIR/critique-design.md (read if $HAS_DESIGN is true)
- $REVIEW_DIR/critique-specs.md (read if $HAS_SPECS is true)
- $REVIEW_DIR/critique-tasks.md (always read)
- $REVIEW_DIR/critique-consistency.md (read if $CAN_RUN_CONSISTENCY is true)

**Blue Team Filtering Protocol**

**Your role:** Active defender. Critics are instructed to assume artifacts are flawed and hunt aggressively for problems. Your job is to validate each claim against actual artifact text before accepting it.

**Validation Process (apply to each critic issue):**

1. **Locate Evidence:** Find the exact artifact text the critic references. If the critic doesn't cite specific text, search for it yourself.

2. **Verify Claim:** Does the artifact actually contain the flaw described?
   - YES → Proceed to step 3
   - NO → Mark as NOISE (critic misread or hallucinated)
   - PARTIALLY → Check if artifact addresses it elsewhere

3. **Check Coverage:** Search all relevant artifacts for contradicting evidence
   - Is this already addressed in another section?
   - Does design.md resolve what proposal.md left open?
   - Do specs/ provide the detail the critic claims is missing?

4. **Validate Severity:** Does the issue's impact match the critic's severity rating?
   - CRITICAL: Blocks implementation OR contradicts existing specs OR solves wrong problem
   - MAJOR: Significant rework needed OR creates technical debt OR missing key requirements
   - MINOR: Polish, optimization, or nice-to-have improvements

5. **Assess Actionability:** Can this be fixed with concrete changes?
   - Vague complaints ("needs more detail") without specifying what detail → NOISE
   - Specific gaps ("missing error handling for X scenario") → VALID

**Mark each issue as:**
- **VALID** — Verified in artifact text, within scope, severity justified, actionable
- **NOISE** — One or more validation checks failed (see patterns below)

**Common False Positive Patterns (mark as NOISE):**

- **Speculation:** "This might cause issues if..." without evidence it will
- **Out of scope:** Critiquing implementation details when only design exists, or questioning business decisions in technical artifacts
- **Already addressed:** Issue raised about proposal.md but resolved in design.md or specs/
- **Misreading:** Critic claims X is missing, but X is present in artifact
- **Subjective preference:** "Should use pattern Y instead of Z" without technical justification
- **Premature optimization:** Performance concerns without evidence of actual bottleneck
- **Vague demands:** "Needs more detail" without specifying what's insufficient
- **Scope creep:** Demanding features beyond the change's stated goals

**Severity Downgrade Triggers:**

- Critic marks CRITICAL but issue is fixable without redesign → Downgrade to MAJOR
- Critic marks MAJOR but issue is cosmetic or stylistic → Downgrade to MINOR
- Critic marks any severity but provides no evidence → Mark as NOISE

**Examples:**

✅ **VALID CRITICAL:** "Proposal states 'backward compatible' but design.md removes required field 'user_id' from API response (line 47). Existing clients will break."
- Evidence: Specific line cited, contradiction verified
- Severity justified: Breaking change contradicts compatibility claim
- Actionable: Either restore field or revise compatibility claim

❌ **NOISE:** "The authentication flow might have race conditions under high load."
- Speculation: No evidence of actual race condition
- Vague: Doesn't identify specific race condition scenario
- Out of scope: Performance testing not part of design review

✅ **VALID MAJOR:** "Tasks.md includes 'Implement caching layer' (task 7) but design.md has no caching architecture. Implementation will require design decisions not documented."
- Evidence: Gap verified between tasks and design
- Severity justified: Missing design will block implementation
- Actionable: Add caching design section

❌ **NOISE:** "Proposal doesn't mention monitoring strategy."
- Already addressed: Check if design.md or specs/ cover monitoring
- Scope: Monitoring may be handled by existing infrastructure
- Vague: Doesn't specify what monitoring is needed

✅ **VALID MINOR:** "API spec uses inconsistent naming: 'userId' in endpoint A, 'user_id' in endpoint B (specs/api.md lines 23, 67)."
- Evidence: Specific inconsistency cited with line numbers
- Severity justified: Cosmetic issue, doesn't block implementation
- Actionable: Standardize naming convention

**Confidence Assessment:**

After filtering, assess your confidence in the verdict:
- **HIGH:** Clear evidence for all VALID issues, multiple critics agree on related concerns, severity is unambiguous
- **MEDIUM:** Some interpretation required, or critics disagree on severity, or limited artifact coverage (only 2-3 critics ran)
- **LOW:** Weak evidence, heavy speculation from critics, or very few issues found (critics struggled to find problems)

**Decision Rules:**
- **STOP**: One or more VALID CRITICAL issues that represent fundamental flaws (contradicts existing specs, unsolvable problem, wrong problem being solved)
- **REVISE**: One or more VALID CRITICAL issues (implementation blockers), OR 3+ VALID MAJOR issues
- **GO**: Zero VALID CRITICAL issues AND fewer than 3 VALID MAJOR issues

Produce a verdict and write it to $REVIEW_DIR/verdict.md:
```
# OpenSpec Review Verdict: $CHANGE_NAME

## Review Coverage
Critics run: [list critics that ran, e.g., "Proposal, Design, Tasks"]
Artifacts reviewed: [list artifacts, e.g., "proposal.md, design.md, tasks.md"]
Skipped critics: [list with reasons, e.g., "Specs (no specs/ directory), Consistency (requires all artifacts)"]

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

Provide a coverage summary explaining which critics ran and which were skipped:
- Example: "Ran 2 critics: Proposal, Tasks. Skipped: Design (no design.md), Specs (no specs/), Consistency (requires all artifacts)"
- Example: "Ran all 5 critics: Proposal, Design, Specs, Tasks, Consistency"
- Example: "Ran 4 critics: Proposal, Design, Tasks, Consistency. Skipped: Specs (no specs/)"

If decision is GO: confirm ready for /opsx:apply
If decision is REVISE: list blocking and major issues, suggest edits
If decision is STOP: explain why implementation should not proceed

---

The critique files and verdict are preserved in $CHANGE_PATH/.review/ for future reference.
