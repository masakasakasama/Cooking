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

  const toggle = async (item: ShoppingItem) => {
    if (!store) return;
    // チェック状態の変更も複数デバイスで同期される
    await store.upsertShoppingItem({ ...item, checked: !item.checked, updatedAt: Date.now() });
  };

  const remove = async (item: ShoppingItem) => {
    if (!store) return;
    await store.deleteShoppingItem(item.id);
  };

  const checkedCount = shoppingItems.filter((i) => i.checked).length;

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
          {shoppingItems.map((item) => (
            <li key={item.id} className={`shopping-item ${item.checked ? "checked" : ""}`}>
              <label>
                <input type="checkbox" checked={item.checked} onChange={() => toggle(item)} />
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
          ))}
        </ul>
      )}

      {checkedCount > 0 && (
        <button className="btn ghost block" onClick={() => store?.clearCheckedShoppingItems()}>
          {t("clearChecked", lang)} ({checkedCount})
        </button>
      )}
    </div>
  );
}
