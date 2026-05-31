// 現在値を保持し、購読時に即座に最新値を流す軽量オブザーバブル。
export class Emitter<T> {
  private listeners = new Set<(v: T) => void>();
  private current: T;

  constructor(initial: T) {
    this.current = initial;
  }

  get value(): T {
    return this.current;
  }

  set(value: T): void {
    this.current = value;
    for (const l of this.listeners) l(value);
  }

  subscribe(cb: (v: T) => void): () => void {
    this.listeners.add(cb);
    cb(this.current); // 即座に現在値を通知
    return () => {
      this.listeners.delete(cb);
    };
  }
}
