#!/usr/bin/env python3
from __future__ import annotations

import csv
import json
import math
import os
import time
import traceback
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import requests
from solders.pubkey import Pubkey

MINT = "5mH155ePpNWJb2GktpftLJbcTvoxFaUrv7XkZPDtpump"
POOL = "58osDYARtvC5xy6GakQaBm16kDA4XwFyH4UfvtrjMvxj"
PUMP = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"
PUMPSWAP = "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA"
LAMPORTS = 1_000_000_000
OUT = Path("forensics/catalyst/output")
OUT.mkdir(parents=True, exist_ok=True)
MAX_SIGS = int(os.getenv("MAX_SIGS", "30000"))
BATCH = int(os.getenv("BATCH", "20"))

ENDPOINTS = [
    "https://solana-rpc.publicnode.com",
    "https://api.mainnet-beta.solana.com",
    "https://solana.api.onfinality.io/public",
    "https://rpc.ankr.com/solana",
]
S = requests.Session()
S.headers["User-Agent"] = "rndrntwrk-catalyst-forensics/1.0"


def iso(ts: Optional[int | float]) -> Optional[str]:
    return None if ts is None else datetime.fromtimestamp(float(ts), timezone.utc).isoformat()


def dump(name: str, value: Any) -> None:
    (OUT / name).write_text(json.dumps(value, indent=2, default=str))


class RPC:
    def __init__(self) -> None:
        self.i = 1
        self.rot = 0
        self.stats = Counter()

    def call(self, method: str, params: list[Any], attempts: int = 16) -> Any:
        error: Exception | None = None
        for n in range(attempts):
            url = ENDPOINTS[(self.rot + n) % len(ENDPOINTS)]
            payload = {"jsonrpc": "2.0", "id": self.i, "method": method, "params": params}
            self.i += 1
            try:
                r = S.post(url, json=payload, timeout=90)
                self.stats[f"http_{r.status_code}"] += 1
                if r.status_code in (403, 413, 429, 500, 502, 503, 504):
                    raise RuntimeError(f"{url} HTTP {r.status_code}: {r.text[:150]}")
                r.raise_for_status()
                body = r.json()
                if body.get("error"):
                    raise RuntimeError(str(body["error"]))
                self.rot = ENDPOINTS.index(url)
                self.stats[method] += 1
                return body.get("result")
            except Exception as exc:
                error = exc
                self.stats["retries"] += 1
                time.sleep(min(0.8 + n * 0.7, 8))
        raise RuntimeError(f"{method} failed: {error}")

    def batch(self, calls: list[tuple[str, list[Any]]], attempts: int = 10) -> list[Any]:
        if not calls:
            return []
        error: Exception | None = None
        for n in range(attempts):
            url = ENDPOINTS[(self.rot + n) % len(ENDPOINTS)]
            ids = []
            payload = []
            for method, params in calls:
                rid = self.i
                self.i += 1
                ids.append(rid)
                payload.append({"jsonrpc": "2.0", "id": rid, "method": method, "params": params})
            try:
                r = S.post(url, json=payload, timeout=150)
                self.stats[f"batch_http_{r.status_code}"] += 1
                if r.status_code in (403, 413, 429, 500, 502, 503, 504):
                    raise RuntimeError(f"{url} HTTP {r.status_code}: {r.text[:150]}")
                r.raise_for_status()
                body = r.json()
                if not isinstance(body, list):
                    raise RuntimeError("non-list batch response")
                by_id = {row.get("id"): row for row in body}
                self.rot = ENDPOINTS.index(url)
                self.stats["batch_items"] += len(calls)
                return [
                    None if by_id.get(rid, {}).get("error") else by_id.get(rid, {}).get("result")
                    for rid in ids
                ]
            except Exception as exc:
                error = exc
                self.stats["batch_retries"] += 1
                time.sleep(min(1 + n, 8))
        out = []
        for method, params in calls:
            try:
                out.append(self.call(method, params))
            except Exception:
                out.append(None)
        if any(v is not None for v in out):
            return out
        raise RuntimeError(f"batch failed: {error}")


