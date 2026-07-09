# Work notes — untangling supergroup's versions

Working notes for the maintainer, not user docs (see [README.md](README.md)
for what supergroup is). This file tracks the open problems surfaced from
downstream use, ahead of a clean release.

## The core problem: three divergent supergroups (discovered 2026-07-07)

There are effectively **three different codebases** all calling themselves
supergroup, and they don't agree:

| Where | Version | Style | State |
|---|---|---|---|
| Repo HEAD (`supergroup.js`) | header says 1.1.8, `package.json` says 1.1.9 | **prototype-based** (`function List(){}`, `.prototype.x=`) | no `dist/`; `main` → `supergroup.js`; last commit 2023-09 |
| npm `latest` | 1.1.9 | **class-based, transpiled** (Babel: `class`, `new.target`, array generics) | **BROKEN in every browser** (see below) |
| DrugExposureExplorer pins | 1.1.3 | class-based transpiled | same bug family; patched downstream |

So the repo source and the published 1.1.9 are **not the same program** — npm
1.1.9 was transpiled from some class-based source that is no longer in the repo
(repo HEAD is the older prototype-based line). `package.json` version (1.1.9)
also doesn't match the source header (1.1.8). This divergence is the root
cause of the DrugExposureExplorer build pain and needs untangling before any
clean release.

## The runtime bug (why published supergroup is browser-broken)

The class-based transpiled dist (npm 1.1.9, and 1.1.3) uses **Firefox-only
"array generics"** — `Array.map(this, …)`, `Array.filter(this, …)`, etc. —
which every non-Firefox engine dropped years ago (Firefox itself removed them
~2019). Any browser consumer crashes: on load for the eager call sites, or
lazily (blank charts) for the ones only hit on certain code paths. Six call
sites total.

**The fix** (verified working end-to-end in DrugExposureExplorer, 2026-07-07):
replace each generic with a `.prototype` call over a **copied** array —
```
(_ArrayN = Array).X.apply(_ArrayN, [this].concat(args))
   → Array.prototype.X.apply(Array.from(this), args)
Array.filter(this, filt)
   → Array.prototype.filter.call(Array.from(this), filt)
```
The `Array.from(this)` copy matters: because Supergroup subclasses Array, a
plain `Array.prototype.map.call(this, …)` recurses back into the species
constructor `new Supergroup()` and throws; copying to a plain array breaks that.

NB: the **repo-HEAD prototype-based source may not have this bug at all** (it
predates the class rewrite). Verify which lineage you actually want to ship
before patching — the right fix might be "publish the prototype-based source"
rather than "patch the transpiled dist."

## Known downstream consumers (check before releasing)

- **DrugExposureExplorer** — pins 1.1.3 and carries build/runtime patches for
  the bug above; a fixed release collapses those into `npm i supergroup@latest`.
- **TermHub / VS-Hub** — used supergroup (see the `hierarchicalTableToTree`
  performance giving-up commit in this repo's history, which references
  termhub). Confirm current usage + version before bumping.
- **Supergroup docs demo** (`sigfried.github.io/supergroup`) — loads its own
  copy; **likely browser-broken by the same array-generics bug**. NOT yet
  verified in a current browser — do that; if broken, it's arguably
  higher-priority than DrugExposureExplorer since it's public.

## What "update supergroup" should probably mean (unresolved)

Options, cheapest first:
1. **Minimal patch release (~1 hr):** just the 6 array-generics fixes + a
   correct `main`, cut a 1.1.10. Unbreaks DrugExposureExplorer and the public
   docs demo, no modernization. Requires first resolving *which source lineage*
   is canonical.
2. **Reconcile the divergence:** decide prototype-based (repo HEAD) vs
   class-based (npm) is the real one, delete the other, make `package.json`
   version / source header / npm agree.
3. **Full modernization (day+):** ESM build, current lodash story, tests,
   types. Its own project with its own dead ends — defer.
