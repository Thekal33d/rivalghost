#!/usr/bin/env python3
"""Snapshot live SQLite with its backup API, then verify before publishing."""
import datetime, os, pathlib, sqlite3, sys
source = pathlib.Path(sys.argv[1]).resolve(strict=True)
folder = pathlib.Path(sys.argv[2])
os.umask(0o077)
folder.mkdir(mode=0o700, parents=True, exist_ok=True)
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
final = folder / f'{source.stem}-{stamp}.sqlite'
partial = final.with_suffix('.partial')
with sqlite3.connect(source.as_uri() + '?mode=ro', uri=True) as src:
    with sqlite3.connect(partial) as dest:
        src.backup(dest)
        if dest.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
            raise RuntimeError('Backup failed integrity check')
os.chmod(partial, 0o600)
os.replace(partial, final)
print(f'Verified SQLite backup: {final.name}')
# Retain 14 days of completed snapshots for this database only.
cutoff = datetime.datetime.now(datetime.timezone.utc).timestamp() - 14 * 86400
for old in folder.glob(source.stem + '-*.sqlite'):
    if old != final and old.stat().st_mtime < cutoff:
        old.unlink()