R = RPC()
mint_pk = Pubkey.from_string(MINT)
pump_pk = Pubkey.from_string(PUMP)
CURVE = str(Pubkey.find_program_address([b"bonding-curve", bytes(mint_pk)], pump_pk)[0])


def metadata() -> dict[str, Any]:
    urls = {
        "pump": f"https://frontend-api-v3.pump.fun/coins/{MINT}?sync=true",
        "dex": f"https://api.dexscreener.com/latest/dex/pairs/solana/{POOL}",
    }
    out = {}
    for key, url in urls.items():
        try:
            r = S.get(url, timeout=45)
            out[key] = {"status": r.status_code, "body": r.json()}
        except Exception as exc:
            out[key] = {"error": str(exc)}
    return out


def all_signatures(address: str) -> tuple[list[dict[str, Any]], bool]:
    rows = []
    before = None
    complete = True
    while len(rows) < MAX_SIGS:
        opts: dict[str, Any] = {"limit": min(1000, MAX_SIGS - len(rows))}
        if before:
            opts["before"] = before
        page = R.call("getSignaturesForAddress", [address, opts])
        if not page:
            break
        rows.extend(page)
        before = page[-1]["signature"]
        print(f"curve signatures={len(rows)} oldest={iso(page[-1].get('blockTime'))}", flush=True)
        if len(page) < opts["limit"]:
            break
        time.sleep(0.25)
    if len(rows) >= MAX_SIGS:
        complete = False
    seen = set()
    unique = []
    for row in rows:
        sig = row.get("signature")
        if sig and sig not in seen:
            seen.add(sig)
            unique.append(row)
    return unique, complete


def fetch_txs(signatures: list[str]) -> dict[str, Any]:
    out = {}
    for start in range(0, len(signatures), BATCH):
        chunk = signatures[start : start + BATCH]
        calls = [
            (
                "getTransaction",
                [sig, {"encoding": "jsonParsed", "commitment": "confirmed", "maxSupportedTransactionVersion": 0}],
            )
            for sig in chunk
        ]
        values = R.batch(calls)
        out.update(zip(chunk, values))
        if start % (BATCH * 10) == 0:
            print(f"transactions={min(start + BATCH, len(signatures))}/{len(signatures)}", flush=True)
        time.sleep(0.25)
    return out


def keys(tx: dict[str, Any]) -> tuple[list[str], set[str], Optional[str]]:
    values = tx.get("transaction", {}).get("message", {}).get("accountKeys", [])
    out, signers = [], set()
    for i, value in enumerate(values):
        if isinstance(value, dict):
            key = str(value.get("pubkey"))
            if value.get("signer"):
                signers.add(key)
        else:
            key = str(value)
            if i == 0:
                signers.add(key)
        out.append(key)
    return out, signers, out[0] if out else None


def token_deltas(tx: dict[str, Any]) -> tuple[dict[str, int], int]:
    pre, post = defaultdict(int), defaultdict(int)
    decimals = 6
    meta = tx.get("meta") or {}
    for side, dst in (("preTokenBalances", pre), ("postTokenBalances", post)):
        for row in meta.get(side) or []:
            if row.get("mint") != MINT or not row.get("owner"):
                continue
            amount = int(row.get("uiTokenAmount", {}).get("amount") or 0)
            decimals = int(row.get("uiTokenAmount", {}).get("decimals", decimals))
            dst[str(row["owner"])] += amount
    return {owner: post.get(owner, 0) - pre.get(owner, 0) for owner in set(pre) | set(post)}, decimals


def sol_delta(tx: dict[str, Any], address: str) -> int:
    ks, _, _ = keys(tx)
    if address not in ks:
        return 0
    i = ks.index(address)
    meta = tx.get("meta") or {}
    pre, post = meta.get("preBalances") or [], meta.get("postBalances") or []
    return 0 if i >= len(pre) or i >= len(post) else int(post[i]) - int(pre[i])


