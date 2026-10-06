# Security and privacy

## Implemented boundaries

Passwords use salted PBKDF2-SHA256, 100,000 iterations and a 32-byte output. Opaque 256-bit session tokens are hashed before database storage, expire after seven days, rotate on refresh, and are revoked on logout, password recovery and relevant status changes. Cookies are HttpOnly, SameSite=Lax, Path=/ and Secure on HTTPS. The iteration count reflects the Worker runtime constraint and is not claimed to be an Argon2-equivalent high-memory defense; production operators should reassess authentication as scale and threat exposure increase.

Public registration never accepts an admin role. Demo administrators control only their isolated seeded tenant and cannot inspect real accounts. Ordinary admin roles require the trusted operator script. Authorization is enforced in route handlers and database predicates, not navigation visibility. Tests cover anonymous access, non-admin denial, tenant isolation, forged ownership identifiers, suspended users and revoked sessions.

Mutation requests require a custom header and same-origin Origin when provided. No cross-origin allowlist is enabled. Queries bind parameters. React escapes user text; chat does not render arbitrary HTML. Schema validation bounds strings, numeric inputs, IDs and request bodies. Camera images and file uploads are not accepted by the API. External service keys live only in server environment configuration. Error responses omit SQL and stack traces.

Device tokens are random, scoped, hashed and revocable. Hardware mode is a transport designation, not a claim that a reading is genuine: the simulator explicitly sets `simulated:true`. Monotonic sequence checks and duplicate handling prevent simple replay from creating duplicate readings. Equipment advice never directly actuates a machine.

## Privacy behavior

Camera access occurs only after clicking Start; tracks and workers stop on session termination or unmount. Frames and landmarks are processed inside the browser; stored results contain summary metrics, not video. Location permission is requested only from Find a gym; coordinates stay in page memory for distance sorting. No advertising trackers are installed.

Nutrition, training, calendar and chat records belong to the account. Export and confirmed deletion are implemented. Turning on external AI requires both a configured server provider and a user's explicit setting; it shares conversation and a limited fitness summary, never camera frames. Provider retention remains subject to provider terms. Guided mode makes no external LLM call.

The application does not claim certified medical compliance, clinical validity, formal penetration testing or zero risk. Public multi-user launch requires HTTPS, managed database backups, provider access policy review and monitoring. Raw logs avoid passwords, tokens and health payloads. Dependency audits and automated tests are recorded in `docs/VERIFICATION.md`.
