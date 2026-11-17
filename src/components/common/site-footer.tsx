import { VersionDialog } from "./version-dialog";

export function SiteFooter() {
  return (
    <footer className="flex items-center justify-end border-t px-3 py-1">
      <VersionDialog />
    </footer>
  );
}
