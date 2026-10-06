# Smart equipment and MQTT

Device firmware or the supplied simulator publishes bounded readings to `form/v1/devices/<device-UUID>/telemetry`. Paho MQTT receives messages; `iot.bridge` validates topic, allowlist and payload, persists a bounded SQLite queue, then forwards through HTTPS to `/api/iot/ingest`. The main API validates the scoped device token, active status and increasing sequence before storage. The UI displays readings and deterministic resistance/rest guidance. Device, broker, gateway, backend and UI can change independently.

## HTTP demonstration

Create hardware-bridge equipment in Smart equipment and securely save its one-time device token. Export `FORM_DEVICE_ID`, `FORM_DEVICE_TOKEN` and `FORM_BASE_URL` in your local shell; never commit them. Install `backend/requirements.lock`, then run:

```bash
.venv/bin/python -m iot.simulator --transport http --count 10 --interval 4
```

The script marks every generated value simulated. Sequence counters persist in `.iot-sequence.json`. The UI's Start simulation button offers a no-setup alternative using the same persisted reading model.

## MQTT demonstration

```bash
docker compose --profile iot up --build
.venv/bin/python -m iot.simulator --transport mqtt --count 10 --interval 4
```

Configure broker host, port, TLS, credentials and device allowlist using `.env.example`. `FORM_DEVICE_TOKENS_JSON` maps allowed UUIDs to tokens in the bridge process only. Start the bridge with `.venv/bin/python -m iot.bridge` when not using Compose.

The bridge accepts at most 4096 bytes per MQTT payload. Its queue is bounded at 1000 readings, uses bounded retry/backoff, and retains per-device order when a prior reading is retrying. Secrets are not saved in the queue. Broker QoS acknowledgement confirms messaging receipt, not final database persistence. Review bridge status/output and equipment readings for delivery.

The provided Mosquitto configuration is a loopback/local demonstration. For physical deployment use a private authenticated TLS broker, per-device topic ACLs, calibrated sensors, secure token provisioning and monitored gateways. No physical hardware or live broker certification is claimed. `scripts/verify-built.py` exercises the real HTTP simulator against the built app; Python tests cover MQTT validation and gateway access boundaries.
