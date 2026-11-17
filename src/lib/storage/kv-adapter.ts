/**
 * キーと文字列の値を読み書きする、いちばん下の層。保存先ごとに実装を差し替える。
 * DAO（kv-dao.ts）はこの上に作るので、localStorage 以外のキー・バリュー型の保存先
 * （IndexedDB、拡張機能の storage など）にも、この実装を足すだけで移せる。
 */
export interface KeyValueAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

/** テスト・サーバー側描画用（ブラウザの外では localStorage が無いため） */
export class MemoryAdapter implements KeyValueAdapter {
  private readonly data = new Map<string, string>();
  async get(key: string) {
    return this.data.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.data.set(key, value);
  }
  async remove(key: string) {
    this.data.delete(key);
  }
}

/** ブラウザの localStorage（MVP の保存先） */
export class LocalStorageAdapter implements KeyValueAdapter {
  constructor(private readonly storage: Storage) {}
  async get(key: string) {
    return this.storage.getItem(key);
  }
  async set(key: string, value: string) {
    this.storage.setItem(key, value);
  }
  async remove(key: string) {
    this.storage.removeItem(key);
  }
}
