# Algorithm cards and evaluation

These modules deliberately separate a pretrained computer-vision model from deterministic product logic. No training accuracy, clinical validity or adherence-prediction accuracy is invented.

## 1. Pose trainer — pretrained CV plus geometry

**Purpose:** estimate visible movement and count selected exercises. **Input:** local camera frames. **Preprocessing:** MediaPipe Pose Landmarker Lite produces 33 normalized/world landmarks, visibility values and one-person tracking. Frames are transferred to a worker at about 11–12 Hz when inference is not busy. **Output:** landmarks, working-side joint angle, phase, rep metrics, valid plank duration and coaching cue.

The working side is selected explicitly or locked from aggregate visible-joint confidence. Relevant landmarks require visibility ≥0.65. Angles use world coordinates when available, otherwise normalized image coordinates. Angle = acos(dot(a−b,c−b)/(|a−b||c−b|)); degenerate vectors are rejected. Exponential smoothing uses 0.35 new + 0.65 previous angle. A threshold state must persist ≥120 ms. The cycle is extended → bent → extended, reversed for shoulder press. One completed cycle must last 0.8–20 seconds. Missing joints or gaps over 600 ms reset incomplete cycles.

| Exercise       | Joint                |        Bent threshold |   Extended threshold | ROM normalization |
| -------------- | -------------------- | --------------------: | -------------------: | ----------------: |
| Squat          | hip–knee–ankle       |                 <105° |                >155° |               75° |
| Push-up        | shoulder–elbow–wrist |                 <100° |                >150° |               70° |
| Curl           | shoulder–elbow–wrist |                  <65° |                >150° |               95° |
| Shoulder press | shoulder–elbow–wrist |                 <105° |                >155° |               65° |
| Lunge          | hip–knee–ankle       |                 <105° |                >155° |               70° |
| Plank          | shoulder–hip–ankle   | valid alignment ≥160° | horizontal side view |    not applicable |

Dynamic form uses trunk lean above 20° at 1.2 points/degree, or push-up alignment deviation beyond an 8° tolerance at 2 points/degree. Push-ups and planks also require a horizontal-body gate. These are limited geometric heuristics, not a comprehensive biomechanical assessment. Knee valgus, load balance, spinal curvature, pain, depth suitability and exercise identity are not reliably inferred.

ROM = clamp((maximum angle − minimum angle)/normalization ×100). Tempo receives 100 for a 2–6 second cycle, proportional reduction below 2 seconds and 12 points/second reduction above 6. Planks accumulate visible aligned time in approximately one-second metric buckets. A partial final bucket may be omitted from saved scoring; valid time and total session elapsed time differ.

**Evaluation:** deterministic geometry fixtures test all five dynamic exercises, static poses, missing landmarks, horizontal gating and plank timing. Browser compatibility checks actually initialize the bundled model and run inference on a blank frame. Synthetic replay is generated landmarks, not model recognition of a human. Physical-camera accuracy needs consented, independently annotated videos spanning body types, lighting, occlusion and movement variants. Compare rep count error, precision/recall of completed cycles, angle error against reference landmarks and feedback agreement with qualified coaches. There is no fabricated benchmark dataset or trained exercise classifier.

## 2. Nutrition — physiological equations and constrained recipe selection

BMI = kg / metres². Mifflin–St Jeor resting estimate = 10×kg + 6.25×cm −5×age + coefficient, where coefficient is +5 (male), −161 (female), or the midpoint −78 when unspecified; the unspecified option reports both endpoints. This coefficient is optional and is not a gender classification.

TDEE = BMR × activity multiplier (1.2 / 1.375 / 1.55 / 1.725). Fat-loss adjustment subtracts min(350 kcal, 15% TDEE), muscle-gain adds min(250 kcal, 10% TDEE), other goals keep TDEE. Target energy is never below estimated BMR. Protein = 1.6 g/kg, fat = 30% energy /9, carbohydrate = remaining energy /4. These are configurable starting assumptions, not individualized clinical prescriptions.

Targets and planning are paused for the user's clinical-guidance flag, minors (also rejected by adult-profile validation), and BMI <18.5 with a fat-loss goal. **Inputs:** age, coefficient, size, activity, goal, diet, allergies, ingredient exclusions, cuisine and meal frequency. **Outputs:** estimates, scaled meals, warnings, grocery quantities and stored intake progress.

Recipe filtering never relaxes selected allergens or vegan/vegetarian exclusions. Ingredient-name exclusions are literal comma/semicolon/newline-separated matching; they do not understand every synonym. Cuisine and meal slot can fall back among compatible meals. Recipe portions scale toward energy using a bounded factor of 0.5–2.5. Actual meal macro totals are shown and deviations are acknowledged. Recipe values are curated educational estimates; food logs accept packaging values for the entire consumed portion. Neither database labels nor string matching certify absence of cross-contamination.

