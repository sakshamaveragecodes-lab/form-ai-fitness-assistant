# FORM API reference

The application serves REST JSON under `/api`. Errors use `{ "error": "friendly description" }` and appropriate 400/401/403/404/409/413/422/429/500 status codes. Unexpected errors return a support reference without a stack trace. The optional FastAPI service publishes OpenAPI at `/docs`.

Browser mutations send `Content-Type: application/json` and `X-Form-Action: 1`; supplied Origin must match the application. Credentials are opaque HttpOnly session cookies, never browser-storage bearer tokens. Every private handler authenticates and checks resource ownership. JSON bodies are limited to 100,000 characters/declared bytes.

| Method and route                                        | Behavior                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| GET `/health`                                           | Database readiness/version, no private data                                                   |
| POST `/auth/register`                                   | Name, email, password; creates private workspace, session and one-time recovery key           |
| POST `/auth/demo`                                       | `{admin:false}` for user or `{admin:true}` for an isolated demo administrator                 |
| POST `/auth/login`                                      | Email/password; generic credential error                                                      |
| GET `/auth/me`                                          | Current safe user fields                                                                      |
| POST `/auth/refresh`, `/auth/logout`                    | Rotate or revoke the current session                                                          |
| POST `/auth/reset`                                      | Email, recovery key and new password; rotates recovery and revokes sessions                   |
| POST `/auth/password`                                   | Authenticated password change with current-password verification                              |
| GET `/snapshot`                                         | Profile, computed targets, owned history/calendar/diary, catalog, notifications and equipment |
| PUT `/profile`                                          | Validated fitness profile; affected plans/calendar recalculated                               |
| POST `/workouts`                                        | Validated exercise session; server recomputes score from metrics                              |
| DELETE `/workouts/:id`                                  | Delete owned session and update scheduled completion                                          |
| POST `/nutrition/logs`                                  | Record food and estimated nutrients                                                           |
| DELETE `/nutrition/logs/:id`                            | Remove owned diary record                                                                     |
| POST `/nutrition/plan`                                  | Generate scaled meals using saved preferences and restrictions                                |
| PUT `/nutrition/grocery`                                | Persist checked grocery ingredients                                                           |
| POST `/schedule`                                        | Add/update a scheduled day                                                                    |
| PATCH `/schedule/:id`                                   | Reschedule or update a day                                                                    |
| POST `/schedule/adapt`                                  | Shorter/recovery-aware schedule adjustment                                                    |
| POST `/plans/adopt`                                     | Adopt a catalog plan                                                                          |
| POST `/challenges/join`                                 | Join/leave a catalog challenge                                                                |
| POST `/chat`                                            | Persist conversation and return guided or configured external answer                          |
| DELETE `/chat`                                          | Clear the user's conversation                                                                 |
| POST `/devices`                                         | Register simulated or hardware-bridge device; token returned once for hardware mode           |
| POST `/devices/:id/simulate`                            | Persist a deterministic labelled sample reading                                               |
| PATCH `/devices/:id`                                    | Enable/disable owned equipment                                                                |
| POST `/devices/:id/rotate`                              | Rotate a scoped hardware device token                                                         |
| DELETE `/devices/:id`                                   | Remove owned device and dependent readings                                                    |
| POST `/iot/ingest`                                      | Device-token authentication, bounded telemetry, deduplication and sequence checks             |
| POST `/notifications/read`                              | Mark owned notifications read                                                                 |
| POST `/issues`                                          | Create support report                                                                         |
| PUT `/account/name`                                     | Update display name                                                                           |
| GET `/account/export`                                   | Download all owned fitness records                                                            |
| DELETE `/account`                                       | Confirm DELETE; non-demo users also verify current password                                   |
| GET `/admin/overview`, `/admin/users`, `/admin/catalog` | Workspace statistics and filtered/paginated records; admin only                               |
| PATCH `/admin/users/:id`                                | Change status; protect own admin account                                                      |
| POST `/admin/catalog`, PUT/DELETE `/admin/catalog/:id`  | Validated content management with audit entry                                                 |
| POST `/admin/notifications`                             | Workspace announcement with audit entry                                                       |
| PATCH `/admin/issues/:id`, `/admin/devices/:id`         | Resolve reports or manage equipment with audit entry                                          |

The route implementations and Zod schemas are authoritative for exact payloads: `lib/server/routes/` and `lib/server/validation.ts`. Query limits protect snapshots and recent-reading tables; account export returns full owned records. Authentication, device ingestion and general APIs have separate persisted throttles. Unknown or inaccessible resources return 404 to avoid disclosing another workspace's records.

Hardware example payload: `{ "sequence": 1, "resistance": 10, "reps": 10, "duration": 40, "rest": 75, "heart_rate": 120, "rpe": 6, "form": 88, "simulated": false }`. Send `Authorization: Device <issued token>`. Do not put credentials in URLs. An identical sequence is acknowledged as a duplicate; an older unseen sequence is rejected.
