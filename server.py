#!/usr/bin/env python3
"""Sirve la invitación y guarda los registros en data/invitados.db."""

import json
import re
import sqlite3
from datetime import datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "invitados.db"
# Cambia esta clave si quieres otra para abrir la lista.
CLAVE = "palmas"
PORT = 8765
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def connect():
    DB_PATH.parent.mkdir(exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS invitados (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            telefono TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            creado TEXT NOT NULL
        )
        """
    )
    return conn


def clean(value, limit):
    text = " ".join(str(value or "").split())
    return text[:limit]


def validate(nombre, telefono, email):
    digits = sum(character.isdigit() for character in telefono)
    if len(nombre) < 2:
        return "nombre", "Escribe tu nombre."
    if digits < 7 or digits > 15:
        return "telefono", "Escribe un teléfono válido."
    if not EMAIL_RE.fullmatch(email):
        return "email", "Escribe un email válido."
    return None, None


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/invitados":
            self.handle_list()
            return
        super().do_GET()

    def do_POST(self):
        if urlparse(self.path).path != "/api/invitados":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(length) if length else b""
        try:
            payload = json.loads(raw.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            self.respond(400, {"error": "No se pudo leer el formulario."})
            return
        if not isinstance(payload, dict):
            self.respond(400, {"error": "No se pudo leer el formulario."})
            return

        nombre = clean(payload.get("nombre"), 80)
        telefono = clean(payload.get("telefono"), 20)
        email = clean(payload.get("email"), 120).lower()
        field, message = validate(nombre, telefono, email)
        if message:
            self.respond(400, {"error": message, "campo": field})
            return

        creado = datetime.now().astimezone().isoformat(timespec="minutes")
        conn = connect()
        try:
            existing = conn.execute(
                "SELECT id FROM invitados WHERE email = ?", (email,)
            ).fetchone()
            if existing:
                conn.execute(
                    "UPDATE invitados SET nombre = ?, telefono = ? WHERE id = ?",
                    (nombre, telefono, existing["id"]),
                )
                actualizado = True
            else:
                conn.execute(
                    "INSERT INTO invitados (nombre, telefono, email, creado) VALUES (?, ?, ?, ?)",
                    (nombre, telefono, email, creado),
                )
                actualizado = False
            conn.commit()
        finally:
            conn.close()

        self.respond(200, {"ok": True, "actualizado": actualizado})

    def handle_list(self):
        if self.headers.get("X-Clave", "") != CLAVE:
            self.respond(401, {"error": "La clave no coincide."})
            return

        conn = connect()
        try:
            rows = conn.execute(
                "SELECT nombre, telefono, email, creado FROM invitados ORDER BY creado DESC"
            ).fetchall()
        finally:
            conn.close()

        self.respond(200, {"invitados": [dict(row) for row in rows]})

    def respond(self, status, body):
        data = json.dumps(body, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"Invitación en http://127.0.0.1:{PORT}")
    server.serve_forever()
