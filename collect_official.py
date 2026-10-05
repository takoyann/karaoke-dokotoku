"""
Official-source collector.

This version is intentionally conservative:
- fetches only official store-list pages configured in sources.json
- keeps source URLs and retrieval timestamps
- never invents missing fields
- writes raw HTML/text snapshots for debugging
- starts with verified seed data in data/stores.seed.json

Run:
  pip install -r requirements.txt
  playwright install chromium
  python scripts/collect_official.py
"""

from __future__ import annotations
import json, re, hashlib, asyncio
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse, urljoin
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/"data"; RAW=ROOT/"raw"
RAW.mkdir(exist_ok=True)

CHAINS=json.loads((DATA/"chains.json").read_text(encoding="utf-8"))

def norm(s):
    return re.sub(r"\s+"," ",s or "").strip()

def slug(s):
    return re.sub(r"[^0-9A-Za-zぁ-んァ-ヶ一-龥]+","-",norm(s)).strip("-").lower()

async def get_page(browser, url):
    page=await browser.new_page(locale="ja-JP")
    await page.goto(url, wait_until="domcontentloaded", timeout=60000)
    await page.wait_for_timeout(2500)
    text=await page.locator("body").inner_text()
    html=await page.content()
    await page.close()
    return text, html

def extract_storeish_blocks(text, chain_id):
    # Fallback only. It deliberately requires recognizable Japanese address/phone patterns.
    lines=[norm(x) for x in text.splitlines() if norm(x)]
    records=[]
    phone_re=re.compile(r"0\d{1,4}[-－]\d{2,4}[-－]\d{3,4}")
    postal_re=re.compile(r"〒?\d{3}[-－]\d{4}")
    for i,line in enumerate(lines):
        if not ("店" in line or "CLUB" in line):
            continue
        window=" ".join(lines[i:i+8])
        pm=phone_re.search(window)
        am=postal_re.search(window)
        if not am:
            continue
        addr=window[am.end():]
        if pm:
            addr=addr.split(pm.group(1))[0]
        addr=norm(addr)[:180]
        records.append({
            "id": f"{chain_id}_{slug(line)[:80]}",
            "chain_id": chain_id,
            "name": line,
            "address": addr or None,
            "phone": pm.group(1) if pm else None,
            "source_url": None,
            "checked_at": datetime.now(timezone.utc).date().isoformat(),
            "data_status":"auto-extracted-needs-review"
        })
    # de-dupe
    out=[]; seen=set()
    for r in records:
        if r["id"] not in seen:
            seen.add(r["id"]); out.append(r)
    return out

async def main():
    seeds=json.loads((DATA/"stores.seed.json").read_text(encoding="utf-8"))
    seed_by_id={x["id"]:x for x in seeds}
    async with async_playwright() as p:
        browser=await p.chromium.launch()
        all_records=dict(seed_by_id)
        for chain in CHAINS:
            for url in chain["sources"]:
                try:
                    text,html=await get_page(browser,url)
                    stamp=datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
                    fn=RAW/f"{chain['id']}_{hashlib.sha1(url.encode()).hexdigest()[:10]}_{stamp}.html"
                    fn.write_text(html,encoding="utf-8")
                    extracted=extract_storeish_blocks(text,chain["id"])
                    for r in extracted:
                        r["source_url"]=url
                        # Never overwrite verified seed with weaker extraction.
                        all_records.setdefault(r["id"],r)
                    print(chain["id"],url,"extracted",len(extracted))
                except Exception as e:
                    print("ERROR",chain["id"],url,repr(e))
        await browser.close()
    stores=sorted(all_records.values(),key=lambda x:(x.get("chain_id",""),x.get("name","")))
    (DATA/"stores.json").write_text(json.dumps(stores,ensure_ascii=False,indent=2),encoding="utf-8")
    print("total records:",len(stores))

if __name__=="__main__":
    asyncio.run(main())
