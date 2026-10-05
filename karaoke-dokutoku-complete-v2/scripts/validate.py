import json,sys
from pathlib import Path
D=Path(__file__).resolve().parents[1]/'data'
chains=json.loads((D/'chains.json').read_text()); stores=json.loads((D/'stores.json').read_text()); prices=json.loads((D/'prices.json').read_text()); opts=json.loads((D/'options.json').read_text())
c={x['id'] for x in chains}; s={x['id'] for x in stores}; e=[]
for x in stores:
    if x.get('chain_id') not in c:e.append('unknown chain '+x['id'])
    if not x.get('source_url'):e.append('missing source '+x['id'])
for x in prices:
    if x.get('store_id') not in s:e.append('unknown price store '+str(x.get('store_id')))
for x in opts:
    if x.get('store_id') not in s:e.append('unknown option store '+str(x.get('store_id')))
if e: print('\n'.join(e)); sys.exit(1)
print(f'VALID chains={len(chains)} stores={len(stores)} prices={len(prices)} options={len(opts)}')
