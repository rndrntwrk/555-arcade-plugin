#!/usr/bin/env python3
import json
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from solders.pubkey import Pubkey

MINT = "5mH155ePpNWJb2GktpftLJbcTvoxFaUrv7XkZPDtpump"
PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
POOL = "58osDYARtvC5xy6GakQaBm16kDA4XwFyH4UfvtrjMvxj"
CREATED_MS = 1783652240000
RPCS = [
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet-beta.solana.com",
    "https://solana.api.onfinality.io/public",
    "https://rpc.ankr.com/solana",
]
OUT = Path("forensics/catalyst/output")
OUT.mkdir(parents=True, exist_ok=True)
S = requests.Session()
S.headers.update({
    "User-Agent": "Mozilla/5.0 rndrntwrk-catalyst-probe/1.1",
    "Accept": "application/json, text/plain, */*",
    "Origin": "https://pump.fun",
    "Referer": "https://pump.fun/",
})
CURVE = str(Pubkey.find_program_address(
    [b"bonding-curve", bytes(Pubkey.from_string(MINT))],
    Pubkey.from_string(PUMP),
)[0])


def iso(ts):
    return None if ts is None else datetime.fromtimestamp(ts, timezone.utc).isoformat()


def rpc(method, params):
    last = None
    for attempt in range(20):
        url = RPCS[attempt % len(RPCS)]
        try:
            r = S.post(url, json={"jsonrpc":"2.0","id":attempt+1,"method":method,"params":params}, timeout=45)
            if r.status_code in (403, 429, 500, 502, 503, 504):
                raise RuntimeError(f"HTTP {r.status_code}")
            r.raise_for_status()
            body = r.json()
            if body.get("error"):
                raise RuntimeError(str(body["error"]))
            return body.get("result"), url
        except Exception as exc:
            last = str(exc)
            time.sleep(min(0.5 + attempt * 0.3, 4))
    raise RuntimeError(last)


def summarize_json(value):
    if isinstance(value, list):
        return {"type": "list", "length": len(value), "first": value[:3], "last": value[-1:]}
    if isinstance(value, dict):
        out = {"type": "dict", "keys": sorted(value.keys())}
        for key in ("data", "trades", "items", "results", "holders", "activity"):
            child = value.get(key)
            if isinstance(child, list):
                out[f"{key}_length"] = len(child)
                out[f"{key}_first"] = child[:3]
                out[f"{key}_last"] = child[-1:]
        for key in ("cursor", "nextCursor", "next_cursor", "offset", "limit", "total", "hasMore", "has_more"):
            if key in value:
                out[key] = value[key]
        return out
    return {"type": type(value).__name__, "value": value}


rows = []
before = None
endpoints = []
truncated = False
for page_number in range(50):
    opts = {"limit": 1000}
    if before:
        opts["before"] = before
    page, endpoint = rpc("getSignaturesForAddress", [CURVE, opts])
    endpoints.append(endpoint)
    if not page:
        break
    rows.extend(page)
    before = page[-1]["signature"]
    if len(page) < 1000:
        break
else:
    truncated = True

metadata = {}
for key, url in {
    "pump": f"https://frontend-api-v3.pump.fun/coins/{MINT}?sync=true",
    "dex": f"https://api.dexscreener.com/latest/dex/pairs/solana/{POOL}",
}.items():
    try:
        r = S.get(url, timeout=30)
        metadata[key] = {"status": r.status_code, "body": r.json()}
    except Exception as exc:
        metadata[key] = {"error": str(exc)}

api_tests = {}
for key, url in {
    "frontend_trades_offset0": f"https://frontend-api-v3.pump.fun/trades/all/{MINT}?limit=1000&offset=0&minimumSize=0",
    "frontend_trades_offset1000": f"https://frontend-api-v3.pump.fun/trades/all/{MINT}?limit=1000&offset=1000&minimumSize=0",
    "swap_v2_trades": f"https://swap-api.pump.fun/v2/coins/{MINT}/trades?limit=100&cursor=0&minSolAmount=0&program=pump&createdTs={CREATED_MS}",
    "market_activity": f"https://swap-api.pump.fun/v1/coins/{MINT}/market-activity?program=pump",
    "advanced_holders": f"https://advanced-api-v2.pump.fun/coins/top-holders-and-sol-balance/{MINT}",
    "coin_v2": f"https://frontend-api-v3.pump.fun/coins-v2/{MINT}",
}.items():
    try:
        r = S.get(url, timeout=45)
        entry = {"url": url, "status": r.status_code, "content_type": r.headers.get("content-type"), "text_prefix": r.text[:300]}
        try:
            entry["summary"] = summarize_json(r.json())
        except Exception as exc:
            entry["json_error"] = str(exc)
        api_tests[key] = entry
    except Exception as exc:
        api_tests[key] = {"url": url, "error": str(exc)}

result = {
    "mint": MINT,
    "pool": POOL,
    "curve": CURVE,
    "signature_count": len(rows),
    "truncated_at_50000": truncated,
    "newest": None if not rows else {"signature": rows[0]["signature"], "slot": rows[0].get("slot"), "time": iso(rows[0].get("blockTime"))},
    "oldest": None if not rows else {"signature": rows[-1]["signature"], "slot": rows[-1].get("slot"), "time": iso(rows[-1].get("blockTime"))},
    "failed_count": sum(row.get("err") is not None for row in rows),
    "endpoints_used": sorted(set(endpoints)),
    "metadata": metadata,
    "api_tests": api_tests,
}
(OUT / "probe.json").write_text(json.dumps(result, indent=2))
print(json.dumps({
    "curve": result["curve"],
    "signature_count": result["signature_count"],
    "oldest": result["oldest"],
    "api_statuses": {key: value.get("status") for key, value in api_tests.items()},
}, indent=2))
