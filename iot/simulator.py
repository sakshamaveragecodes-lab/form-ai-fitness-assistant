"""Deterministic simulator. Credentials come from environment, never CLI arguments."""
import argparse
import json
import os
import time
from pathlib import Path
import httpx
from backend.app.config import form_base_url
from backend.app.schemas import Telemetry
from iot.common import mqtt_client, connect


def reading(sequence: int) -> dict:
    return Telemetry(simulated=True, sequence=sequence, resistance=10, reps=8 + sequence % 5,
                     duration=32 + sequence % 5 * 3, rest=60 + sequence % 3 * 15,
                     heart_rate=108 + sequence % 8 * 3, rpe=5 + sequence % 4,
                     form=86 + sequence % 7).model_dump()


def main():
    parser = argparse.ArgumentParser(description='Send reproducible, explicitly synthetic equipment readings.')
    parser.add_argument('--transport', choices=['http', 'mqtt'], default='http')
    parser.add_argument('--count', type=int, default=10)
    parser.add_argument('--interval', type=float, default=4)
    parser.add_argument('--state', default='.iot-sequence.json', help='Persistent sequence counters by device ID; contains no tokens')
    args = parser.parse_args()
    if not 1 <= args.count <= 10000 or args.interval < 1:
        parser.error('count must be 1–10000; interval must be at least one second')
    device = os.environ['FORM_DEVICE_ID']
    state_file = Path(args.state)
    state = json.loads(state_file.read_text()) if state_file.exists() else {}
    client = None
    if args.transport == 'mqtt':
        client = mqtt_client('form-simulator-' + device)
        connect(client)
        client.loop_start()
    try:
        for _ in range(args.count):
            # Millisecond timestamps exceed the API integer bound; seconds fit until 2038.
            sequence = max(int(state.get(device, 0)) + 1, int(time.time()))
            payload = reading(sequence)
            if client:
                info = client.publish(f'form/v1/devices/{device}/telemetry', json.dumps(payload), qos=1, retain=False)
                info.wait_for_publish(timeout=10)
                if not info.is_published():
                    raise RuntimeError('MQTT publish was not acknowledged')
            else:
                result = httpx.post(form_base_url() + '/api/iot/ingest', json=payload,
                                    headers={'Authorization': 'Device ' + os.environ['FORM_DEVICE_TOKEN']}, timeout=10, follow_redirects=False)
                result.raise_for_status()
            state[device] = sequence
            state_file.write_text(json.dumps(state))
            print(f'Synthetic reading accepted by {args.transport}: sequence={sequence}, reps={payload["reps"]}', flush=True)
            if _ + 1 < args.count:
                time.sleep(args.interval)
    finally:
        if client:
            client.disconnect()
            client.loop_stop()


if __name__ == '__main__':
    main()
