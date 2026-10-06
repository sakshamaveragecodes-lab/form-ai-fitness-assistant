"""Configuration is read at request time; secrets are never returned or logged."""
import os
from urllib.parse import urlparse


def form_base_url() -> str:
    base = os.getenv('FORM_BASE_URL', 'http://127.0.0.1:4173').rstrip('/')
    parsed = urlparse(base)
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError('FORM_BASE_URL must be a clean application origin')
    if parsed.scheme != 'https' and not (parsed.scheme == 'http' and parsed.hostname in {'localhost', '127.0.0.1', 'app'}):
        raise ValueError('Use HTTPS outside the local development network')
    return base
