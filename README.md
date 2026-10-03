# m_t_se0821 ポートフォリオ

HTML / CSS / 素の JavaScript だけで作った1ページの静的サイトです。ビルドは不要です。

## ファイル構成

```
portfolio/
├── index.html        本体（1ページ）
├── favicon.svg       ファビコン
├── css/style.css     スタイル
├── js/main.js        画像が未配置のときにダミー枠を出すだけの処理
├── images/           スクショ・OGP画像の置き場（images/README.md 参照）
├── samples/          Webサイト・LP制作サンプル（架空の店舗・企業）
│   ├── corporate/    コーポレートサイト（5ページ）
│   ├── restaurant/   飲食店の多言語サイト（4言語）
│   ├── seitai/       整体院LP
│   ├── recruit/      採用LP
│   └── school/       オンライン講座LP
├── cases/
│   └── dx-proposal/  業務改善・DX提案の資料（印刷・PDF対応）
├── systems/          業務システムのデモ（データはブラウザの localStorage に保存）
│   ├── common/       3本で共通の部品（保存・一覧表・モーダル・画面の枠組み）
│   ├── reserve/      予約・顧客管理
│   ├── inventory/    在庫・発注管理
│   └── invoice/      見積書・請求書作成
└── README.md
```

## ローカルで確認する

- いちばん簡単：`index.html` をダブルクリックしてブラウザで開く
- 本番に近い形で確認したい場合（Node.js が入っていれば）：

```bash
npx serve .
```

表示された `http://localhost:3000` を開きます。

## 公開前に差し替える箇所

| 箇所 | ファイル | 内容 |
| --- | --- | --- |
| 作品のスクショ | `images/` | `salesforce-learning.png` / `tabistock.png` / `ai-company.png` を配置 |
| OGP画像 | `images/ogp.png` | 1200×630 の画像を配置 |
| OGPのURL | `index.html` の `og:url` / `og:image` | `https://example.vercel.app/` を公開URLに置き換え |
| プロフィールURL | `index.html` のお問い合わせ欄 | 「★ここに〜のプロフィールURLを入れる」の下の `href="#"` |
| AI会社の説明・URL | `index.html` の「★作品3：AI会社」の範囲 | 説明文の修正、公開後は「準備中」をリンクボタンに変更 |

## 公開・更新の手順

[手順書.md](手順書.md) を参照（初回の公開手順と、毎回の更新手順をまとめています）。
