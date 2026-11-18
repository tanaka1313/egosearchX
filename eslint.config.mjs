import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const BACKEND_MESSAGE =
  "画面・ストアが import してよいのは @/api だけ（docs/api-spec.md 1.2）";

/** 画面から import できない、バックエンドの内部。`withBackend` が true なら @/backend も禁止する */
function backendImports(withBackend) {
  const groups = ["lib/query", "lib/url", "lib/launch", "lib/storage", "data"];
  if (withBackend) groups.push("backend");
  return groups.map((g) => ({
    group: [`@/${g}`, `@/${g}/*`],
    message: BACKEND_MESSAGE,
  }));
}

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  // 画面・ストア・辞書が import してよいのは契約（@/api）だけ（docs/api-spec.md 1.2）。
  // lib/utils・lib/build-info・components/ui は画面の道具なので除く（パターンで個別に指定している）。
  // モックは破棄予定のため対象外。
  {
    files: [
      "src/app/**/*.{ts,tsx}",
      "src/components/**/*.{ts,tsx}",
      "src/store/**/*.{ts,tsx}",
      "src/messages/**/*.{ts,tsx}",
    ],
    ignores: ["src/app/mock/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: backendImports(true) }],
    },
  },
  // 組み立ての1か所だけが @/backend を import できる
  {
    files: ["src/app/providers.tsx"],
    rules: {
      "no-restricted-imports": ["error", { patterns: backendImports(false) }],
    },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  prettier,
];

export default eslintConfig;
