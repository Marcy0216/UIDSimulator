"use client";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { loadForecast, loadManifest, Manifest, PackedDrop } from "./packed";

type Item = { id: string; name: string };
function parseNumber(value: string) { const text = value.normalize("NFKC").replace(/[,_\s]/g, ""); const man = text.match(/^(\d+(?:\.\d+)?)万$/); return man ? Number(man[1]) * 10000 : Number(text); }

export default function Home() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [selected, setSelected] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState<"All" | "Legendary" | "Mythical">("All");
  const [start, setStart] = useState("1");
  const [count, setCount] = useState("1000000");
  const [results, setResults] = useState<PackedDrop[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => { loadManifest(window.location.href).then(setManifest); fetch(new URL("eq-items.json", window.location.href)).then((r) => r.json() as Promise<Item[]>).then(setItems).catch(() => setItems([])); }, []);
  const names = useMemo(() => new Map(items.map((item) => [item.id, item.name])), [items]);
  const suggestions = useMemo(() => { const q = query.trim().toLowerCase(), chosen = new Set(selected.map((item) => item.id)); return q ? items.filter((item) => !chosen.has(item.id) && (item.name.toLowerCase().includes(q) || item.id.toLowerCase().includes(q))).slice(0, 8) : []; }, [items, query, selected]);
  async function search(event: FormEvent) {
    event.preventDefault(); setMessage("");
    const first = parseNumber(start), amount = parseNumber(count);
    if (!Number.isInteger(first) || first < 1 || first > 2147483647) return setMessage("開始UIDは1〜2,147,483,647で指定してください。");
    if (!Number.isInteger(amount) || amount < 1 || amount > 10000000 || first + amount - 1 > 2147483647) return setMessage("検索するUID数は1〜10,000,000、かつUID上限内で指定してください。");
    if (query.trim()) return setMessage("入力中の装備を候補から選択してください。");
    const activeManifest = manifest ?? await loadManifest(window.location.href);
    if (!activeManifest?.shards.length) return setMessage("検索データを読み込めませんでした。ページを再読み込みしてください。");
    if (activeManifest !== manifest) setManifest(activeManifest);
    setLoading(true);
    try { const rows = await loadForecast(activeManifest, first, amount, 5000, rarity, selected.map((item) => item.id)); setResults(rows); setMessage(rows.length ? `${rows.length.toLocaleString()}件見つかりました` : "条件に一致する装備はありませんでした"); }
    catch { setMessage("検索データを読み込めませんでした。しばらくしてから再度お試しください。"); }
    finally { setLoading(false); }
  }
  return <main><header className="hero"><nav><span className="brand"><i /> UID装備検索</span><span className="beta">試験版</span></nav><div className="hero-copy"><p className="eyebrow">ELIN UID SIMULATOR</p><h1>装備抽選<br /><em>シミュレーター</em></h1><p className="lede">装備とレアリティを選び、指定した範囲から条件に合うUIDを検索できます。</p></div></header>
    <section className="workspace"><form onSubmit={search} className="control-panel"><div className="section-label"><span>01</span> 検索条件</div><label>狙う装備<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="装備名を入力して追加" autoComplete="off" /></label>{suggestions.length > 0 && <div className="suggestions">{suggestions.map((item) => <button type="button" key={item.id} onClick={() => { setSelected((current) => [...current, item]); setQuery(""); }}><span>{item.name || item.id}</span></button>)}</div>}{selected.length > 0 && <div className="chips">{selected.map((item) => <button type="button" key={item.id} onClick={() => setSelected((current) => current.filter((value) => value.id !== item.id))}>{item.name || item.id}<span>×</span></button>)}</div>}<label>レアリティ<select value={rarity} onChange={(e) => setRarity(e.target.value as typeof rarity)}><option value="All">すべて</option><option value="Legendary">奇跡</option><option value="Mythical">神器</option></select></label><label>開始UID<input value={start} onChange={(e) => setStart(e.target.value)} inputMode="numeric" /></label><label>検索するUID数<input value={count} onChange={(e) => setCount(e.target.value)} inputMode="text" /></label><button type="submit" className="run" disabled={loading}>{loading ? "検索中…" : "検索する"}<span>→</span></button>{message && <p className="message">{message}</p>}<p className="hint">最大1,000万UIDまで検索できます</p></form>
      <div className="result-panel"><div className="section-label"><span>02</span> 検索結果</div><div className="stats"><article><b>{results.length.toLocaleString()}</b><small>見つかったUID</small></article><article><b>{results.filter((row) => row.rarity === "Mythical").length.toLocaleString()}</b><small>神器</small></article><article><b>{results[0] ? `+${(results[0].uid - parseNumber(start)).toLocaleString()}` : "—"}</b><small>次の候補まで</small></article></div><div className="table-wrap">{results.length === 0 ? <div className="empty"><span>◇</span><p>条件を指定して検索してください</p></div> : <table><thead><tr><th>あと</th><th>UID</th><th>レアリティ</th><th>装備</th></tr></thead><tbody>{results.map((row) => <tr key={row.uid}><td className="delta">+{(row.uid - parseNumber(start)).toLocaleString()}</td><td>{row.uid.toLocaleString()}</td><td><mark className={row.rarity.toLowerCase()}>{row.rarity === "Legendary" ? "奇跡" : "神器"}</mark></td><td><strong>{names.get(row.itemId) || row.itemId}</strong></td></tr>)}</tbody></table>}</div>{results.length === 5000 && <p className="limit">先頭5,000件を表示しています</p>}</div></section></main>;
}
