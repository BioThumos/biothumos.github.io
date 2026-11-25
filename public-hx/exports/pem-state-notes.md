# PEM / PEM-like state

Patient-described state model. These are charting categories, not verified physiologic mechanisms or automatically inferred episode sequences.

A source may explicitly describe a vulnerable/crashy warning, PEM-like malaise, or severe crash. The warning is not necessarily followed by a crash.

State qualities: poisoned feeling and malaise (sometimes without a demonstrated exertional trigger).
Independently tracked features: deep internal tingling/pulsing, light and sound intolerance. They may persist at baseline and intensify during episodes.

## Phase and quality markers (source-linked occurrence rows, not attacks)

- Crash vulnerability: 32. Warning state described as “crashy”; may abort.
- PEM-like state: 1017. Active state or patient PEM wording.
- Crash: 237. Explicit patient-described severe event.
- Poisoned quality: 283. Patient-described malaise quality; may occur without a full crash.
- Malaise quality: 44. General sick/unwell quality; exertional attribution not always established.

## Sensory features supported by patient accounts

- Light intolerance: Diary explicitly co-reports PEM and light/sound sensitivity. Source: diary_observations:S2-OBS-1065.
- Light intolerance: Diary explicitly co-reports PEM-like feeling and stronger light sensitivity. Source: diary_observations:S2-OBS-2447.
- Light intolerance: Diary explicitly co-reports mild PEM, tingling, poisoned feeling and stronger light sensitivity. Source: diary_observations:S2-OBS-3064.
- Light intolerance: Patient describes light sensitivity at baseline and severe exacerbation during crashes. Source: historical_entries:S3:symptom:023.
- Sharp head pain from noise: Patient reports sharp head pain from noise during severe episodes. Source: historical_entries:S3:symptom:023.
- Sound intolerance: Diary explicitly co-reports PEM and light/sound sensitivity. Source: diary_observations:S2-OBS-1065.
- Sound intolerance: Patient describes sound intolerance at baseline and severe exacerbation during crashes. Source: historical_entries:S3:symptom:023.
- Spinal shivering from bright light: 16-18 tingling and malaise/crashiness intensifying; bright screen is causing intermittent spine shudders; some cns fatigue/“lactate brain” as well; think i overdid it in the past ~2 days Source: diary_observations:R70-OBS-066.
- Spinal shivering from bright light: 16- some occipital headache, shuddering a bit from light, so i know pem baseline is getting a bit worse. overextending myself again Source: diary_observations:R70-OBS-083.
- Spinal shivering from bright light: Patient reports spine shivering in response to bright/white light during severe PEM/crashes. No separate timed episode is inferred. Source: historical_entries:S3:symptom:023.

Each marker retains its original occurrence ID in `pem-state-markers.json`. The original diary wording and timestamps remain in the native source records.

Retired directory entries `Feeling crashy`, `Poisoned feeling` and `Malaise / feeling unwell` remain source-linked as state qualifiers within this parent, not independent additive symptom counts.

Do not add daily counts of PEM and crash to estimate event frequency; a single day/entry can have several labels.
