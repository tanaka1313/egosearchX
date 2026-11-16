// コミット時の検証（#5）。push 前の tsc とテストは .husky/pre-push で行う。
export default {
  // 全ステージファイルを対象に、秘密情報の混入を検出する
  "*": "secretlint",
  // tsc はファイル名を渡すと tsconfig を無視するため、関数形式でプロジェクト全体を検査する
  "*.{ts,tsx}": () => "tsc --noEmit",
  "*.{ts,tsx,js,jsx,mjs,cjs,mts}": [
    "eslint --fix",
    "prettier --write --ignore-unknown",
  ],
  "*.{json,css,md,yml,yaml}": "prettier --write --ignore-unknown",
};
