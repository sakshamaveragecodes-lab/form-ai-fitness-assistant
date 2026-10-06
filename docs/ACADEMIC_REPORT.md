# AI Gym & Fitness Assistant — FORM

## Abstract

FORM integrates workout feedback, nutrition estimates, behavior tracking, conversation, connected equipment and recommendations in one account-based fitness application. A browser-local MediaPipe model extracts pose landmarks; deterministic geometry and motion states count repetitions and explain form feedback. A relational backend stores user-owned summaries, while transparent formulas produce nutrition, adherence and performance estimates. Demo fixtures and hardware simulation make the system demonstrable without external paid services. The work distinguishes neural pose extraction from rules, estimates and simulation.

## Problem and objectives

Fitness information is fragmented across workout videos, food diaries, reminders and equipment displays. A learner may record activity without understanding range of motion or consistency. The project aims to connect these records, give immediate understandable feedback, support practical planning, preserve privacy and provide measurable, reproducible results. It is an educational coaching tool, not a medical diagnostic system.

## Methodology

The source specification was decomposed into seven connected modules. Inputs and units were explicitly validated. Relational storage preserves ownership and references. Known-value fixtures test calculations; actual route handlers are exercised against SQLite created by the committed migration. The UI is inspected through user journeys and stored-data read-back. Model or hardware limitations are declared rather than masked by random outputs.

## System architecture and flow

See ARCHITECTURE.md for actual system, data-flow and entity diagrams. The browser hosts React views and a pose worker. An authenticated Worker API validates requests, checks role/ownership, calculates metrics and writes D1. Optional Python/MQTT processes send authenticated telemetry. Optional LLM requests are made server-side after explicit user opt-in. Video never crosses the network for pose scoring.

## Modules and algorithms

1. **Trainer:** 33-landmark MediaPipe output, visible working-side selection, angle smoothing, debounced extended/bent/extended state transitions, minimum/maximum cycle durations, geometric form cues and timed plank alignment. Six exercises are explicitly selected rather than automatically classified.
2. **Nutrition:** BMI, Mifflin–St Jeor BMR and activity-scaled TDEE; moderated goal targets, protein/fat/carbohydrate estimates; recipe exclusion and portion scaling. Sensitive profiles pause automated target advice.
3. **Equipment:** Deterministic simulation and an MQTT-to-HTTP bridge separated from physical devices. Device tokens, sequence checks, deduplication and bounded delivery retries protect ingestion.
4. **Habits:** Due-session completion, scheduled-session streaks and a transparent skip-risk index. The index is not a calibrated probability or a trained model accuracy claim.
5. **Buddy:** Contextual guided responses with lexical sentiment and safety routing; optional configurable LLM behind the server. Conversations persist by user.
6. **Performance:** Weighted form (35%), range (25%), tempo (15%), consistency (15%) and completion (10%). One-rep and plank cases use documented adjusted formulas.
7. **Recommendations:** Explicit goal/equipment/experience/schedule/recent-performance weights, rolling challenges and optional local geographic distance. Gym examples are fictional.

Full inputs, outputs, preprocessing, equations, evaluation and limitations are in ALGORITHMS.md. Python formula references provide a second-language parity check; no training dataset is required for the deterministic rules.

## Database design

The 18 application tables are `workspaces`, `users`, `sessions`, `profiles`, `catalog`, `workouts`, `schedule`, `nutrition_logs`, `diet_plans`, `chat_sessions`, `messages`, `notifications`, `devices`, `readings`, `challenge_joins`, `issues`, `audit` and `rate_limits`. UUID identifiers and ownership foreign keys connect records. Catalog kind distinguishes exercises, meals, plans, gyms, challenges and content. Session metrics/profile details are validated structured data; scalar ownership/status/time fields are indexed. Password hashes and token hashes are never returned in account snapshots.

## Requirements and security

Node 24, pnpm and a current browser run the complete local application. Python 3.12 is optional. Camera analysis requires a webcam and graphics-enabled secure browser. User and admin APIs enforce backend role checks and tenant scoping. Bound SQL, escaped rendering, same-origin mutations, input limits, hashed credentials, secure cookies, token rotation, audit entries, export and deletion address common application threats. SECURITY_PRIVACY.md documents practical limits.

## Testing and results

The executed results and evidence are in VERIFICATION.md. Tests cover known numeric outputs, rep cycles/low visibility, restrictions, recommendation behavior, authentication/session recovery, CSRF, role/tenant access, database operations and accessible form interactions. Browser checks cover populated demo journeys and persist changes. A passing fixture test proves the tested logic; it does not establish population-level pose accuracy or health benefit.

## Limitations and future work

A single side-view camera can miss occlusion and three-dimensional compensation. Form thresholds need labeled recordings and qualified trainer evaluation across diverse bodies and camera positions. Meal estimates require verified food composition and portion data for greater precision. Clinical cases need qualified professionals. Physical equipment, MQTT deployment and external AI credentials require operator configuration. Future work could add consented benchmark datasets, calibrated sensor integration, evaluated habit prediction, verified gym providers and clinically reviewed nutrition content.

## References

- User-supplied Trivion specification (SOURCE_REQUIREMENTS.md).
- MediaPipe Pose Landmarker: https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker
- Mifflin et al., resting energy expenditure equation: https://pubmed.ncbi.nlm.nih.gov/2305711/
- Cloudflare Workers/D1 documentation: https://developers.cloudflare.com/d1/
- Paho MQTT Python: https://eclipse.dev/paho/files/paho.mqtt.python/html/
- FastAPI documentation: https://fastapi.tiangolo.com/
