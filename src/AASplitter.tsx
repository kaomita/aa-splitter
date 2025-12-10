import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Person = {
  id: number;
  name: string;
  paid: number;
};

type Settlement = {
  fromId: number;
  fromName: string;
  toId: number;
  toName: string;
  amount: number;
};

export default function AASplitter() {
  const [people, setPeople] = useState<Person[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  const total = useMemo(
    () => people.reduce((sum, p) => sum + p.paid, 0),
    [people]
  );

  const avg = useMemo(
    () => (people.length ? total / people.length : 0),
    [people, total]
  );

  function addPerson() {
    setError("");
    const name = nameInput.trim();
    const paid = Number(amountInput);
    if (!name) {
      setError("姓名不能为空");
      return;
    }
    if (people.some((p) => p.name === name)) {
      setError("姓名不能重复");
      return;
    }
    if (isNaN(paid) || paid < 0) {
      setError("金额必须是 ≥ 0 的数字");
      return;
    }
    setPeople((prev) => [
      ...prev,
      { id: Date.now(), name, paid },
    ]);
    setNameInput("");
    setAmountInput("");
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") addPerson();
  }

  function removePerson(id: number) {
    setPeople((prev) => prev.filter((p) => p.id !== id));
  }

  const settlements: Settlement[] = useMemo(() => {
    if (people.length < 2) return [];
    const balances = people.map((p) => ({
      id: p.id,
      name: p.name,
      balance: Number((p.paid - avg).toFixed(2)),
    }));
    const debtors = balances.filter((p) => p.balance < 0);
    const creditors = balances.filter((p) => p.balance > 0);
    const result: Settlement[] = [];

    for (let i = debtors.length - 1; i >= 0; i--) {
      const d = debtors[i];
      const target = creditors.find(
        (c) => Math.abs(c.balance + d.balance) < 0.01
      );
      if (target) {
        const amount = Math.abs(d.balance);
        result.push({
          fromId: d.id,
          fromName: d.name,
          toId: target.id,
          toName: target.name,
          amount,
        });
        d.balance = 0;
        target.balance = 0;
        debtors.splice(i, 1);
        const idx = creditors.findIndex((c) => c.id === target.id);
        if (idx !== -1) creditors.splice(idx, 1);
      }
    }

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(-debtors[i].balance, creditors[j].balance);
      result.push({
        fromId: debtors[i].id,
        fromName: debtors[i].name,
        toId: creditors[j].id,
        toName: creditors[j].name,
        amount: Number(pay.toFixed(2)),
      });
      debtors[i].balance += pay;
      creditors[j].balance -= pay;
      if (Math.abs(debtors[i].balance) < 0.01) i++;
      if (Math.abs(creditors[j].balance) < 0.01) j++;
    }
    return result;
  }, [people, avg]);

  const perPersonTotals = useMemo(() => {
    const map = new Map<number, { in: number; out: number }>();
    people.forEach((p) => map.set(p.id, { in: 0, out: 0 }));
    settlements.forEach((s) => {
      map.get(s.fromId)!.out += s.amount;
      map.get(s.toId)!.in += s.amount;
    });
    return map;
  }, [people, settlements]);

  function loadExample() {
    setPeople([
      { id: 1, name: "a", paid: 30 },
      { id: 2, name: "b", paid: 90 },
      { id: 3, name: "c", paid: 0 },
    ]);
  }

  function resetAll() {
    setPeople([]);
    setError("");
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white p-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-4 sm:p-6">
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-semibold mb-2"
        >
          AA 收付款
        </motion.h1>

        <p className="text-sm text-slate-500 mb-4">
          填写每个人实际支付的金额，系统自动计算谁该向谁转账
        </p>

        {/* 输入区 */}
        <div className="flex flex-col sm:flex-row gap-2 mb-3">
          <input
            ref={nameRef}
            className="flex-1 p-2 border rounded"
            placeholder="姓名"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <input
            type="number"
            inputMode="decimal"
            className="sm:w-32 p-2 border rounded"
            placeholder="金额"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={addPerson}
            className="px-4 py-2 bg-indigo-600 text-white rounded"
          >
            添加
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-red-600 mb-2"
          >
            {error}
          </motion.div>
        )}

        {/* 成员列表 */}
        <div className="space-y-2 mb-4">
          <AnimatePresence>
            {people.map((p) => {
              const t = perPersonTotals.get(p.id) || { in: 0, out: 0 };
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex justify-between items-center p-2 border rounded"
                >
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      已付 <span className="font-bold">¥{p.paid.toFixed(2)}</span> ｜ 
                      付出 <span className="font-bold">¥{t.out.toFixed(2)}</span> ｜ 
                      收入 <span className="font-bold">¥{t.in.toFixed(2)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => removePerson(p.id)}
                    className="text-sm text-red-500"
                  >
                    删除
                  </button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* 总额 & 均摊 */}
        <div className="mb-3 border-t pt-2 text-sm text-slate-600">
          <div>总花费：<span className="font-bold">¥{total.toFixed(2)}</span></div>
          <div>人均花费：<span className="font-bold">¥{avg.toFixed(2)}</span></div>
        </div>

        {/* 转账结果 */}
        <div className="border-t pt-3">
          <h3 className="text-sm font-medium mb-2">推荐转账</h3>
          {settlements.length === 0 ? (
            <div className="text-sm text-slate-400">
              暂无转账
            </div>
          ) : (
            <div className="space-y-2">
              {settlements.map((s, i) => (
                <div
                  key={i}
                  className="flex justify-between p-2 bg-slate-50 rounded"
                >
                  <span>
                    {s.fromName} → {s.toName}
                  </span>
                  <span className="font-semibold">
                    ¥{s.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <button
            onClick={loadExample}
            className="px-3 py-1 bg-sky-500 text-white rounded"
          >
            示例
          </button>
          <button
            onClick={resetAll}
            className="px-3 py-1 bg-slate-200 rounded"
          >
            清空
          </button>
        </div>
      </div>
    </div>
  );
}
