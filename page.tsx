"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Kind = "expense" | "income";
type Entry = { id: string; kind: Kind; amount: number; category: string; memo: string; date: string };

const categories: Record<Kind, string[]> = {
  expense: ["食費", "日用品", "住まい", "交通", "趣味", "医療", "その他"],
  income: ["給与", "副収入", "おこづかい", "その他"],
};
const categoryMarks: Record<string, string> = { 食費:"●", 日用品:"◆", 住まい:"■", 交通:"▲", 趣味:"★", 医療:"＋", 給与:"◎", 副収入:"◇", おこづかい:"○", その他:"・" };
const money = new Intl.NumberFormat("ja-JP");
const today = new Date().toISOString().slice(0, 10);
const currentMonth = today.slice(0, 7);

function shiftMonth(month: string, amount: number) {
  const [year, mon] = month.split("-").map(Number);
  const date = new Date(year, mon - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default function Home() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);
  const [kind, setKind] = useState<Kind>("expense");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories.expense[0]);
  const [memo, setMemo] = useState("");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(currentMonth);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("watashi-kakeibo-entries");
      if (saved) setEntries(JSON.parse(saved));
    } catch { /* 壊れた保存内容は読み飛ばします */ }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem("watashi-kakeibo-entries", JSON.stringify(entries));
  }, [entries, ready]);

  const visible = useMemo(() => entries.filter((entry) => entry.date.startsWith(month)).sort((a,b) => b.date.localeCompare(a.date)), [entries, month]);
  const income = visible.filter((entry) => entry.kind === "income").reduce((sum, entry) => sum + entry.amount, 0);
  const expense = visible.filter((entry) => entry.kind === "expense").reduce((sum, entry) => sum + entry.amount, 0);
  const balance = income - expense;
  const expenseGroups = categories.expense.map((name) => ({ name, value: visible.filter((entry) => entry.kind === "expense" && entry.category === name).reduce((sum, entry) => sum + entry.amount, 0) })).filter((item) => item.value > 0).sort((a,b) => b.value - a.value);
  const maxExpense = Math.max(...expenseGroups.map((item) => item.value), 1);
  const [yearLabel, monthLabel] = month.split("-").map(Number);

  function chooseKind(next: Kind) {
    setKind(next);
    setCategory(categories[next][0]);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    setEntries((current) => [{ id: crypto.randomUUID(), kind, amount: Math.round(parsed), category, memo: memo.trim(), date }, ...current]);
    setAmount("");
    setMemo("");
    setMonth(date.slice(0, 7));
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="わたしの家計簿 トップ"><span>わ</span> わたしの家計簿</a>
        <p><i aria-hidden="true" /> この端末に自動保存</p>
      </header>

      <section className="hero" id="top">
        <div><p className="eyebrow">MY LITTLE LEDGER</p><h1>お金の流れを、<br />やさしく見える化。</h1></div>
        <p className="hero-copy">収入と支出を記録して、今月の暮らしをひと目で確認。すべての記録はこの端末の中だけに保存されます。</p>
      </section>

      <section className="entry-card" aria-labelledby="entry-title">
        <div className="section-heading">
          <div><p className="section-kicker">NEW ENTRY</p><h2 id="entry-title">今日のお金を記録</h2></div>
          <div className="type-switch" aria-label="収支の種類">
            <button type="button" className={kind === "expense" ? "active expense" : ""} aria-pressed={kind === "expense"} onClick={() => chooseKind("expense")}>支出</button>
            <button type="button" className={kind === "income" ? "active income" : ""} aria-pressed={kind === "income"} onClick={() => chooseKind("income")}>収入</button>
          </div>
        </div>
        <form className="entry-form" onSubmit={submit}>
          <label className="amount-field">金額（円）<span className="money-input"><b>¥</b><input aria-label="金額" inputMode="numeric" type="number" min="1" step="1" placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} required /></span></label>
          <label>カテゴリー<select value={category} onChange={(e) => setCategory(e.target.value)}>{categories[kind].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>日付<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
          <label className="memo-field">メモ（任意）<input type="text" maxLength={40} placeholder="例：スーパーで買い物" value={memo} onChange={(e) => setMemo(e.target.value)} /></label>
          <button className={`primary-button ${kind}`} type="submit">記録する <span aria-hidden="true">→</span></button>
        </form>
      </section>

      <section className="month-section" aria-labelledby="month-title">
        <div className="month-nav">
          <div><p className="section-kicker">MONTHLY OVERVIEW</p><h2 id="month-title">{yearLabel}年 {monthLabel}月</h2></div>
          <div><button aria-label="前の月" onClick={() => setMonth(shiftMonth(month,-1))}>‹</button><button className="today-button" onClick={() => setMonth(currentMonth)}>今月</button><button aria-label="次の月" onClick={() => setMonth(shiftMonth(month,1))}>›</button></div>
        </div>
        <div className="summary-grid">
          <article className="summary-card income"><p>収入</p><strong>¥{money.format(income)}</strong><span>＋</span></article>
          <article className="summary-card expense"><p>支出</p><strong>¥{money.format(expense)}</strong><span>−</span></article>
          <article className="summary-card balance"><p>残り</p><strong className={balance < 0 ? "negative" : ""}>{balance < 0 ? "−" : ""}¥{money.format(Math.abs(balance))}</strong><span>=</span></article>
        </div>
      </section>

      <section className="details-grid">
        <article className="panel chart-panel">
          <div className="panel-title"><div><p className="section-kicker">SPENDING</p><h2>支出の内訳</h2></div><span>{expenseGroups.length} カテゴリー</span></div>
          {expenseGroups.length ? <div className="bars">{expenseGroups.map((item) => <div className="bar-row" key={item.name}><div className="bar-label"><span>{categoryMarks[item.name]}</span><b>{item.name}</b></div><div className="bar-track"><i style={{width:`${Math.max(5,item.value / maxExpense * 100)}%`}} /></div><strong>¥{money.format(item.value)}</strong></div>)}</div> : <Empty message="支出を記録すると、ここにグラフが表示されます。" />}
        </article>

        <article className="panel history-panel">
          <div className="panel-title"><div><p className="section-kicker">HISTORY</p><h2>今月の履歴</h2></div><span>{visible.length} 件</span></div>
          {visible.length ? <ul className="history-list">{visible.map((entry) => <li key={entry.id}><div className={`history-mark ${entry.kind}`}>{categoryMarks[entry.category]}</div><div className="history-copy"><b>{entry.memo || entry.category}</b><span>{Number(entry.date.slice(8))}日 · {entry.category}</span></div><strong className={entry.kind}>{entry.kind === "income" ? "+" : "−"}¥{money.format(entry.amount)}</strong><button className="delete-button" aria-label={`${entry.memo || entry.category}を削除`} onClick={() => setEntries((current) => current.filter((item) => item.id !== entry.id))}>×</button></li>)}</ul> : <Empty message="まだ記録がありません。上のフォームから追加してみましょう。" />}
        </article>
      </section>

      <footer><span>わ</span><p>今日の小さな記録が、明日の安心につながります。</p></footer>
    </main>
  );
}

function Empty({message}:{message:string}) {
  return <div className="empty"><span aria-hidden="true">○</span><p>{message}</p></div>;
}
