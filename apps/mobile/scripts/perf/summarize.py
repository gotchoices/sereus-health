"""Summarize `[perf]` lines from a logcat dump (see screen-timings.sh and src/db/perf.ts)."""
import re
import sys

log, label, load = sys.argv[1], sys.argv[2], sys.argv[3]


def ts(groups):
    h, m, s = groups
    return int(h) * 3600000 + int(m) * 60000 + float(s) * 1000


cur = None
visits = []
counts = {}
queries = []
for line in open(log, errors='replace'):
    m = re.match(r'\S+ (\d+):(\d+):(\d+\.\d+)', line)
    if not m:
        continue
    t = ts(m.groups())
    s = re.search(r"\[perf\] screen (\S+)", line)
    if s:
        name = s.group(1)
        # One screen change can log twice (route change + remount): count it once.
        if cur and cur['screen'] == name and t - cur['t0'] < 1500:
            continue
        counts[name] = counts.get(name, 0) + 1
        cur = {'screen': name, 'visit': counts[name], 't0': t, 'n': 0, 'sum': 0.0, 'max': 0.0, 'last': t}
        visits.append(cur)
        continue
    q = re.search(r"\[perf\] sql (\d+) rows=(\S+) (.*)$", line)
    if q and cur:
        ms = float(q.group(1))
        cur['n'] += 1
        cur['sum'] += ms
        cur['max'] = max(cur['max'], ms)
        cur['last'] = t
        queries.append((ms, cur['screen'], q.group(2), q.group(3).rstrip("'").strip()[:80]))

print(f"\n== {label}   (host load {load})")
print(f"{'screen':<20}{'visit':>6}{'queries':>9}{'sum ms':>9}{'max ms':>9}{'wall ms':>9}")
for v in visits:
    print(f"{v['screen']:<20}{v['visit']:>6}{v['n']:>9}{v['sum']:>9.0f}{v['max']:>9.0f}{v['last'] - v['t0']:>9.0f}")
print("\nslowest queries:")
for ms, scr, rows, sql in sorted(queries, reverse=True)[:10]:
    print(f"  {ms:>6.0f} ms  {scr:<18} rows={rows:<10} {sql}")
