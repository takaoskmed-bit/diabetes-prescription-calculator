# 処方量計算アプリ MVP

医療者向けのインスリン・注射薬・血糖測定用品・CGM処方量計算アプリです。

## 起動

```bash
npm install
npm run dev
```

この環境では依存関係なしで確認できる静的版として `index.html` も用意しています。

## テスト

```bash
npm test
```

## 公開

### そのまま静的公開

`index.html` を Netlify、Cloudflare Pages、Vercel の静的サイト、院内Webサーバーなどに配置すると公開できます。

### GitHub Pages

このリポジトリをGitHubへpushすると、`.github/workflows/pages.yml` により `index.html` がGitHub Pagesへ公開されます。GitHub側で Pages の source を `GitHub Actions` に設定してください。

## 主な構成

- `src/lib/master.ts`: 薬剤規格、CGM交換日数のマスタ
- `src/lib/types.ts`: 型定義
- `src/utils/calculate.ts`: 計算ロジック
- `src/utils/calculate.test.ts`: 単体テスト
- `src/app/page.tsx`: 1画面完結のUI