def programs(tx: dict[str, Any]) -> set[str]:
    ks, _, _ = keys(tx)
    out = set()
    for ix in tx.get("transaction", {}).get("message", {}).get("instructions", []) or []:
        if not isinstance(ix, dict):
            continue
        if ix.get("programId"):
            out.add(str(ix["programId"]))
        if isinstance(ix.get("programIdIndex"), int) and ix["programIdIndex"] < len(ks):
            out.add(ks[ix["programIdIndex"]])
    return out


def get_current_balance(wallet: str) -> int:
    result = R.call(
        "getTokenAccountsByOwner",
        [wallet, {"mint": MINT}, {"encoding": "jsonParsed", "commitment": "confirmed"}],
    )
    total = 0
    for row in (result or {}).get("value", []):
        try:
            total += int(row["account"]["data"]["parsed"]["info"]["tokenAmount"]["amount"])
        except Exception:
            pass
    return total


def get_largest() -> list[dict[str, Any]]:
    try:
        result = R.call("getTokenLargestAccounts", [MINT, {"commitment": "confirmed"}])
        rows = (result or {}).get("value", [])
        infos = R.batch(
            [
                ("getAccountInfo", [row["address"], {"encoding": "jsonParsed", "commitment": "confirmed"}])
                for row in rows
            ]
        )
        out = []
        for row, info in zip(rows, infos):
            owner = None
            try:
                owner = info["value"]["data"]["parsed"]["info"]["owner"]
            except Exception:
                pass
            out.append({**row, "owner": owner})
        return out
    except Exception as exc:
        return [{"error": str(exc)}]