**Evaluation:** hand-calculated reference cases, clinical pauses, impossible restriction sets, 2–6 meal schedules, strict filtering and grocery conservation. Python and TypeScript test the same numeric cases. Formula source: Mifflin et al., 1990, [PubMed 2305711](https://pubmed.ncbi.nlm.nih.gov/2305711/). Adult-scope context: [NIDDK planner](https://www.niddk.nih.gov/bwp). The 1.6 g/kg value is an explicit product assumption for generally healthy training adults, not a claim of a universally optimal target.

## 3. Equipment — deterministic advisory rules

**Inputs:** registered device, load, reps, set/rest duration, RPE, form proxy and optional heart rate. **Outputs:** intensity label, suggested resistance/rest, explanation and high-reading caution. Reduce load 10% for RPE ≥9 or form <65; consider +2.5% only after two low-effort (RPE ≤6), high-form (≥85) sets. Round to 0.25 kg. Rest =150 seconds for RPE ≥8, 90 for ≥6, otherwise 60. Heart rate >190 triggers a pause/check suggestion; it does not diagnose or use age-predicted zones.

The browser simulator and CLI fixtures are deterministic and labelled. Hardware form/RPE must be supplied by a calibrated device or operator; no nonexistent force/heart-rate sensor is claimed. Recommendations never actuate equipment. Physical control requires hardware interlocks, calibration and manufacturer approval beyond this software demonstration.

## 4. Habits — explainable index, not a trained probability

Only past due sessions in the last 28 days count as adherence evidence; future sessions and today's pending session are excluded. Weekly consistency = completed / due sessions from the last seven days. Streaks count consecutive scheduled sessions completed, so rest days do not break them. Replay sessions never contribute; demo sample history is labelled.

Risk index = clamp(45×missed fraction +25×min(days since real activity/7,1) +20×max(old completion rate−recent completion rate,0) +10 if recent low-energy wording, 0,100). Fewer than three due sessions produces a clearly labelled cold start. Preferred hour is the most frequent local hour in recent stored workouts. The weights are product assumptions, not calibrated statistics. Dynamic adaptation offers a future recovery-paced session with a rest-day buffer; the user controls saving/starting it. Nudges appear during visits; ICS export delegates timed notifications to a calendar app.

**Evaluation:** due/future separation, scheduled streaks, timezone boundaries, no-data behavior, mood increment and replay exclusion. Future research needs consented longitudinal attendance labels, a temporal train/test split, leakage controls, calibration curves and subgroup error analysis before claiming a predictive model.

## 5. Buddy — guided NLP or optional external LLM

**Inputs:** message, stored recent conversation and minimal fitness context. **Processing:** safety expressions first, then lexical sentiment with limited negation, topic matching and short follow-up resolution. Optional chat completion uses the configured server credential only after explicit account consent. Provider errors fall back to guided replies. **Outputs:** plain text, mode and simple sentiment tag; stored conversation supports continuity.

No clinical emotion recognition is claimed. Crisis/symptom/starvation/drug requests receive safety guidance rather than training advice. Rules and prompt instructions cannot guarantee perfect LLM safety. User-visible external mode is distinct from deterministic guided mode; no external-provider success is asserted without credentials. Evaluation includes context continuation, actual profile targets, safety phrases, persistent message ownership and provider-failure handling.

## 6. Pose-to-performance — transparent aggregation

For dynamic movements, score =35% mean form +25% mean ROM +15% mean tempo +15% repetition-duration consistency +10% completion. Consistency = clamp(100×(1−standard deviation/mean duration),0,100). Completion =min(actual reps/target reps,1)×100. A single rep omits consistency and divides remaining weighted sum by 0.85. No reps means no score. Planks use duration-weighted alignment 70% +target-hold completion 30%; ROM/tempo/rep consistency remain null. Manual logs also retain null form scores.

The API recomputes scores from submitted metrics, never accepts a client score field, and charts use persisted data. Weekly trends, same-exercise comparisons and selected-period exports are reproducible. Scores indicate heuristic captured movement quality, not general health, physiological efficiency or injury risk.

## 7. Recommender — content matching and optional distance

Goal match 35 points, experience 20, equipment availability 25, schedule fit 10 and recent performance suitability 10. Equipment-compatible plans sort first; each match explains its reasons. Challenges use stored session/minute/camera counts. Location is requested on action and remains in memory; Haversine distance sorts a labelled fictional demo catalog. There is no fabricated live gym database, rating feed or map integration. Administrators can manage real verified records; external provider replacement belongs behind this catalog contract.

Primary implementation reference: [MediaPipe Web Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker/web_js). Vendor model/runtime versions, hashes and licensing are recorded in `THIRD_PARTY_NOTICES.md`.
