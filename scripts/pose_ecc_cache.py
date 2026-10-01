from __future__ import annotations

from pathlib import Path
import hashlib
import json
import os
from typing import Iterable

import numpy as np

CACHE_VERSION = 1
ALGORITHM = 'alpha-mask-affine-ecc-v1:384x448:motion-affine:iter80:eps1e-5'
DEFAULT_MAX_ENTRIES = 512


def _mask_bytes(mask: np.ndarray) -> bytes:
    arr = np.asarray(mask)
    if arr.dtype == np.uint8:
        u8 = arr
    else:
        u8 = np.clip(np.rint(arr.astype(np.float32) * 255.0), 0, 255).astype(np.uint8)
    return u8.tobytes(order='C')


def sequence_signature(masks: Iterable[np.ndarray]) -> str:
    h = hashlib.sha256()
    count = 0
    for mask in masks:
        arr = np.asarray(mask)
        h.update(str(tuple(arr.shape)).encode('ascii'))
        h.update(b'\0')
        h.update(_mask_bytes(arr))
        h.update(b'\xff')
        count += 1
    h.update(f'frames={count}'.encode('ascii'))
    return h.hexdigest().upper()


def cache_key(signature: str, avg_threshold: float, max_threshold: float) -> str:
    payload = f'{ALGORITHM}|{signature}|avg={avg_threshold:.9f}|max={max_threshold:.9f}'
    return hashlib.sha256(payload.encode('utf-8')).hexdigest().upper()


class PoseEccCache:
    def __init__(self, path: Path, max_entries: int = DEFAULT_MAX_ENTRIES):
        self.path = Path(path)
        self.max_entries = max_entries
        self._data: dict | None = None

    def _empty(self) -> dict:
        return {
            'version': CACHE_VERSION,
            'algorithm': ALGORITHM,
            'entries': {},
        }

    def _load(self) -> dict:
        if self._data is not None:
            return self._data
        if not self.path.exists():
            self._data = self._empty()
            return self._data
        try:
            data = json.loads(self.path.read_text(encoding='utf-8'))
        except (OSError, json.JSONDecodeError):
            data = self._empty()
        if data.get('version') != CACHE_VERSION or data.get('algorithm') != ALGORITHM or not isinstance(data.get('entries'), dict):
            data = self._empty()
        self._data = data
        return data

    def get(self, masks: list[np.ndarray], avg_threshold: float, max_threshold: float) -> dict | None:
        signature = sequence_signature(masks)
        key = cache_key(signature, avg_threshold, max_threshold)
        entry = self._load()['entries'].get(key)
        if not entry:
            return None
        result = entry.get('result')
        if not isinstance(result, dict):
            return None
        return dict(result)

    def put(
        self,
        masks: list[np.ndarray],
        avg_threshold: float,
        max_threshold: float,
        result: dict,
        *,
        label: str | None = None,
        provenance: str = 'computed',
    ) -> None:
        signature = sequence_signature(masks)
        key = cache_key(signature, avg_threshold, max_threshold)
        data = self._load()
        entries = data['entries']
        entries[key] = {
            'signature': signature,
            'frames': len(masks),
            'label': label,
            'provenance': provenance,
            'result': dict(result),
        }
        if len(entries) > self.max_entries:
            # JSON preserves insertion order. Keep the most recently inserted records.
            overflow = len(entries) - self.max_entries
            for old_key in list(entries)[:overflow]:
                entries.pop(old_key, None)
        self._write_atomic(data)

    def _write_atomic(self, data: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        tmp = self.path.with_suffix(self.path.suffix + '.tmp')
        tmp.write_text(json.dumps(data, indent=2), encoding='utf-8')
        os.replace(tmp, self.path)

    def stats(self) -> dict:
        data = self._load()
        return {
            'version': data['version'],
            'algorithm': data['algorithm'],
            'entries': len(data['entries']),
            'path': str(self.path),
        }
