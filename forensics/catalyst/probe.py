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
RPCS = [
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet-beta.solana.com",
    "https://solana.api.onfinality.io/public",
    "https://rpc.ankr.com/solana",
]
OUT = Path("forensics/catalyst/output")
OUT.mkdir(parents=True, exist_ok=True)
S = requests.Session()
S.headers["User-Agent"] = "rndrntwrk-catalyst-probe/1.0"
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
}
(OUT / "probe.json").write_text(json.dumps(result, indent=2))
print(json.dumps({k: result[k] for k in ["curve","signature_count","truncated_at_50000","newest","oldest","failed_count"]}, indent=2))
