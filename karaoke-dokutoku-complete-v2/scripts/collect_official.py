from __future__ import annotations
import argparse, hashlib, json, re, time
from datetime import date
from pathlib import Path
from urllib.parse import urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/'data'; TODAY=str(date.today())
CHAINS={x['id']:x for x in json.loads((DATA/'chains.json').read_text(encoding='utf-8'))}
STORE_PATH=DATA/'stores.json'
S=requests.Session(); S.headers.update({'User-Agent':'KaraokeDokotokuDataBot/1.0 (+https://github.com/takoyann/karaoke-dokotoku)','Accept-Language':'ja,en;q=0.8'})
DELAY=1.0

def clean(s): return re.sub(r'\s+',' ',s or '').strip()
def fetch(url):
    r=S.get(url,timeout=30); r.raise_for_status(); time.sleep(DELAY); return r.text
def absurl(base,u): return urljoin(base,u)
def samehost(a,b): return urlparse(a).netloc==urlparse(b).netloc

def jsonld(sp):
    out=[]
    for t in sp.select('script[type="application/ld+json"]'):
        try:
            x=json.loads(t.string or t.get_text())
            out += x if isinstance(x,list) else x.get('@graph',[]) if isinstance(x,dict) and isinstance(x.get('@graph'),list) else [x]
        except Exception: pass
    return out

def store_from_page(chain,url):
    sp=BeautifulSoup(fetch(url),'html.parser'); text=clean(sp.get_text(' ',strip=True)); j={}
    for x in jsonld(sp):
        typ=x.get('@type') if isinstance(x,dict) else None
        if typ in ('LocalBusiness','Store','Organization') or (isinstance(typ,list) and 'LocalBusiness' in typ):
            a=x.get('address') or {}; g=x.get('geo') or {}
            j={'name':clean(x.get('name')),'address':clean(' '.join(str(a.get(k,'')) for k in ('postalCode','addressRegion','addressLocality','streetAddress'))),'phone':clean(x.get('telephone')),'lat':g.get('latitude'),'lon':g.get('longitude')}; break
    name=j.get('name') or clean(sp.title.get_text(' ',strip=True) if sp.title else '')
    phone=j.get('phone') or (re.search(r'0\d{1,4}[-ー]\d{2,4}[-ー]\d{3,4}',text) or [None])[0]
    features=[]
    for key,terms in {'parking':['駐車場','パーキング'],'drink_bar':['ドリンクバー'],'alcohol':['アルコール','飲み放題'],'food':['フードメニュー'],'wifi':['Wi-Fi','wifi'],'charging':['充電器','充電'],'kids_room':['キッズルーム']}.items():
        if any(t.lower() in text.lower() for t in terms): features.append(key)
    sid=f"{chain}_{hashlib.sha1(urlparse(url).path.encode()).hexdigest()[:12]}"
    return {'id':sid,'chain_id':chain,'name':name or None,'address':j.get('address') or None,'phone':phone,'latitude':j.get('lat'),'longitude':j.get('lon'),'features':features,'source_url':url,'source_type':'official','checked_at':TODAY,'data_status':'auto'}

def links(index,chain):
    sp=BeautifulSoup(fetch(index),'html.parser'); out=[]
    for a in sp.select('a[href]'):
        u=absurl(index,a.get('href')); h=(u+' '+clean(a.get_text(' ',strip=True))).lower()
        if not samehost(index,u): continue
        patterns={
          'jankara':[r'/shop/\d+/?$'], 'banban':[r'/shop-list/\d+\.html$'],
          'big_echo':[r'/shop_info/'], 'kaikatsu':[r'/shop/detail/\d+\.html'],
          'cote_d_azur':[r'/branch/[^/]+/?$'], 'manekineko':[r'/shop/|/store/|/locations/'],
          'karaoke_kan':[r'/shop/[^?]+']}.get(chain,[r'/shop/'])
        if any(re.search(p,h) for p in patterns): out.append(u)
    return list(dict.fromkeys(out))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--chain',default='all'); a=ap.parse_args()
    old=json.loads(STORE_PATH.read_text(encoding='utf-8')); by={x['id']:x for x in old}
    ids=list(CHAINS) if a.chain=='all' else [a.chain]
    for cid in ids:
        try:
            urls=links(CHAINS[cid]['store_index'],cid); print(cid,len(urls))
            for u in urls:
                try:
                    x=store_from_page(cid,u)
                    if x['name']: by[x['id']]=x
                except Exception as e: print('skip',u,e)
        except Exception as e: print('CHAIN FAILED',cid,e)
    STORE_PATH.write_text(json.dumps(sorted(by.values(),key=lambda x:(x['chain_id'],x.get('name') or '')),ensure_ascii=False,indent=2),encoding='utf-8')
if __name__=='__main__': main()
