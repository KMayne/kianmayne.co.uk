"""A tiny, dependency-free poll API for kianmayne.co.uk.

Python standard library only (http.server + sqlite3), so it runs on the stock
python image with the script mounted from a ConfigMap: no image to build or push.

  GET  /polls/<id>[?voter=<hex32>]   -> question, options with vote counts, and your vote
  POST /polls/<id>/vote              {"voter": "<hex32>", "option": "<option id>"}
  GET  /healthz                      -> ok

Privacy: no cookies, no IP addresses stored. A voter is a random id the browser
makes and keeps in localStorage, so a reader can change their vote. The only use of
the client address is an in-memory rate limit, which is forgotten on restart.

Config (environment):
  POLLS_FILE       JSON file of polls (default /config/polls.json)
  DB_PATH          SQLite file (default /data/poll.db)
  ALLOWED_ORIGINS  comma-separated origins allowed by CORS
  PORT             listen port (default 8080)
"""

import json
import os
import re
import sqlite3
import threading
import time
from collections import defaultdict, deque
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlparse

POLLS_FILE = os.environ.get("POLLS_FILE", "/config/polls.json")
DB_PATH = os.environ.get("DB_PATH", "/data/poll.db")
PORT = int(os.environ.get("PORT", "8080"))
ALLOWED_ORIGINS = {
    o.strip()
    for o in os.environ.get(
        "ALLOWED_ORIGINS", "https://www.kianmayne.co.uk,https://kianmayne.co.uk"
    ).split(",")
    if o.strip()
}

VOTER_RE = re.compile(r"^[0-9a-f]{32}$")
POLL_PATH_RE = re.compile(r"^/polls/([a-z0-9-]{1,64})(/vote)?/?$")
MAX_BODY = 1024
RATE_LIMIT = 30  # votes per client address...
RATE_WINDOW = 3600  # ...per hour

with open(POLLS_FILE, encoding="utf-8") as f:
    POLLS = json.load(f)

db_lock = threading.Lock()
db = sqlite3.connect(DB_PATH, check_same_thread=False)
db.execute(
    """CREATE TABLE IF NOT EXISTS votes (
         poll TEXT NOT NULL,
         voter TEXT NOT NULL,
         option TEXT NOT NULL,
         updated_at INTEGER NOT NULL,
         PRIMARY KEY (poll, voter)
       )"""
)
db.commit()

recent_votes = defaultdict(deque)
rate_lock = threading.Lock()


def rate_limited(client):
    now = time.monotonic()
    with rate_lock:
        q = recent_votes[client]
        while q and now - q[0] > RATE_WINDOW:
            q.popleft()
        if len(q) >= RATE_LIMIT:
            return True
        q.append(now)
        return False


def results(poll_id, voter=None):
    poll = POLLS[poll_id]
    with db_lock:
        counts = dict(
            db.execute(
                "SELECT option, COUNT(*) FROM votes WHERE poll = ? GROUP BY option",
                (poll_id,),
            ).fetchall()
        )
        mine = None
        if voter:
            row = db.execute(
                "SELECT option FROM votes WHERE poll = ? AND voter = ?",
                (poll_id, voter),
            ).fetchone()
            mine = row[0] if row else None
    options = [{**o, "votes": counts.get(o["id"], 0)} for o in poll["options"]]
    return {
        "question": poll["question"],
        "options": options,
        "total": sum(o["votes"] for o in options),
        "yourVote": mine,
    }


class Handler(BaseHTTPRequestHandler):
    server_version = "poll"
    sys_version = ""

    def log_message(self, fmt, *args):
        # Log the request line only, never the client address
        print(f"{self.log_date_time_string()} {fmt % args}", flush=True)

    def cors(self):
        origin = self.headers.get("Origin")
        if origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.send_header("Access-Control-Max-Age", "86400")

    def reply(self, status, body):
        data = json.dumps(body).encode()
        self.send_response(status)
        self.cors()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def client(self):
        forwarded = self.headers.get("X-Forwarded-For")
        return forwarded.split(",")[0].strip() if forwarded else self.client_address[0]

    def do_OPTIONS(self):
        self.send_response(204)
        self.cors()
        self.end_headers()

    def do_GET(self):
        url = urlparse(self.path)
        if url.path == "/healthz":
            return self.reply(200, {"ok": True})
        m = POLL_PATH_RE.match(url.path)
        if not m or m.group(2) or m.group(1) not in POLLS:
            return self.reply(404, {"error": "not found"})
        voter = parse_qs(url.query).get("voter", [None])[0]
        if voter and not VOTER_RE.match(voter):
            voter = None
        self.reply(200, results(m.group(1), voter))

    def do_POST(self):
        m = POLL_PATH_RE.match(urlparse(self.path).path)
        if not m or not m.group(2) or m.group(1) not in POLLS:
            return self.reply(404, {"error": "not found"})
        poll_id = m.group(1)
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            length = -1
        if length <= 0 or length > MAX_BODY:
            return self.reply(400, {"error": "bad request"})
        try:
            body = json.loads(self.rfile.read(length))
            voter, option = body["voter"], body["option"]
        except (ValueError, KeyError, TypeError):
            return self.reply(400, {"error": "bad request"})
        if not isinstance(voter, str) or not VOTER_RE.match(voter):
            return self.reply(400, {"error": "bad voter id"})
        if option not in {o["id"] for o in POLLS[poll_id]["options"]}:
            return self.reply(400, {"error": "unknown option"})
        if rate_limited(self.client()):
            return self.reply(429, {"error": "too many votes, try again later"})
        with db_lock:
            db.execute(
                """INSERT INTO votes (poll, voter, option, updated_at) VALUES (?, ?, ?, ?)
                   ON CONFLICT (poll, voter) DO UPDATE
                   SET option = excluded.option, updated_at = excluded.updated_at""",
                (poll_id, voter, option, int(time.time())),
            )
            db.commit()
        self.reply(200, results(poll_id, voter))


if __name__ == "__main__":
    print(f"poll listening on :{PORT}, polls: {', '.join(POLLS)}", flush=True)
    ThreadingHTTPServer(("", PORT), Handler).serve_forever()
