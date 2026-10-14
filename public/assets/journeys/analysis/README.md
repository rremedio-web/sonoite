# Journey Audio Analysis Data

Generated feature summaries from `npm run analyze:audio` live here. Each `*.analysis.json` file should contain the offline measurements for a single track:

- `features` → global stats (rms, loudness, chroma, etc.)
- `peaks` → notable loudness/centroid spikes (time/value pairs)
- `segments` → rolling averages for verse/chorus mapping

Keep raw output files in version control so journey tuning and QA can reference the exact analysis that informed the visuals.
