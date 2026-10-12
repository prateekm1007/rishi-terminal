#!/usr/bin/env python3
"""Round-55 NSE-holiday adoption cross-check (OFFLINE tooling only — NOT in the app).

Three-way verification of data/nse-holidays.json against:
  1. GauravSh-7/nse-trading-holidays-2018-2026 (MIT) — the founder-designated
     in-app source (community-compiled; README: "independently compiled and
     cross-verified against official NSE India holiday calendars and exchange
     circulars"; segment NSE F&O). Data file: data/nse_trading_holidays_2018_2026.parquet
     (fetched 2026-10-13).
  2. data/nse-holidays.json — the adopted single source of truth in this repo.
  3. pandas_market_calendars (MIT) NSE calendar — the founder-designated OFFLINE
     cross-check ("Use as an offline cross-check, not in the app").

Acceptance (the founder's condition "Check each 2026 holiday against NSE
circulars before use", discharged as far as this environment permits):
  - The designated source and the adopted file agree on EVERY carried date.
  - pandas_market_calendars agrees on every carried date except exactly
    2026-01-15 (Makar Sankranti) — DISPUTED, EXCLUDED, fail-closed: a false
    closed-day would silence the 15-minute freshness rule on a live session;
    a missing one only adds refreshes. Resolution route: the December ritual
    against NSE's official list (the exchange page is Akamai-denied from this
    environment; docs/evidence/round55/r55-holidays-crosscheck.md).

Run:  python3 -m venv .venv-r55 && .venv-r55/bin/pip install pandas pyarrow pandas_market_calendars
      .venv-r55/bin/python scripts/r55/holidayCrosscheck.py [path/to/nse_trading_holidays_2018_2026.parquet]
Exit 0 = acceptance holds; exit 1 = a carried date is disputed or missing.
"""
import json
import sys
from datetime import date
from pathlib import Path

import pandas as pd
import pandas_market_calendars as mcal

REPO = Path(__file__).resolve().parents[2]
ADOPTED = REPO / "data" / "nse-holidays.json"
DEFAULT_PARQUET = REPO / "scripts" / "r55" / "nse_trading_holidays_2018_2026.parquet"

DISPUTED = {"2026-01-15"}  # excluded from the adopted file pending the circular check


def iso(d) -> str:
    return pd.Timestamp(d).date().isoformat()


def main() -> int:
    parquet = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_PARQUET
    df = pd.read_parquet(parquet)
    date_col = next(c for c in df.columns if "date" in c.lower())
    yr_col = next((c for c in df.columns if "year" in c.lower()), None)
    sub = df[df[yr_col] == 2026] if yr_col is not None else df[pd.to_datetime(df[date_col]).dt.year == 2026]
    g7_all = sorted({iso(d) for d in pd.to_datetime(sub[date_col])})
    # weekday rows only — the designated source also lists weekend festival
    # dates, which lib/marketHours.ts handles via the weekend rule, not this file
    g7 = [d for d in g7_all if date.fromisoformat(d).weekday() < 5]
    print(f"GauravSh-7 2026: {len(g7_all)} rows, {len(g7)} weekday closures")
    for d in g7:
        print("  ", d, date.fromisoformat(d).strftime("%A"))

    adopted = sorted(json.loads(ADOPTED.read_text())["holidays"])
    print(f"\nadopted data/nse-holidays.json ({len(adopted)}):")
    for d in adopted:
        print("  ", d, date.fromisoformat(d).strftime("%A"))

    cal = mcal.get_calendar("NSE")
    sched = cal.schedule(start_date="2026-01-01", end_date="2026-12-31")
    open_days = {iso(ts.date()) for ts in sched.index}
    all_weekdays = []
    d = date(2026, 1, 1)
    while d <= date(2026, 12, 31):
        if d.weekday() < 5:
            all_weekdays.append(iso(d))
        d = date.fromordinal(d.toordinal() + 1)
    pmc = sorted(set(all_weekdays) - open_days)
    print(f"\npandas_market_calendars NSE 2026 weekday closures ({len(pmc)}):")
    for d in pmc:
        print("  ", d, date.fromisoformat(d).strftime("%A"))

    print("\n=== ACCEPTANCE ===")
    ok = True
    # 1. every adopted date is in the designated source
    missing = sorted(set(adopted) - set(g7))
    if missing:
        ok = False
        print("FAIL: adopted dates missing from the designated source:", missing)
    else:
        print(f"PASS: designated source carries every adopted date ({len(adopted)}).")
    # 2. the cross-check agrees except exactly the documented disputed set
    pmc_disagrees = sorted(set(pmc) - set(adopted))
    pmc_extra_in_adopted = sorted(set(adopted) - set(pmc))
    if pmc_disagrees == sorted(DISPUTED) and not pmc_extra_in_adopted:
        print(f"PASS: cross-check agrees on {len(adopted)} dates; disagrees exactly on the documented disputed set {sorted(DISPUTED)}.")
    else:
        ok = False
        print(f"FAIL: cross-check delta drifted. pmc-only: {pmc_disagrees} adopted-only: {pmc_extra_in_adopted} (expected disputed: {sorted(DISPUTED)})")

    print("\nRESULT:", "ACCEPTANCE HOLDS" if ok else "ACCEPTANCE FAILED — reconcile before use")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
