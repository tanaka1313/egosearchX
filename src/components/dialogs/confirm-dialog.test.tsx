import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./confirm-dialog";

afterEach(cleanup);

function Host({
  disableOpener = false,
  onCloseAutoFocus,
}: {
  disableOpener?: boolean;
  onCloseAutoFocus?: (ev: Event) => void;
}) {
  const [open, setOpen] = useState(false);
  const [gone, setGone] = useState(false);
  return (
    <>
      <main>
        <h1>本文</h1>
        {!gone && (
          <button disabled={disableOpener} onClick={() => setOpen(true)}>
            開く
          </button>
        )}
      </main>
      <button onClick={() => setGone(true)}>起点を消す</button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="確認"
        body="本文です"
        action="実行する"
        onConfirm={() => setGone(true)}
        onCloseAutoFocus={onCloseAutoFocus}
      />
    </>
  );
}

/** jsdom の click はフォーカスを動かさないので、実ブラウザと同じく押す前にフォーカスする */
function openFrom(name: string) {
  const b = screen.getByRole("button", { name });
  b.focus();
  fireEvent.click(b);
  return b;
}

describe("ConfirmDialog：閉じたあとのフォーカス", () => {
  it("キャンセルで閉じると、開いた要素へ戻る", async () => {
    render(<Host />);
    const opener = openFrom("開く");
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    );
    await vi.waitFor(() => expect(opener).toHaveFocus());
  });

  it("Esc で閉じても、開いた要素へ戻る", async () => {
    render(<Host />);
    const opener = openFrom("開く");
    await screen.findByRole("alertdialog");
    fireEvent.keyDown(document.activeElement ?? document, { key: "Escape" });
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    );
    await vi.waitFor(() => expect(opener).toHaveFocus());
  });

  it("実行して開いた要素が消えたときは、本文（main）へ移り、body に落ちない", async () => {
    render(<Host />);
    openFrom("開く");
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "実行する" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    );
    await vi.waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
  });

  it("開いた要素が無効になっていたときも、本文（main）へ移る", async () => {
    const { rerender } = render(<Host />);
    openFrom("開く");
    await screen.findByRole("alertdialog");
    rerender(<Host disableOpener />);
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    );
    await vi.waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
  });

  it("フォーカスが body のまま開いたとき（Safari のマウス操作）は、body へ戻さず本文へ移る", async () => {
    render(<Host />);
    expect(document.activeElement).toBe(document.body);
    fireEvent.click(screen.getByRole("button", { name: "開く" }));
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    );
    await vi.waitFor(() => expect(screen.getByRole("main")).toHaveFocus());
  });

  it("呼び出し側が onCloseAutoFocus を渡したときは、そちらが決め、既定の戻しはしない", async () => {
    const custom = vi.fn((ev: Event) => {
      ev.preventDefault();
      screen.queryByRole("button", { name: "起点を消す" })?.focus();
    });
    render(<Host onCloseAutoFocus={custom} />);
    openFrom("開く");
    await screen.findByRole("alertdialog");
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
    await vi.waitFor(() =>
      expect(screen.queryByRole("alertdialog")).toBeNull(),
    );
    await vi.waitFor(() => expect(custom).toHaveBeenCalledTimes(1));
    await vi.waitFor(() =>
      expect(screen.getByRole("button", { name: "起点を消す" })).toHaveFocus(),
    );
  });
});
