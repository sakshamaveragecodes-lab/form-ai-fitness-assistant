# Specification traceability

Source: `4870257-AI_Gym_Fitness_Project_-_Trivion.pdf`, supplied at https://drive.google.com/file/d/1zdkK8YZxpsnmkzRFws91QibNus7ZzXGJ/view . The entire source was read and reread for the final audit alongside the user's expanded master build requirements.

| Source module / requirement      | Implementation                                                                              | Verification / constraint                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| AI gym trainer                   | Local MediaPipe, six selected exercises, joint angles, form cues, reps/sets/history         | Geometry fixtures and browser replay; cloud browser lacks WebGL 2/physical camera  |
| AI dietician/calorie coach       | BMI, Mifflin BMR, TDEE, macro targets, restricted meal selection, portions, diary/groceries | Numerical tests, restrictions tests, persistent browser food log/meal plan         |
| Smart gym AI + IoT               | Equipment identity, readings, safe advice, scoped ingestion, MQTT bridge and simulators     | API/device tests, Python protocol validation, real HTTP simulator check            |
| Fitness habit tracker            | Due-session adherence, streak, explainable risk, nudges, reminders, adaptive schedule       | Boundary fixtures, calendar save and dashboard read-back                           |
| Virtual gym buddy                | Persisted context, lexical sentiment, guided fallback, optional private server LLM          | Safety/context tests and browser conversation; external LLM unconfigured           |
| Pose-to-performance              | Weighted observed metrics, progress charts, comparisons and dated export                    | Known-value fixtures, browser charts; no invented model accuracy                   |
| Gym recommender/planner          | Goal/equipment/history/time matching, challenges and local distance sorting                 | Ranking/distance tests and browser recommendations; fictional gym dataset labelled |
| User/admin application           | Auth/recovery/onboarding, settings, export/delete, content/users/devices/issues/audit       | Real route tests, role/tenant isolation, browser demo/admin screens                |
| Modular API and database         | Route/service separation, 18 relational tables, indexes, FK constraints and migrations      | Fresh migration and idempotence checks; real SQLite-backed API tests               |
| Documentation/testing/deployment | README, diagrams, algorithm cards, academic report, CI, containers and release package      | Evidence in VERIFICATION.md and docs/evidence                                      |

The proposed React/Python/PostgreSQL stack was adapted to the available Worker/D1 deployment environment. React/TypeScript and a relational database are integrated in the live app; a real tested FastAPI service and Python reference calculations are included for integration/academic work. No trained skip classifier, TensorFlow model, OpenPose deployment, live gym API or hardware measurement is claimed. Deterministic scoring is documented as such. Browser registration/password workflows are tested through API and component tests; no user credentials were entered into the remote browser.
