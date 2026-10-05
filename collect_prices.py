from __future__ import annotations
import argparse,json,re,time
from datetime import date
from pathlib import Path
import requests
from bs4 import BeautifulSoup
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'data'; TODAY=str(date.today())
STORES=json.loads((DATA/'stores.json').read_text(encoding='utf-8')); OUT=DATA/'prices_review.json'
S=requests.Session(); S.headers.update({'User-Agent':'KaraokeDokotokuPriceBot/1.0 (+https://github.com/takoyann/karaoke-dokutoku)'})

def clean(x): return re.sub(r'\s+',' ',x or '').strip()
def yen(x):
    m=re.search(r'(?:¥|￥)?\s*([0-9]{2,5})\s*円?',x.replace(',',''))
    return int(m.group(1)) if m else None

def parse_tables(st):
    r=S.get(st['source_url'],timeout=30); r.raise_for_status(); time.sleep(.5); sp=BeautifulSoup(r.text,'html.parser'); rows=[]
    # HTML tables only. Image-based tables are recorded for manual/OCR review rather than guessed.
    for table in sp.find_all('table'):
        headers=[clean(c.get_text(' ',strip=True)) for c in table.find_all('th')]
        for tr in table.find_all('tr'):
            cells=[clean(c.get_text(' ',strip=True)) for c in tr.find_all(['th','td'])]
            if len(cells)<2: continue
            blob=' | '.join(cells)
            if not re.search(r'(円|¥|料金|価格)',blob): continue
            rows.append({'store_id':st['id'],'headers':headers,'cells':cells,'source_url':st['source_url'],'checked_at':TODAY,'needs_mapping':True})
    images=[]
    for img in sp.find_all('img'):
        src=img.get('src') or img.get('data-src') or ''
        alt=clean(img.get('alt',''))
        if re.search(r'(料金|price|価格)',alt+src,re.I): images.append(src)
    return rows,images

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--store'); args=ap.parse_args(); chosen=[s for s in STORES if not args.store or s['id']==args.store]
    allrows=[]
    for s in chosen:
        try:
            rows,imgs=parse_tables(s); allrows += rows
            if imgs: allrows.append({'store_id':s['id'],'image_price_sources':imgs,'source_url':s['source_url'],'checked_at':TODAY,'needs_ocr_or_manual_mapping':True})
        except Exception as e: allrows.append({'store_id':s['id'],'source_url':s['source_url'],'checked_at':TODAY,'error':str(e)})
    OUT.write_text(json.dumps(allrows,ensure_ascii=False,indent=2),encoding='utf-8'); print('review records',len(allrows))
if __name__=='__main__': main()
