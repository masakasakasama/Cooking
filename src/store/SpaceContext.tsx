import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_DISPLAY_SETTINGS,
  DEFAULT_PREFERENCES,
  type DisplaySettings,
  type Lang,
  type Preferences,
  type Recipe,
  type ShoppingItem,
  type SpaceMeta,
  type SyncStatus,
} from "../types";
import type { SpaceStore } from "../data/store";
import { createStore } from "../data/createStore";

interface SpaceContextValue {
  spaceId: string;
  store: SpaceStore | null;
  ready: boolean;
  mode: "local" | "cloud" | null;

  syncStatus: SyncStatus;
  meta: SpaceMeta | null;
  recipes: Recipe[];
  shoppingItems: ShoppingItem[];
  preferences: Preferences;
  displaySettings: DisplaySettings;

  lang: Lang;
  setLang: (lang: Lang) => void;
}

const SpaceContext = createContext<SpaceContextValue | null>(null);

export function SpaceProvider({
  spaceId,
  initialName,
  children,
}: {
  spaceId: string;
  initialName?: string;
  children: ReactNode;
}) {
  const [store, setStore] = useState<SpaceStore | null>(null);
  const [ready, setReady] = useState(false);

  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ state: "connecting", pendingWrites: 0 });
  const [meta, setMeta] = useState<SpaceMeta | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [preferences, setPreferences] = useState<Preferences>({ ...DEFAULT_PREFERENCES });
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>({
    ...DEFAULT_DISPLAY_SETTINGS,
  });

  // initialName は最初のマウント時のみ使う（再レンダーで作り直さない）
  const initialNameRef = useRef(initialName);

  useEffect(() => {
    let disposed = false;
    let activeStore: SpaceStore | null = null;
    const unsubs: Array<() => void> = [];

    setReady(false);
    createStore(spaceId, { initialName: initialNameRef.current })
      .then((s) => {
        if (disposed) {
          s.dispose();
          return;
        }
        activeStore = s;
        setStore(s);
        unsubs.push(s.onSyncStatus(setSyncStatus));
        unsubs.push(s.onMeta(setMeta));
        unsubs.push(s.onRecipes(setRecipes));
        unsubs.push(s.onShoppingItems(setShoppingItems));
        unsubs.push(s.onPreferences(setPreferences));
        unsubs.push(s.onDisplaySettings(setDisplaySettings));
        setReady(true);
      })
      .catch((err) => {
        console.error("[SpaceProvider] ストア生成に失敗", err);
        setSyncStatus({ state: "error", pendingWrites: 0, message: String(err) });
      });

    return () => {
      disposed = true;
      for (const u of unsubs) u();
      activeStore?.dispose();
    };
  }, [spaceId]);

  const setLang = (lang: Lang) => {
    setDisplaySettings((s) => ({ ...s, lang })); // 即時 UI 反映
    void store?.saveDisplaySettings({ ...displaySettings, lang });
  };

  const value: SpaceContextValue = useMemo(
    () => ({
      spaceId,
      store,
      ready,
      mode: store?.mode ?? null,
      syncStatus,
      meta,
      recipes,
      shoppingItems,
      preferences,
      displaySettings,
      lang: displaySettings.lang,
      setLang,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spaceId, store, ready, syncStatus, meta, recipes, shoppingItems, preferences, displaySettings],
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace(): SpaceContextValue {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used within SpaceProvider");
  return ctx;
}
