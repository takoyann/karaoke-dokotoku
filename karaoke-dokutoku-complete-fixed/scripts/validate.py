import json
from pathlib import Path
r=Path(__file__).resolve().parents[1]
for n in ["chains.json","options.json","prices.json","routes.json","stores.json"]:
 json.loads((r/"data"/n).read_text(encoding="utf-8"))
print("OK")
