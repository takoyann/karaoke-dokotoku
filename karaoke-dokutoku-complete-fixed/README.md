# カラオケどこ得？

GitHub Pages用のクリーンな構成です。

## 重要
ZIPを展開した**中身をリポジトリのルートへ**アップロードしてください。親フォルダごと入れないでください。

```text
.github/workflows/pages.yml
.github/workflows/refresh.yml
data/
scripts/
web/
README.md
```

Pages workflowは `web/` を公開します。料金・店舗データは `data/` に分離しています。

この版はまず「確実にGitHub Pagesで動く土台」を優先しており、料金データは未検証の初期サンプルです。全国全店舗の公式料金を収録済み、という意味の完全版ではありません。
