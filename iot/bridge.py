"""MQTT subscriber → credential-scoped HTTPS API with durable bounded retry queue."""
import json
import logging
import os
import re
import sqlite3
import time
import httpx
from pydantic import ValidationError
from backend.app.config import form_base_url
from backend.app.schemas import Telemetry
from iot.common import mqtt_client, connect

logging.basicConfig(level=logging.INFO, format='%(levelname)s %(message)s')
log = logging.getLogger('form-mqtt')


def parse_message(topic: str, payload: bytes, tokens: dict[str, str]):
    match = re.fullmatch(r'form/v1/devices/([a-f0-9-]{36})/telemetry', topic)
    if not match or match[1] not in tokens or len(payload) > 4096:
        raise ValueError('Unknown device topic or oversized payload')
    reading = Telemetry.model_validate_json(payload)
    return match[1], reading.model_dump()


def main():
    tokens = json.loads(os.environ['FORM_DEVICE_TOKENS_JSON'])
    if not tokens or any(not re.fullmatch(r'[a-f0-9]{64}', t) for t in tokens.values()):
        raise ValueError('Configure device IDs and their current tokens')
    base = form_base_url()
    path = os.getenv('MQTT_QUEUE_FILE', '.mqtt-queue.sqlite3')
    queue = sqlite3.connect(path, check_same_thread=False, isolation_level=None)
    queue.execute('PRAGMA journal_mode=WAL')
    queue.execute('CREATE TABLE IF NOT EXISTS queue (device TEXT, sequence INTEGER, payload TEXT, attempts INTEGER DEFAULT 0, due REAL DEFAULT 0, PRIMARY KEY(device,sequence))')
    client = mqtt_client('form-equipment-bridge')

    def on_connect(client, userdata, flags, reason, properties):
        if reason.is_failure:
            log.warning('Broker connection refused')
            return
        for device in tokens:
            client.subscribe(f'form/v1/devices/{device}/telemetry', qos=1)
        log.info('Subscribed to %s registered device topics', len(tokens))

    def on_message(client, userdata, message):
        try:
            device, payload = parse_message(message.topic, message.payload, tokens)
            if queue.execute('SELECT COUNT(*) FROM queue').fetchone()[0] >= 1000:
                log.warning('Retry queue is full; reading discarded')
                return
            queue.execute('INSERT OR IGNORE INTO queue(device,sequence,payload) VALUES (?,?,?)', (device, payload['sequence'], json.dumps(payload)))
        except (ValueError, ValidationError, sqlite3.Error):
            log.warning('Rejected an invalid equipment message')

    client.on_connect, client.on_message = on_connect, on_message
    connect(client)
    client.loop_start()
    try:
        with httpx.Client(timeout=10, follow_redirects=False) as http:
            while True:
                row = queue.execute('SELECT device,sequence,payload,attempts FROM queue q WHERE due<=? AND sequence=(SELECT MIN(sequence) FROM queue oldest WHERE oldest.device=q.device) ORDER BY sequence LIMIT 1', (time.time(),)).fetchone()
                if not row:
                    time.sleep(.25)
                    continue
                device, sequence, payload, attempts = row
                try:
                    response = http.post(base + '/api/iot/ingest', content=payload, headers={'Content-Type': 'application/json', 'Authorization': 'Device ' + tokens[device]})
                    retry = response.status_code >= 500 or response.status_code == 429
                    if response.status_code >= 400 and not retry:
                        log.warning('Reading rejected by application: status=%s', response.status_code)
                except httpx.HTTPError:
                    retry = True
                if retry and attempts < 8:
                    queue.execute('UPDATE queue SET attempts=attempts+1,due=? WHERE device=? AND sequence=?', (time.time() + min(300, 2 ** (attempts + 1)), device, sequence))
                else:
                    queue.execute('DELETE FROM queue WHERE device=? AND sequence=?', (device, sequence))
                    log.info('Reading %s %s', sequence, 'retry budget exhausted' if retry else 'processed')
    except KeyboardInterrupt:
        pass
    finally:
        client.disconnect()
        client.loop_stop()
        queue.close()


if __name__ == '__main__':
    main()
