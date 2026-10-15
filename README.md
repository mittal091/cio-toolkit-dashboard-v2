# CIO Toolkit Dashboard (modular)

Plain HTML, CSS and JavaScript modules. No framework, no build step. All data is illustrative.

## Run it
The page loads JSON with `fetch`, so it needs a web server (opening the file directly will not work).
- `python -m http.server` or `npx serve .` in this folder, then open http://localhost:8000
- Tests: `node tests/check.mjs` (consistency) and `node tests/parity.mjs` (matches the original single file)

## How it is organised
- `config/views.json`: each view is a list of blocks (tiles, chart, table, row, note, ask)
- `config/roles.json`: roles, and which roles can see which data domain
- `data/Kxx.json`: one file per KPI (series, metrics, markers). `data/datasets/`: tables. `data/ask.json`: questions and answers
- `components/`: pure functions that turn data into HTML. They never fetch data
- `data-access.js`: the only file that knows where data comes from (swap it for an API later)

## Add a KPI to an existing view
1. Run `python tools/build-kpis.py <catalogue.xlsx>` so `config/kpis.json` has the KPI.
2. Add `data/Kxx.json` with a `domain`, and `series` or `metrics`. List it in `data/index.json`.
3. Add a block (for example a tile `{ "kpi": "Kxx", "metric": "..." }`) to the view in `config/views.json`.
4. Run `node tests/check.mjs`.

## Add a view
1. Add an entry to `config/views.json` with `id`, `name`, `roles`, `accessText` and `blocks`.
2. Add a role in `config/roles.json` only if the audience is new.
3. Run `node tests/check.mjs`. The tab appears for the allowed roles.

## Notes
- Numbers are stored once. Use tokens in text: `{{K17:mttr:last}}` (series) or `{{K07:vsW8}}` (metric).
- Refusals in Ask follow the selected role, not the view. Try the finance role on the vulnerability question.
