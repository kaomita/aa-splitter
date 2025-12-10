import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Person {
  id: number;
  name: string;
  paid: number;
}

interface Settlement {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  amount: number;
}

export default function AASplitter() {
  const [people, setPeople] = useState<Person[]>([]);
  const [nameInput, setNameInput] = useState<string>("");
  const [amountInput, setAmountInput] = useState<number>(0);

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

  function updatePerson(id: number, key: keyof Person, value: string | number) {
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, [key]: value } : p)));
  }

  function removePerson(id: number) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  const settlements: Settlement[] = useMemo(() => {
    const n = people.length;
    if (n <= 1) return [];
    const eps = 0.005;
    const result: Settlement[] = [];
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
    const map = new Map<number, { outgoing: number; incoming: number }>();
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
      .join("\n");
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-sky-50 to-white px-3 py-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="mx-auto max-w-4xl rounded-3xl bg-white/90 backdrop-blur shadow-xl p-4 sm:p-6"
      >
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xl sm:text-3xl font-semibold mb-2 text-center"
        >
          AA 收付款结算
        </motion.h1>

        <p className="text-center text-sm text-slate-600 mb-4">
          自动均摊费用，并给出最清晰的转账建议
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border p-4">
            <h2 className="font-medium mb-3">成员与支付</h2>
            <div className="flex flex-col sm:flex-row gap-2 mb-3">
              <input
                className="flex-1 p-2 border rounded-lg"
                placeholder="姓名"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
              />
              <input
                type="number"
                inputMode="decimal"
                className="flex-1 sm:w-28 p-2 border rounded-lg"
                placeholder="金额"
                value={amountInput}
                onChange={(e) => setAmountInput(Number(e.target.value))}
              />
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white"
                onClick={addPerson}
              >
                添加
              </button>
            </div>

            <AnimatePresence>
              {people.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="flex gap-2 items-center mb-2"
                >
                  <input
                    className="flex-1 p-2 border rounded-lg"
                    value={p.name}
                    onChange={(e) => updatePerson(p.id, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    className="w-24 p-2 border rounded-lg"
                    value={p.paid}
                    onChange={(e) => updatePerson(p.id, "paid", Number(e.target.value))}
                  />
                  <button
                    className="text-red-500 text-sm"
                    onClick={() => removePerson(p.id)}
                  >
                    删除
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            <div className="mt-3 text-sm text-slate-600 space-y-1">
              <div>总费用：¥{total.toFixed(2)}</div>
              <div>人数：{people.length}</div>
              <div>人均：¥{avg.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-xl border p-4 bg-gradient-to-b from-white to-slate-50">
            <h2 className="font-medium mb-3">结算结果</h2>
            {settlements.length === 0 ? (
              <div className="text-sm text-slate-500">暂无转账需求</div>
            ) : (
              <AnimatePresence>
                {settlements.map((s, idx) => (
                  <motion.div
                    key={idx}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex justify-between items-center p-2 mb-2 bg-white rounded-lg border"
                  >
                    <span className="text-sm">{s.fromName} → {s.toName}</span>
                    <span className="font-semibold">¥{s.amount.toFixed(2)}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}

            <div className="mt-4 flex flex-col sm:flex-row gap-2">
              <button
                onClick={downloadCSV}
                className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-white"
              >
                导出 CSV
              </button>
              <button
                onClick={resetAll}
                className="flex-1 px-4 py-2 rounded-lg bg-slate-100 text-slate-700"
              >
                清空
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
