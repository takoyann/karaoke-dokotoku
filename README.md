# 🎤 カラオケどこ得？ — 全国店舗データ基盤 v1

7チェーンの公式店舗検索を一次情報源として、店舗データを収集・検証するための実装。

## 対象
まねきねこ / ビッグエコー / BanBan / ジャンカラ / カラオケ館 / コート・ダジュール / 快活CLUB（カラオケ対応店）

## 「本物」にするためのルール
- 店舗名・住所・電話・営業時間などは公式サイトから取得
- 取得できない値は推測しない
- 料金は店舗固有データとして分離
- 各レコードに `source_url` と `checked_at` を残す
- 自動抽出した値は `auto-extracted-needs-review` として扱う
- 料金の比較に使う前に `verified` に昇格させる

## 現在のデータ
`data/stores.seed.json` は今回Webで公式ページを確認できた実データの初期セット。
完全な全国データは `scripts/collect_official.py` をGitHub Actions等で実行して追加取得する。

## 実行
```bash
pip install -r requirements.txt
playwright install chromium
python scripts/collect_official.py
python scripts/validate.py
```

## 重要
公式サイトごとにHTML構造が違うため、現状の共通抽出は保守的なフォールバック。
次の段階で7チェーンごとの専用パーサーを追加し、店舗数を公式表示件数と照合する。

料金については、まねきねこ・ビッグエコー・快活CLUBなど公式にも店舗ごとに異なる旨の案内があるため、全国共通料金として扱わない。
