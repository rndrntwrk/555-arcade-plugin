#!/usr/bin/env python3
import json
from pathlib import Path
from urllib.parse import urlencode

import requests

MINT = "5mH155ePpNWJb2GktpftLJbcTvoxFaUrv7XkZPDtpump"
CREATED_MS = 1783652240000
BASE = f"https://swap-api.pump.fun/v2/coins/{MINT}/trades"
OUT = Path("forensics/catalyst/output")
OUT.mkdir(parents=True, exist_ok=True)
S = requests.Session()
S.headers.update({
    "User-Agent": "Mozilla/5.0 rndrntwrk-catalyst-pagination/1.0",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://pump.fun",
    "Referer": "https://pump.fun/",
})


def get(cursor, limit=100):
    params = {
        "limit": limit,
        "cursor": cursor,
        "minSolAmount": 0,
        "program": "pump",
        "createdTs": CREATED_MS,
    }
    url = f"{BASE}?{urlencode(params)}"
    response = S.get(url, timeout=60)
    result = {
        "url": url,
        "status": response.status_code,
        "content_type": response.headers.get("content-type"),
        "text_prefix": response.text[:500],
    }
    try:
        body = response.json()
        result["body"] = body
    except Exception as exc:
        result["json_error"] = str(exc)
    return result


page0 = get(0)
body0 = page0.get("body") if isinstance(page0.get("body"), dict) else {}
trades0 = body0.get("trades") if isinstance(body0.get("trades"), list) else []
pagination = body0.get("pagination")

candidate_values = []
if isinstance(pagination, dict):
    for key, value in pagination.items():
        if isinstance(value, (str, int, float)) and value not in (None, "", 0, "0"):
            candidate_values.append({"source": f"pagination.{key}", "value": value})
if trades0:
    candidate_values.extend([
        {"source": "last.slotIndexId", "value": trades0[-1].get("slotIndexId")},
        {"source": "first.slotIndexId", "value": trades0[0].get("slotIndexId")},
    ])
candidate_values.extend([
    {"source": "literal.1", "value": 1},
    {"source": "literal.100", "value": 100},
])

seen = set()
tests = []
for candidate in candidate_values:
    value = candidate.get("value")
    if value in (None, ""):
        continue
    marker = str(value)
    if marker in seen:
        continue
    seen.add(marker)
    page = get(value, limit=5)
    body = page.get("body") if isinstance(page.get("body"), dict) else {}
    trades = body.get("trades") if isinstance(body.get("trades"), list) else []
    tests.append({
        "candidate": candidate,
        "status": page.get("status"),
        "pagination": body.get("pagination"),
        "trade_count": len(trades),
        "first": trades[0] if trades else None,
        "last": trades[-1] if trades else None,
        "text_prefix": page.get("text_prefix"),
    })

summary = {
    "page0_status": page0.get("status"),
    "page0_pagination": pagination,
    "page0_trade_count": len(trades0),
    "page0_first": trades0[0] if trades0 else None,
    "page0_last": trades0[-1] if trades0 else None,
    "trade_keys": sorted({key for trade in trades0 for key in trade}) if trades0 else [],
    "candidate_tests": tests,
}
(OUT / "pump_trade_page0.json").write_text(json.dumps(page0, indent=2))
(OUT / "pagination_probe.json").write_text(json.dumps(summary, indent=2))
print(json.dumps(summary, indent=2))
