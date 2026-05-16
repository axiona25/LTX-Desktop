import { app, ipcMain } from 'electron'
import fs from 'fs'
import path from 'path'
import { spawnSync } from 'child_process'
import { logger } from '../logger'

type StorageResult =
  | { success: true; value?: string | null; keys?: string[] }
  | { success: false; error: string }

const SQLITE_SCRIPT = `
import json, os, sqlite3, sys
req = json.loads(sys.stdin.read() or "{}")
db_path = req["dbPath"]
op = req["op"]
key = req.get("key")
value = req.get("value")
prefix = req.get("prefix")
os.makedirs(os.path.dirname(db_path), exist_ok=True)
con = sqlite3.connect(db_path)
try:
    con.execute("PRAGMA journal_mode=WAL")
    con.execute("CREATE TABLE IF NOT EXISTS app_kv (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL)")
    if op == "read":
        row = con.execute("SELECT value FROM app_kv WHERE key = ?", (key,)).fetchone()
        print(json.dumps({"success": True, "value": row[0] if row else None}))
    elif op == "write":
        con.execute(
            "INSERT INTO app_kv(key, value, updated_at) VALUES (?, ?, strftime('%s','now')) "
            "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
            (key, value),
        )
        con.commit()
        print(json.dumps({"success": True}))
    elif op == "remove":
        con.execute("DELETE FROM app_kv WHERE key = ?", (key,))
        con.commit()
        print(json.dumps({"success": True}))
    elif op == "keys":
        if prefix:
            rows = con.execute("SELECT key FROM app_kv WHERE key LIKE ? ORDER BY key", (prefix + "%",)).fetchall()
        else:
            rows = con.execute("SELECT key FROM app_kv ORDER BY key").fetchall()
        print(json.dumps({"success": True, "keys": [row[0] for row in rows]}))
    else:
        raise ValueError("unknown op: " + op)
finally:
    con.close()
`

function getAppStorageDbPath(): string {
  return path.join(app.getPath('userData'), 'axstudio.sqlite')
}

function getPythonCandidates(): string[] {
  const candidates: string[] = []
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'python', 'bin', 'python3'))
    candidates.push(path.join(process.resourcesPath, 'python', 'python.exe'))
  } else {
    candidates.push(path.join(process.cwd(), 'python-embed', 'bin', 'python3'))
    candidates.push(path.join(process.cwd(), 'backend', '.venv', 'bin', 'python'))
  }
  candidates.push('python3', 'python')
  return candidates
}

function resolvePythonExecutable(): string {
  for (const candidate of getPythonCandidates()) {
    if (candidate.includes(path.sep) && !fs.existsSync(candidate)) continue
    return candidate
  }
  return 'python3'
}

function runStorageOperation(payload: Record<string, unknown>): StorageResult {
  const input = JSON.stringify({ dbPath: getAppStorageDbPath(), ...payload })
  const result = spawnSync(resolvePythonExecutable(), ['-c', SQLITE_SCRIPT], {
    input,
    encoding: 'utf-8',
    maxBuffer: 32 * 1024 * 1024,
  })

  if (result.error) {
    logger.error(`[app-storage] sqlite operation failed: ${result.error}`)
    return { success: false, error: String(result.error) }
  }
  if (result.status !== 0) {
    const message = result.stderr || `python exited with status ${result.status}`
    logger.error(`[app-storage] sqlite operation failed: ${message}`)
    return { success: false, error: message }
  }

  try {
    return JSON.parse(result.stdout || '{"success":true}') as StorageResult
  } catch (error) {
    logger.error(`[app-storage] invalid sqlite response: ${error}`)
    return { success: false, error: String(error) }
  }
}

export function registerAppStorageHandlers(): void {
  ipcMain.on('app-storage-read', (event, params: { key?: string }) => {
    event.returnValue = runStorageOperation({ op: 'read', key: params?.key ?? '' })
  })

  ipcMain.on('app-storage-write', (event, params: { key?: string; value?: string }) => {
    event.returnValue = runStorageOperation({ op: 'write', key: params?.key ?? '', value: params?.value ?? '' })
  })

  ipcMain.on('app-storage-remove', (event, params: { key?: string }) => {
    event.returnValue = runStorageOperation({ op: 'remove', key: params?.key ?? '' })
  })

  ipcMain.on('app-storage-keys', (event, params: { prefix?: string }) => {
    event.returnValue = runStorageOperation({ op: 'keys', prefix: params?.prefix ?? '' })
  })
}