def main() -> None:
    start = time.time()
    meta = metadata()
    dump("metadata.json", meta)
    print(f"mint={MINT}\npool={POOL}\ncurve={CURVE}", flush=True)

    sig_rows, history_complete = all_signatures(CURVE)
    dump("curve_signatures.json", sig_rows)
    txs = fetch_txs([row["signature"] for row in sig_rows])

    events = []
    tx_evidence = []
    decimals = 6
    for sigrow in sig_rows:
        sig = sigrow["signature"]
        tx = txs.get(sig)
        if not tx or not tx.get("meta") or tx["meta"].get("err") is not None:
            continue
        ts = int(tx.get("blockTime") or sigrow.get("blockTime") or 0)
        slot = int(tx.get("slot") or sigrow.get("slot") or 0)
        ks, signers, payer = keys(tx)
        deltas, decimals = token_deltas(tx)
        logs = "\n".join((tx.get("meta") or {}).get("logMessages") or []).lower()
        pids = programs(tx)
        kind = (
            "migrate" if "migrat" in logs or PUMPSWAP in pids
            else "create" if "instruction: create" in logs
            else "buy" if "instruction: buy" in logs
            else "sell" if "instruction: sell" in logs
            else "other"
        )
        tx_evidence.append(
            {
                "signature": sig, "slot": slot, "timestamp": ts, "iso": iso(ts),
                "kind": kind, "payer": payer, "programs": sorted(pids),
                "logs": [line for line in logs.splitlines() if "instruction:" in line or "complete" in line or "migrat" in line][:20],
            }
        )
        curve_sol = sol_delta(tx, CURVE) / LAMPORTS
        candidates = [
            (owner, delta) for owner, delta in deltas.items()
            if delta and owner != CURVE and (owner in signers or owner == payer)
        ]
        if not candidates:
            candidates = [(owner, delta) for owner, delta in deltas.items() if delta and owner != CURVE]
        for owner, delta in candidates:
            events.append(
                {
                    "signature": sig,
                    "slot": slot,
                    "timestamp": ts,
                    "iso": iso(ts),
                    "wallet": owner,
                    "side": "buy" if delta > 0 else "sell",
                    "token_raw": int(delta),
                    "tokens": int(delta) / (10**decimals),
                    "wallet_sol_delta": sol_delta(tx, owner) / LAMPORTS,
                    "curve_sol_delta": curve_sol,
                    "kind": kind,
                }
            )
    events.sort(key=lambda x: (x["timestamp"], x["slot"], x["signature"]))
    tx_evidence.sort(key=lambda x: (x["timestamp"], x["slot"], x["signature"]))
    dump("curve_tx_evidence.json", tx_evidence)

    if not tx_evidence:
        raise RuntimeError("no successful curve transactions parsed")
    created = next((row for row in tx_evidence if row["kind"] == "create"), tx_evidence[0])
    creation_ts = int(created["timestamp"])

    migration = next((row for row in tx_evidence if row["kind"] == "migrate"), None)
    pair_created = None
    try:
        pair_created = int(meta["dex"]["body"]["pairs"][0]["pairCreatedAt"]) // 1000
    except Exception:
        pass
    migration_ts = int(migration["timestamp"]) if migration else pair_created or int(tx_evidence[-1]["timestamp"])
    migration_sig = migration["signature"] if migration else min(
        tx_evidence, key=lambda x: abs(int(x["timestamp"]) - migration_ts)
    )["signature"]

    creator = None
    try:
        body = meta["pump"]["body"]
        creator = body.get("creator") or (body.get("data") or {}).get("creator")
    except Exception:
        pass
    creator = creator or created.get("payer")

    events = [row for row in events if int(row["timestamp"]) <= migration_ts + 120]
    ledgers: dict[str, dict[str, Any]] = {}
    for row in events:
        w = row["wallet"]
        x = ledgers.setdefault(
            w,
            {
                "wallet": w, "bought_raw": 0, "sold_raw": 0, "net_raw": 0,
                "curve_sol_in": 0.0, "curve_sol_out": 0.0,
                "wallet_sol_spent_est": 0.0, "wallet_sol_received_est": 0.0,
                "buys": 0, "sells": 0, "first_buy_ts": None, "last_trade_ts": None,
                "first_buy_sig": None, "is_creator": w == creator,
            },
        )
        delta = int(row["token_raw"])
        x["net_raw"] += delta
        x["last_trade_ts"] = max(x["last_trade_ts"] or 0, int(row["timestamp"]))
        if delta > 0:
            x["bought_raw"] += delta
            x["buys"] += 1
            x["curve_sol_in"] += max(0.0, float(row["curve_sol_delta"]))
            x["wallet_sol_spent_est"] += max(0.0, -float(row["wallet_sol_delta"]))
            if x["first_buy_ts"] is None or int(row["timestamp"]) < x["first_buy_ts"]:
                x["first_buy_ts"] = int(row["timestamp"])
                x["first_buy_sig"] = row["signature"]
        else:
            x["sold_raw"] += -delta
            x["sells"] += 1
            x["curve_sol_out"] += max(0.0, -float(row["curve_sol_delta"]))
            x["wallet_sol_received_est"] += max(0.0, float(row["wallet_sol_delta"]))

    try:
        supply_info = R.call("getTokenSupply", [MINT, {"commitment": "confirmed"}])["value"]
        supply_raw = int(supply_info["amount"])
        decimals = int(supply_info["decimals"])
    except Exception:
        supply_raw = 1_000_000_000 * 10**decimals

    wallets = []
    for x in ledgers.values():
        x["net_tokens"] = x["net_raw"] / (10**decimals)
        x["net_supply_pct"] = x["net_raw"] / supply_raw * 100
        x["first_buy_iso"] = iso(x["first_buy_ts"])
        x["last_trade_iso"] = iso(x["last_trade_ts"])
        x["net_curve_sol"] = x["curve_sol_in"] - x["curve_sol_out"]
        wallets.append(x)
    wallets.sort(key=lambda x: x["net_raw"], reverse=True)

    for i, row in enumerate([x for x in wallets if x["net_raw"] > 0][:60], 1):
        try:
            row["current_raw"] = get_current_balance(row["wallet"])
            row["current_tokens"] = row["current_raw"] / (10**decimals)
            row["current_supply_pct"] = row["current_raw"] / supply_raw * 100
            row["retention_vs_curve_net_pct"] = row["current_raw"] / row["net_raw"] * 100
        except Exception as exc:
            row["current_balance_error"] = str(exc)
        if i % 10 == 0:
            print(f"balances={i}", flush=True)

    hourly, daily = {}, {}
    for row in events:
        dt = datetime.fromtimestamp(int(row["timestamp"]), timezone.utc)
        for store, key in (
            (hourly, dt.strftime("%Y-%m-%dT%H:00:00Z")),
            (daily, dt.strftime("%Y-%m-%d")),
        ):
            b = store.setdefault(
                key,
                {"bucket": key, "buy_legs": 0, "sell_legs": 0, "buyers": set(), "sellers": set(),
                 "buy_tokens": 0.0, "sell_tokens": 0.0, "curve_sol_in": 0.0, "curve_sol_out": 0.0},
            )
            if row["side"] == "buy":
                b["buy_legs"] += 1
                b["buyers"].add(row["wallet"])
                b["buy_tokens"] += float(row["tokens"])
                b["curve_sol_in"] += max(0.0, float(row["curve_sol_delta"]))
            else:
                b["sell_legs"] += 1
                b["sellers"].add(row["wallet"])
                b["sell_tokens"] += -float(row["tokens"])
                b["curve_sol_out"] += max(0.0, -float(row["curve_sol_delta"]))

    def normalize(store: dict[str, Any]) -> list[dict[str, Any]]:
        out = []
        for _, b in sorted(store.items()):
            z = dict(b)
            z["unique_buyers"] = len(z.pop("buyers"))
            z["unique_sellers"] = len(z.pop("sellers"))
            z["net_curve_sol"] = z["curve_sol_in"] - z["curve_sol_out"]
            out.append(z)
        return out

    hours, days = normalize(hourly), normalize(daily)
    older_abs = [
        abs(x["net_curve_sol"])
        for x in hours
        if int(datetime.fromisoformat(x["bucket"].replace("Z", "+00:00")).timestamp()) < migration_ts - 86400
    ]
    older_abs.sort()
    p95 = older_abs[int((len(older_abs) - 1) * 0.95)] if older_abs else 0
    threshold = max(1.0, p95 * 5)
    burst = next(
        (
            x for x in hours
            if int(datetime.fromisoformat(x["bucket"].replace("Z", "+00:00")).timestamp()) >= migration_ts - 172800
            and (x["net_curve_sol"] >= threshold or x["curve_sol_in"] >= max(2.0, threshold * 1.5))
        ),
        None,
    )
    burst_ts = (
        int(datetime.fromisoformat(burst["bucket"].replace("Z", "+00:00")).timestamp())
        if burst else migration_ts - 86400
    )

    cohorts = {}
    cohort_defs = {
        "launch_0_72h": lambda t: t <= creation_ts + 72 * 3600,
        "dormant_middle": lambda t: creation_ts + 72 * 3600 < t < burst_ts,
        "burst_before_final_hour": lambda t: burst_ts <= t < migration_ts - 3600,
        "final_hour": lambda t: t >= migration_ts - 3600,
    }
    for name, fn in cohort_defs.items():
        members = [x for x in wallets if x["first_buy_ts"] and fn(int(x["first_buy_ts"]))]
        cohorts[name] = {
            "wallets": len(members),
            "positive_wallets": sum(x["net_raw"] > 0 for x in members),
            "net_tokens": sum(x["net_raw"] for x in members) / (10**decimals),
            "net_supply_pct": sum(x["net_raw"] for x in members) / supply_raw * 100,
            "curve_sol_in": sum(x["curve_sol_in"] for x in members),
            "net_curve_sol": sum(x["net_curve_sol"] for x in members),
        }

    times = sorted(set(int(x["timestamp"]) for x in events))
    gaps = [
        {"from": iso(a), "to": iso(b), "seconds": b-a, "days": (b-a)/86400}
        for a, b in zip(times, times[1:])
    ]
    gaps.sort(key=lambda x: x["seconds"], reverse=True)

    largest = get_largest()
    dump("current_largest_accounts.json", largest)

    with (OUT / "curve_events.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(events[0].keys()) if events else ["signature"])
        writer.writeheader()
        writer.writerows(events)
    with (OUT / "pre_migration_wallets.csv").open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(wallets[0].keys()) if wallets else ["wallet"])
        writer.writeheader()
        writer.writerows(wallets)

    summary = {
        "generated_at": iso(time.time()),
        "runtime_seconds": time.time() - start,
        "addresses": {"mint": MINT, "pool": POOL, "curve": CURVE, "creator": creator},
        "timeline": {
            "created": iso(creation_ts), "creation_ts": creation_ts, "creation_signature": created["signature"],
            "migrated": iso(migration_ts), "migration_ts": migration_ts, "migration_signature": migration_sig,
            "unbonded_days": (migration_ts - creation_ts) / 86400,
            "burst": iso(burst_ts), "burst_ts": burst_ts, "burst_hour": burst,
        },
        "coverage": {
            "curve_signatures": len(sig_rows), "curve_history_complete": history_complete,
            "successful_curve_txs": len(tx_evidence), "trade_legs": len(events),
            "unique_wallets": len(wallets), "rpc": dict(R.stats),
        },
        "supply": {"raw": supply_raw, "decimals": decimals},
        "flow": {
            "curve_sol_in": sum(x["curve_sol_in"] for x in wallets),
            "curve_sol_out": sum(x["curve_sol_out"] for x in wallets),
            "net_curve_sol": sum(x["net_curve_sol"] for x in wallets),
            "buy_legs": sum(x["buys"] for x in wallets), "sell_legs": sum(x["sells"] for x in wallets),
            "baseline_hour_abs_net_p95": p95, "burst_threshold": threshold,
        },
        "cohorts": cohorts,
        "largest_gaps": gaps[:20],
        "daily": days,
        "last_72h_hourly": [
            x for x in hours
            if int(datetime.fromisoformat(x["bucket"].replace("Z", "+00:00")).timestamp()) >= migration_ts - 72*3600
        ],
        "top_net_accumulators": wallets[:100],
        "top_late_accumulators": sorted(
            [x for x in wallets if x["first_buy_ts"] and x["first_buy_ts"] >= migration_ts - 86400],
            key=lambda x: x["net_raw"], reverse=True
        )[:100],
        "top_sellers": sorted(wallets, key=lambda x: x["sold_raw"], reverse=True)[:100],
        "creator_ledger": next((x for x in wallets if x["wallet"] == creator), None),
        "current_largest_accounts": largest,
    }
    dump("summary.json", summary)

    lines = [
        "# Catalyst raw on-chain reconstruction", "",
        f"- Mint: `{MINT}`", f"- Curve: `{CURVE}`", f"- Pool: `{POOL}`",
        f"- Creator: `{creator}`", f"- Created: {iso(creation_ts)}",
        f"- Migrated: {iso(migration_ts)}", f"- Unbonded: {(migration_ts-creation_ts)/86400:.2f} days",
        f"- Curve signatures: {len(sig_rows)} (complete={history_complete})",
        f"- Trade legs: {len(events)}; unique wallets: {len(wallets)}",
        f"- Detected burst: {iso(burst_ts)}", "", "## Cohorts", "",
    ]
    for name, x in cohorts.items():
        lines.append(
            f"- **{name}**: {x['wallets']} wallets; {x['net_tokens']:,.2f} net tokens "
            f"({x['net_supply_pct']:.4f}% supply); {x['net_curve_sol']:.3f} net curve SOL"
        )
    lines.extend(["", "## Top retained pre-migration accumulators", ""])
    for i, x in enumerate(wallets[:30], 1):
        lines.append(
            f"{i}. `{x['wallet']}` — first={x['first_buy_iso']}; net={x['net_tokens']:,.2f}; "
            f"current={x.get('current_tokens', 0):,.2f}; retained={x.get('retention_vs_curve_net_pct', 0):.2f}%"
        )
    (OUT / "report.md").write_text("\n".join(lines))
    dump("status.json", {"ok": True, "finished": iso(time.time()), "summary": "summary.json"})


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        dump("status.json", {"ok": False, "error": str(exc), "traceback": traceback.format_exc(), "rpc": dict(R.stats)})
        print(traceback.format_exc(), flush=True)
