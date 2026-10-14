# Documentation index

These are the working documents from the private repository, kept as the record of decisions, trials and review rounds. Most are dated and describe the state on that date. Where a document reads as current but was later superseded, a status line under its title says so.

## Start here

1. [`qa/END_GOAL_AND_PRODUCT_RESET.md`](qa/END_GOAL_AND_PRODUCT_RESET.md): what the product is, and the March 2026 reset that replaced the particle "void" direction.
2. [`qa/MUSIC_INTERACTION_MATRIX.md`](qa/MUSIC_INTERACTION_MATRIX.md): the reactivity doctrine (70 % authored arc, 25 % breathing, 5 % audio punctuation).
3. [`qa/AUDIT_LAST_2_MONTHS_2026-10-01.md`](qa/AUDIT_LAST_2_MONTHS_2026-10-01.md): the latest state audit, with a note on what was fixed afterwards.
4. [`qa/track5-ledger-2026-10-02/LEDGER.md`](qa/track5-ledger-2026-10-02/LEDGER.md): the Track 5 state-ledger trial. The same folder holds its measured `RESULTS.md` and three review rounds (A, B, C), each with the prompt and two independent reviews.
5. [`qa/aesthetic-review-round2-2026-10-01/SYNTHESIS.md`](qa/aesthetic-review-round2-2026-10-01/SYNTHESIS.md): where the two reviewer models agreed and disagreed on the current films, and the fixes they proposed (built as Track 4 ledger v2; see [`qa/track4-ledger-2026-10-01/RESULTS.md`](qa/track4-ledger-2026-10-01/RESULTS.md)).

## Layout

| Path | Contents |
|---|---|
| `images/` | Screenshots used by the top-level README. |
| `qa/END_GOAL_*`, `qa/MUSIC_INTERACTION_MATRIX.md` | Product definition and reactivity doctrine (March 2026). |
| `qa/FULL_THEME_AUDIT_2026-06-06.md` | June baseline audit, partly superseded. |
| `qa/AUDIT_LAST_2_MONTHS_2026-10-01.md`, `qa/FIX_SPEC_AUDIT_P1_2026-10-01.md` | October audit and the fix spec that resolved its P1 batch. |
| `qa/TRACK1_*`, `qa/TRACK4_*`, `qa/TRACK5_*` | Per-track specs, studies and trial reports (August to October 2026). |
| `qa/EXPERIENCE_FOUNDATIONS_*`, `qa/PHYSICAL_AMBIENCE_*`, `qa/BLENDER_MATERIAL_*`, `qa/THREE_CINEMATIC_PROPOSALS_*`, `qa/STAGE_HYBRID_*` | September work: the navigation and audio-accent fixes (now part of the default runtime), plus opt-in trials of the physical room, a material candidate and the four cinematic proposals. None of the trials is owner-adopted. |
| `qa/FABLE51_*` | September briefing for Claude Fable 5.1 as reviewer (a newest-first log of the trials), and the record of its direction recommendation. |
| `qa/GEMINI_LISTENING_BRIEF_*`, `qa/gemini-listening-2026-10-01/` | The brief for Gemini's listening pass, and its results graded against measurements of the masters. |
| `qa/aesthetic-second-opinion-2026-10-01/`, `qa/aesthetic-review-round2-2026-10-01/` | Independent review rounds: one prompt, a Fable review, an Astra review and a synthesis. |
| `qa/track4-ledger-2026-10-01/`, `qa/track5-ledger-2026-10-02/` | The October state-ledger trials (opt-in, not adopted): measured results, Track 4's graded edit points, Track 5's ledger and review rounds A to C. |
| `qa/aesthetic-deep-dive-2026-09-07/`, `qa/external-reference-research-2026-09-07/` | Archive review and external reference research. |
| `qa/shadow-drape-2026-09-07/`, `qa/track1-light-sequence-2026-09-07/`, `qa/track1-reference-reset-2026-09-08/` | Track 1 Stage trials. |
| `qa/perceivability/` | June–July Track 5 perceivability passes: baseline numbers and seek protocol, Pass 1b evidence, parked ideas. |
| `superpowers/specs/`, `superpowers/plans/` | June–July design specs and an implementation plan, written in the format of the Claude Code "superpowers" plugin (hence the folder name). |

Reviewer names: Fable is Claude Fable 5.1 (`claude-fable-5-1`), Astra is GPT-6 Astra (`gpt-6-astra`).

## Reading notes

- Paths under `~/Documents/...`, `/private/tmp/...` and the `<repo>` placeholder refer to the author's local evidence folders and working copy. They are not published. The same applies to local URLs such as `http://sonoite.local/`, `http://localhost/homem/` and `http://127.0.0.1:8765/` (the author's local WordPress sites and an ad-hoc static review server).
- Mentions of "uncommitted" work or of `experiment/*` branches refer to the private repository. All of that work was committed before this snapshot was cut at Prompt #247.
- Documents cite other documents and evidence files that were left out of this snapshot (session logs, superseded audits, pre-reset creative documents). Where a link would have been broken, the file name is shown as plain text.
- Line numbers, bundle hashes and test counts in dated documents describe the code at the time. Check current code before acting on a finding.
