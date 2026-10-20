# 店舗・料金データの登録ルール

## 1. 基本情報

店舗ごとに以下の情報を登録する。

- id：店舗を識別する一意のID
- chain：チェーン名
- storeName：店舗の正式名称
- prefecture：都道府県
- city：市区町村
- address：住所
- latitude：緯度。不明ならnull
- longitude：経度。不明ならnull
- stations：最寄り駅の配列
- officialUrl：公式サイトのURL
- verifiedAt：情報を確認した日
- pricing：料金情報の配列

## 2. 料金データ

料金はpricing配列に登録する。

| 項目 | 内容 |
|---|---|
| dayType | weekday または weekend |
| timeType | daytime または night |
| plan | normal、student、freeTime |
| unit | 30min、hour、flat |
| price | 料金。数値で登録 |
| billingMinutes | 課金単位。分単位 |
| minimumMinutes | 最低利用時間。分単位 |
| minimumPeople | 適用される最低人数 |
| mandatoryFee | 必須追加料金。1人あたり |
| minimumCharge | 最低請求額 |

## 3. 登録例

以下は形式を説明するための架空データ。

```json
{
  "dayType": "weekday",
  "timeType": "daytime",
  "plan": "normal",
  "unit": "30min",
  "price": 150,
  "billingMinutes": 30,
  "minimumMinutes": 30,
  "minimumPeople": 1,
  "mandatoryFee": 0
}
```

※上記の料金は実在店舗の料金ではない。

## 4. 登録時の注意

- 料金は公式サイトなどの信頼できる情報源で確認する。
- 店舗ごとに料金が異なる場合は、店舗単位で登録する。
- 平日・土日祝、昼・夜、学生・一般を区別する。
- 税込・税別の区別を確認する。
- ワンドリンク制などの必須料金を確認する。
- フリータイムには利用可能時間や受付条件があるため、通常料金と同じ扱いにしない。
- 不明な料金は推測で登録しない。
- verifiedAtには実際に情報を確認した日を記録する。
- 料金条件が不足している場合は、確認できるまで料金比較の対象にしない。
