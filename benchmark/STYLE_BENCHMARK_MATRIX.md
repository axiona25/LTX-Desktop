# AXSTUDIO Style Benchmark Matrix

Use this matrix to compare styles with the same content prompts.

## Required Scores

Each generated image should be reviewed from 1 to 5:

| Score | Meaning |
|---|---|
| 1 | Broken or unusable |
| 2 | Major visible problems |
| 3 | Acceptable but not production default |
| 4 | Good production candidate |
| 5 | Strong default candidate |

## Metrics

| Metric | What to Check |
|---|---|
| Quality | Overall resolution, clarity, artifacts, polish |
| Style fidelity | Output is clearly in the selected style and not another style |
| Anatomy | Face, eyes, hands, limbs, body proportions |
| Composition | Subject readable, correct framing, no key crop errors |
| Color | Palette matches style, no muddy or random color logic |
| Background | Environment coherent and not noisy |
| Prompt fidelity | User content preserved |

## Test Matrix

| Test ID | Prompt Type | Required Styles |
|---|---|---|
| portrait | Clear face / eyes | All priority styles |
| full_body | Full body / hands | All priority styles |
| two_subjects | Multi-subject consistency | All priority styles |
| interior | Indoor environment | All priority styles |
| exterior | Outdoor environment / vehicle | All priority styles |
| object | Product/object readability | All priority styles |
| face_closeup | Eyes, nose, mouth stress test | All priority styles |
| action | Motion/action readability | All priority styles |
| consistency | Same subject across seeds | All priority styles |

## Output Record

Every benchmark run should save:

- prompt
- style id
- style label
- seed
- steps
- guidance
- output path
- quality score
- style fidelity score
- anatomy score
- composition score
- color score
- known errors
