import { useState } from "react";
import { useSpace } from "../store/SpaceContext";
import { t } from "../i18n";
import { pick } from "../lib/display";
import { newId } from "../lib/id";
import type { ShoppingItem } from "../types";

export function ShoppingView() {
  const { lang, shoppingItems, store } = useSpace();
  const [nameJa, setNameJa] = useState("");
  const [nameDe, setNameDe] = useState("");
  const [amount, setAmount] = useState("");
  // 「買った」アニメーション中の id（フェードアウト後に削除する）
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  const add = async () => {
    if (!store) return;
    if (!nameJa.trim() && !nameDe.trim()) return;
    const now = Date.now();
    const item: ShoppingItem = {
      id: newId(),
      nameJa: nameJa.trim(),
      nameDe: nameDe.trim(),
      amount: amount.trim(),
      checked: false,
      recipeIds: [],
      createdAt: now,
      updatedAt: now,
    };
    await store.upsertShoppingItem(item);
    setNameJa("");
    setNameDe("");
    setAmount("");
  };

  // チェック = 買った = 完了して消える（タスク完了の挙動）。
  // 線が引かれてフェードアウトしてから、両デバイスのリストから削除（同期）。
  const complete = (item: ShoppingItem) => {
    if (!store) return;
    if (completing.has(item.id)) return;
    setCompleting((prev) => new Set(prev).add(item.id));
    window.setTimeout(() => {
      void store.deleteShoppingItem(item.id);
      setCompleting((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }, 450); // CSS のフェード時間に合わせる
  };

  const remove = async (item: ShoppingItem) => {
    if (!store) return;
    await store.deleteShoppingItem(item.id);
  };

  return (
    <div className="view">
      <div className="add-item">
        <div className="add-item-fields">
          <input placeholder={`${t("name", lang)} (JA)`} value={nameJa} onChange={(e) => setNameJa(e.target.value)} />
          <input placeholder={`${t("name", lang)} (DE)`} value={nameDe} onChange={(e) => setNameDe(e.target.value)} />
          <input
            className="amount-input"
            placeholder={t("amount", lang)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
        </div>
        <button className="btn primary" onClick={add}>
          ＋ {t("addItem", lang)}
        </button>
      </div>

      {shoppingItems.length === 0 ? (
        <p className="empty">{t("emptyShopping", lang)}</p>
      ) : (
        <ul className="shopping-list">
          {shoppingItems.map((item) => {
            const done = completing.has(item.id);
            return (
              <li key={item.id} className={`shopping-item ${done ? "completing" : ""}`}>
                <label>
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => complete(item)}
                  />
                  <span className="check-mark" />
                  <span className="item-name">
                    {pick(item.nameJa, item.nameDe, lang) || "—"}
                    {item.amount && <span className="item-amount">{item.amount}</span>}
                  </span>
                </label>
                <button className="icon-btn" onClick={() => remove(item)} aria-label="delete">
                  🗑
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="hint center small">
        {lang === "ja"
          ? "チェックすると「買った」として消えます。間違えて追加したものは🗑で削除。"
          : "Abhaken = gekauft, verschwindet. Versehentliche Einträge mit 🗑 löschen."}
      </p>
    </div>
  );
}
