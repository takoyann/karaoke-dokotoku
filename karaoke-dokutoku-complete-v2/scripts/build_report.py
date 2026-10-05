import json
from pathlib import Path
D=Path(__file__).resolve().parents[1]/'data'
chains=json.loads((D/'chains.json').read_text()); stores=json.loads((D/'stores.json').read_text()); prices=json.loads((D/'prices.json').read_text())
counts={c['id']:0 for c in chains}
for s in stores: counts[s['chain_id']]=counts.get(s['chain_id'],0)+1
rows=['# Data build report','',f'- generated stores: {len(stores)}',f'- verified price records in seed: {len(prices)}','']
for c in chains: rows.append(f"- {c['name']}: {counts.get(c['id'],0)} store records")
(D/'BUILD_REPORT.md').write_text('\n'.join(rows),encoding='utf-8')
