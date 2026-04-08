# Bug Log

---

## BUG-001 — Local 500 on startup after env var rename

**Date:** 2026-04-08  
**Commit that triggered it:** `c83f4f7d Switch Supabase client to use service key`  
**Affected file:** `backend/app.py`

### Symptom

Running `npm start` (or `python backend/app.py`) spun up the server, but every request to the frontend returned:

> Connection Error  
> Make sure the backend is running: `python backend/app.py`  
> Server responded with 500

### Root Cause

`backend/app.py` initialized the Supabase client **eagerly at module load time**:

```python
_sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])
```

Commit `c83f4f7d` renamed the env var from `SUPABASE_KEY` → `SUPABASE_SERVICE_KEY`, but the `.env` file was not updated at the same time. Python raised a `KeyError` on line 15 the moment the module was imported.

Flask's Werkzeug dev-server reloader catches import-time crashes and keeps the process alive — but it returns HTTP 500 for every subsequent request, with no indication of the real error in the browser.

### Why It Was Hard to Spot

- The server *appeared* to start (Flask logs showed it listening on port 5001)
- The browser showed a generic "500" with no traceback
- The real `KeyError` only appeared in the terminal where Flask was launched

### Fix Applied

Replaced eager init with a lazy `get_client()` function (matching the pattern already used in `api/index.py`):

```python
_sb = None

def get_client():
    global _sb
    if _sb is None:
        url = os.environ.get('SUPABASE_URL')
        key = os.environ.get('SUPABASE_SERVICE_KEY')
        if not url or not key:
            raise RuntimeError('SUPABASE_URL and SUPABASE_SERVICE_KEY env vars are not set')
        _sb = create_client(url, key)
    return _sb
```

Now, a missing env var raises a clear `RuntimeError` on the **first API request**, not silently at import time.

### Prevention Rule

Whenever an env var name is changed in application code, update `.env` in the **same commit**. If that's not possible (e.g., secret rotation), add a prominent note in the commit message: `BREAKING: rename SUPABASE_KEY → SUPABASE_SERVICE_KEY in .env`.

---

## BUG-002 — Backend fails to start after project directory move

**Date:** 2026-04-08  
**Affected file:** `backend/.venv/` (not in source control)

### Symptom

`npm start` printed:

> `/bin/sh: .../backend/.venv/bin/pip: bad interpreter: No such file or directory`

Backend never came up; frontend showed the same "Server responded with 500" / ECONNREFUSED error.

### Root Cause

The project was moved from `/Users/joserazguzman/Documents/myFirstAgenticProject/` to  
`/Users/joserazguzman/workspace/experimental/myFirstAgenticProject/`.

Python virtualenvs contain **hardcoded absolute paths** in their shebang lines (e.g. `#!/old/path/python3`). After the move, every venv binary (`pip`, `python`, etc.) pointed to a non-existent interpreter.

`setup-backend.js` checks for the existence of `backend/.venv/bin/python` before recreating the venv — since the symlink still existed, it skipped creation and went straight to `pip install`, which failed immediately.

### Fix Applied

Delete the stale venv so `setup-backend.js` recreates it from scratch:

```bash
rm -rf backend/.venv
npm start   # setup script detects missing venv and rebuilds it
```

### Prevention Rule

After moving or renaming the project directory, always delete `backend/.venv` and let `npm start` rebuild it. Virtualenvs are not portable across paths.
