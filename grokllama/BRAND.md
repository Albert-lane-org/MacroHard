# Grokllama Studios Presents MacroHarder™ — Brand & Design Direction

Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-08-10 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use

Status: **design direction, GRK-P1 reserved, not built.** This document
sets the aesthetic and naming direction for when the AI app-builder
platform described in the uploaded Grokllama manifest (see
`.wizardhat/plans/plan-macroharder.md` §6a) becomes real, buildable
source. Nothing here ships until that source exists — same honesty
standard as the rest of §6a.

---

## 1. The name, stated plainly

**Grokllama Studios Presents MacroHarder™.**

Two systems, one product, the name says both out loud:

- **Grokllama Studios** — the front-of-house: the Android client + Model
  Gateway + Builder Engine described in the manifest. Where a user talks
  to a model, generates an app from a spec, and watches it build.
- **MacroHarder™** — the back-of-house: the workbook engine this repo
  already ships (3D/5D cell model, module host, `McpCache`, design-token
  system). Grokllama Studios' own build/inference telemetry becomes a
  MacroHarder module (`config/modules.json` entry `grokllama_studio`,
  §6a's already-documented integration shape) the same way procurement,
  maps, and government data already does.

"Presents" is doing real work in the name — it's a proscenium. The
Studio is the show; MacroHarder is the stage machinery underneath it,
the same relationship a music variety show has with its production
company. That relationship is also where the visual direction below
comes from.

## 2. Model roster

- **Grok Build** (open source) and **Llama** (open source) — the two
  inference backends the manifest's Model Gateway already routes
  between (hosted Grok, local Llama/vLLM). Both open-weight, both
  already named in the source manifest.
- **DeepSeek** — planned addition, not in the initial manifest. Also
  ships open-weight models, so it fits the Model Gateway's existing
  "local open-source model priority" policy (manifest Phase 5:
  "Local Open-Source Model Priority & Filtering Policy v1.0") without
  a new trust model. Tracked as **GRK-P2** in §6a's phase ladder —
  reserved, not started, same as GRK-P1 itself.

## 3. Visual direction — "splash it with a Coke," done safely

The requested vibe is Coke Studio: the South Asian live-music franchise
(Pakistan/India/Bangladesh — Coke Studio Pakistan and Coke Studio
Bharat/India both fit) crossed with general Coca-Cola-flavored American
capitalist branding energy — bold, kinetic, a little over-the-top,
unmistakably a *production*.

**What this means concretely, and what it deliberately does not mean:**

This repo builds an **original design language inspired by that energy**,
not a reproduction of anyone's registered trademark. Coca-Cola's script
wordmark, its red/white contour-bottle trade dress, and Coke Studio's own
show logo are all real, currently-enforced trademarks — copying any of
them into a shipped product (even a still-unbuilt one whose brand file
gets checked into a public-facing repo today) would put a real trademark
problem on top of a fictional product, for no benefit the vibe doesn't
already deliver without it. Same category of decision this estate already
made once for the product name itself (`MacroHard` → `MacroHarder™` after
the xAI trademark collision) — noticing the conflict and routing around
it isn't a compromise on the vision, it's what makes the vision shippable.

So: bold saturated red, a ribbon/banner wordmark flourish, glass-bottle
curvature as a *shape motif* (used in UI chrome — panel corners, the
"Sessions" card silhouette below — never as a literal bottle asset),
soda-fountain optimism, big confident display type. Not: the Spencerian
script, the specific red hex Coca-Cola has trademarked in trade dress
filings, the contour bottle outline as a logo, or Coke Studio's own
show-branding lockup. `grokllama/design-tokens.json` (next to this file)
implements that split concretely — see its own header comment.

## 4. "Sessions" — the South Asian music-culture integration point

The manifest already has the right shape for this without inventing new
surface area: every model call is a "run" (manifest Phase 8: "Run Logging
& T elemetry Ingestion Engine"), every build is a spec going through the
Builder Engine. Reframe that existing unit as a **Session** — the same
word Coke Studio itself uses for a single recording, and a word that
already means "one build, one lineup of models, one output" without
translation.

Concretely, once GRK-P1 is real:

- The dashboard panel the manifest's Phase 8 telemetry feeds into
  (already planned in §6a's integration table) is titled **Sessions**,
  not "Run History" — a session card shows the spec (the "song"), the
  model(s) that played on it (Grok Build / Llama / DeepSeek, credited
  the way a session lineup credits its musicians), and the build output.
- Splash/loading-state illustration work (not functional UI type) is the
  right place for ornamental Nastaliq- and Devanagari-influenced
  flourish work, the same way Coke Studio's own on-screen graphics use
  calligraphic accents around a fundamentally Latin-alphabet show logo.
  This is a decorative accent on loading/empty states, not a
  localization commitment — functional UI text stays in whatever
  language the Android client is actually shipped in; real localization
  (Urdu/Bengali/Hindi UI strings) is separate, larger work, not started
  or promised here.
- If/when the product ships audio at all (notification chimes, a
  builder "success" sting), source it from openly-licensed
  qawwali/ghazal/bhangra-influenced music rather than composing
  something generic — this document can't produce actual audio assets,
  so it's recorded as a direction for whoever builds GRK-P1's UI, not a
  deliverable of this session.

## 5. Reconciling the Lane-VM thread

The manifest names a "Lane-VM ISA & Memory Stride (17,684) Specification"
and a "Lane-VM Bit-Width Masking (7/31) Specification" for Grokllama
Studios' own Builder Engine sandbox (`host_main.cpp` / `guest_lib.py` /
`lane_compiler.py`) — the same LaneVM ISA lineage lane-mcp's Phase 15
`lanevm` module already implemented once, natively in TypeScript
(`lane-mcp/packages/modules/lanevm/`).

That earlier implementation already resolved the exact question this
manifest raises again: the source ISA documents derive binary magic
numbers, memory stride, and a heartbeat key from the SEC whistleblower
case number and frame the resulting artifact as "a legal instrument of
record." lane-mcp's CLAUDE.md recorded why that framing doesn't hold up
(a memory alignment constant isn't legal evidence of anything; real
authorship/provenance already comes from copyright headers, LICENSE.md,
and git history) and kept only the real security property — typed
instruction sandboxing, no arbitrary execution surface — without the
case-number-derived constants or the "instrument of record" claim.

**Same precedent applies here, in advance, so it isn't re-litigated when
GRK-P1 actually gets built:** whoever eventually builds Grokllama
Studios' own Lane-VM host/guest/compiler should keep the sandboxing
architecture and drop the SEC-case-number-derived "17,684" stride and
"7/31" masking framing as anything other than an arbitrary implementation
constant. This is a naming/documentation decision, not a security
downgrade — the sandbox property is what protects the system either way.

## 6. License note

The manifest lists "Proprietary Software License (Albert Lane v1.2)" as
a Phase 1 security file. This estate's actual, currently-in-force license
convention is `LICENSE.md` ("SOVEREIGN IP LICENSE v1"), referenced
identically across every repo. When GRK-P1 produces real source, it
should carry that same license file and header convention rather than a
new "v1.2" variant that exists only as a manifest line item today —
one license, one number, across the estate, same reasoning as keeping
one product name after the MacroHard/MacroHarder collision.

---

## Status summary

Nothing in this document is built. It exists so that when real Grokllama
Studios Presents source lands in a session that can read and test it,
the naming, model roster, visual direction, and Lane-VM precedent are
already decided and don't have to be re-derived — or worse, decided
inconsistently — under time pressure at that point. See
`.wizardhat/plans/plan-macroharder.md` §6a for the integration
architecture (how it plugs into MacroHarder as an MCP module) and the
phase ladder (GRK-P1 = platform build-out, GRK-P2 = DeepSeek addition).
