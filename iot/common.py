import os
import paho.mqtt.client as mqtt


def mqtt_client(client_id: str) -> mqtt.Client:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=client_id)
    if os.getenv('MQTT_USERNAME'):
        client.username_pw_set(os.environ['MQTT_USERNAME'], os.environ['MQTT_PASSWORD'])
    if os.getenv('MQTT_TLS', 'false').lower() == 'true':
        client.tls_set(ca_certs=os.getenv('MQTT_CA_FILE') or None)
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    return client


def connect(client):
    client.connect(os.getenv('MQTT_HOST', '127.0.0.1'), int(os.getenv('MQTT_PORT', '1883')), keepalive=60)
