import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"data"
chains=json.loads((DATA/"chains.json").read_text(encoding="utf-8"))
stores=json.loads((DATA/"stores.json").read_text(encoding="utf-8"))
prices=json.loads((DATA/"prices.json").read_text(encoding="utf-8"))
valid={c["id"] for c in chains}
errs=[]
for s in stores:
    if s.get("chain_id") not in valid: errs.append("unknown chain "+str(s.get("id")))
    if not s.get("source_url"): errs.append("missing source "+str(s.get("id")))
print("chains",len(chains),"stores",len(stores),"prices",len(prices))
if errs:
    print("\n".join(errs[:50])); raise SystemExit(1)
