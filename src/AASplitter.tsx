import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

// AA-Splitter: single-file React component (Tailwind CSS assumed in host project)
// Settlement algorithm: per-payer equal-split then net pairwise.
// This component includes quick test-case buttons so you can load example data and
// verify correctness without changing source.

export default function AASplitter() {
  const [people, setPeople] = useState([]);
  const [nameInput, setNameInput] = useState("");
  const [amountInput, setAmountInput] = useState(0);

  const total = useMemo(() => people.reduce((s, p) => s + Number(p.paid || 0), 0), [people]);
  const avg = useMemo(() => (people.length ? total / people.length : 0), [people, total]);

  function addPerson() {
    if (!nameInput.trim()) return;
    setPeople((prev) => [
      ...prev,
      { id: Date.now(), name: nameInput.trim(), paid: Number(amountInput || 0) },
    ]);
    setNameInput("");
    setAmountInput(0);
  }

  function updatePerson(id, key, value) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }

  function removePerson(id) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  const settlements = useMemo(() => {
    const n = people.length;
    if (n <= 1) return [];
    const eps = 0.005;
    const result = [];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const net = (Number(people[j].paid || 0) - Number(people[i].paid || 0)) / n;
        if (net > eps) {
          result.push({
            fromId: people[i].id,
            fromName: people[i].name,
            toId: people[j].id,
            toName: people[j].name,
            amount: Number(net.toFixed(2)),
          });
        }
      }
    }
    return result;
  }, [people]);

  const perPersonTotals = useMemo(() => {
    const map = new Map();
    people.forEach((p) => map.set(p.id, { outgoing: 0, incoming: 0 }));
    settlements.forEach((s) => {
      const from = map.get(s.fromId);
      const to = map.get(s.toId);
      if (from) from.outgoing += s.amount;
      if (to) to.incoming += s.amount;
    });
    for (const v of map.values()) {
      v.outgoing = Number(v.outgoing.toFixed(2));
      v.incoming = Number(v.incoming.toFixed(2));
    }
    return map;
  }, [people, settlements]);

  function downloadCSV() {
    const rows = [["From", "To", "Amount"]].concat(
      settlements.map((s) => [s.fromName, s.toName, s.amount.toFixed(2)])
    );
    const csv = rows
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n"); // fixed unterminated string here
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "aa-settlements.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetAll() {
    setPeople([]);
  }

  function loadExampleABC() {
    setPeople([
      { id: 1, name: "a", paid: 30 },
      { id: 2, name: "b", paid: 90 },
      { id: 3, name: "c", paid: 0 },
    ]);
  }

  function loadEqualThree() {
    setPeople([
      { id: 11, name: "p1", paid: 50 },
      { id: 12, name: "p2", paid: 50 },
      { id: 13, name: "p3", paid: 50 },
    ]);
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-6">
      <div className="max-w-4xl mx-auto shadow-2xl rounded-2xl bg-white/80 backdrop-blur p-6">
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-2xl md:text-3xl font-semibold mb-2"
        >
          AA 收付款 — 出行费用结算
        </motion.h1>

        <p className="text-sm text-slate-600 mb-4">
          输入每位好友的姓名与支付金额（每一位支付的总额），系统将把每笔支付按均摊到所有人处理，然后给出按原支付方拆分后净对账的建议转账。
        </p>

        <div className="flex gap-2 mb-4">
          <button onClick={loadExampleABC} className="px-3 py-1 bg-sky-500 text-white rounded">
            示例: a=30, b=90, c=0
          </button>
          <button onClick={loadEqualThree} className="px-3 py-1 bg-sky-300 text-white rounded">
            示例: 三人相等
          </button>
          <button onClick={resetAll} className="px-3 py-1 bg-red-100 text-red-700 rounded">
            清空
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-slate-100">
            <h2 className="font-medium mb-2">添加 / 编辑 成员</h2>

            <div className="flex gap-2 mb-3">
              <input
                className="flex-1 p-2 border rounded"
                placeholder="姓名"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
              <input
                type="number"
                className="w-28 p-2 border rounded"
                placeholder="已付金额"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
              />
              <button className="px-4 rounded bg-indigo-600 text-white" onClick={addPerson}>
                添加
              </button>
            </div>

            <div className="space-y-2">
              <AnimatePresence>
                {people.map((p) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    className="flex items-center gap-2"
                  >
                    <input
                      className="flex-1 p-2 border rounded"
                      value={p.name}
                      onChange={(e) => updatePerson(p.id, "name", e.target.value)}
                    />
                    <input
                      type="number"
                      className="w-28 p-2 border rounded"
                      value={p.paid}
                      onChange={(e) => updatePerson(p.id, "paid", Number(e.target.value))}
                    />
                    <button className="px-3 py-1 rounded border" onClick={() => removePerson(p.id)}>
                      删除
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-4 border-t pt-3 text-sm text-slate-600">
              <div>
                总费用：<span className="font-medium">¥{total.toFixed(2)}</span>
              </div>
              <div>
                人数：<span className="font-medium">{people.length}</span>
              </div>
              <div>
                每人均摊：<span className="font-medium">¥{avg.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border border-slate-100 bg-gradient-to-b from-white/60 to-slate-50">
            <h2 className="font-medium mb-2">结算结果（按每位付款者均摊后净对账）</h2>

            <div className="mb-3">
              <div className="grid grid-cols-4 gap-2 text-xs text-slate-500 mb-2">
                <div>姓名</div>
                <div className="text-right">已付</div>
                <div className="text-right">需付</div>
                <div className="text-right">需收</div>
              </div>

              <div className="space-y-2">
                {people.map((p) => {
                  const totals = perPersonTotals.get(p.id) || { outgoing: 0, incoming: 0 };
                  return (
                    <div key={p.id} className="flex items-center justify-between p-2 rounded border">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm">¥{Number(p.paid).toFixed(2)}</div>
                      <div className="text-sm">¥{totals.outgoing.toFixed(2)}</div>
                      <div className="text-sm">¥{totals.incoming.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium mb-2">推荐转账（详细）</h3>
              <div className="space-y-2">
                {settlements.length === 0 ? (
                  <div className="text-sm text-slate-500">无需转账，或请先添加成员并填写金额。</div>
                ) : (
                  settlements.map((s, idx) => (
                    <motion.div key={idx} initial={{ x: -8, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div>{s.fromName} → {s.toName}</div>
                      <div className="font-semibold">¥{s.amount.toFixed(2)}</div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button onClick={downloadCSV} className="px-4 py-2 bg-emerald-500 text-white rounded">导出 CSV</button>
              <button onClick={resetAll} className="px-4 py-2 bg-red-100 text-red-700 rounded">清空</button>
            </div>
          </div>
        </div>

        <footer className="mt-6 text-xs text-slate-500">
          说明：默认采用“按每位付款者的金额均摊到所有人，再做净对账”的方式，因此会生成每位欠款人与每位收款人之间的详细建议转账（这与“最少笔数转账”不同）。
          如果你希望改成“尽量少笔数的转账（最少交易数）”，我可以另外添加一个切换模式。
        </footer>
      </div>
    </div>
  );
}
