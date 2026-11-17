import { VersionDialog } from "./version-dialog";

export function SiteFooter() {
  return (
    <footer className="flex items-center justify-between gap-2 border-t px-3 py-1">
      {/* 公式と誤認されないよう、非公式であることを常に示す（docs/requirements.md 7章） */}
      <p className="min-w-0 truncate text-xs text-muted-foreground">
        ファンが作った非公式のツールです
      </p>
      <VersionDialog />
    </footer>
  );
}
