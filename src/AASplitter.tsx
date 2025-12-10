import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Person = { id: number; name: string; paid: number };
type Settlement = { fromId: number; fromName: string; toId: number; toName: string; amount: number };

export default function AASplitter() {
  const [people, setPeople] = useState<Person[]>([]);
  const [nameInput, setNameInput] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [error, setError] = useState("");

  const nameRef = useRef<HTMLInputElement>(null);

  const total = useMemo(() => people.reduce((sum, p) => sum + p.paid, 0), [people]);
  const avg = useMemo(() => (people.length ? total / people.length : 0), [people, total]);

  function addPerson() {
    setError("");
    const name = nameInput.trim();
    const paid = Number(amountInput);
    if (!name) return setError("姓名不能为空");
    if (people.some((p) => p.name === name)) return setError("姓名不能重复");
    if (isNaN(paid) || paid < 0) return setError("金额必须是 ≥ 0 的数字");

    setPeople([...people, { id: Date.now(), name, paid }]);
    setNameInput(""); setAmountInput("");
    setTimeout(() => nameRef.current?.focus(), 0);
  }

  function handleKeyDown(e: React.KeyboardEvent) { if (e.key === "Enter") addPerson(); }
  function removePerson(id: number) { setPeople((prev) => prev.filter((p) => p.id !== id)); }

  const settlements: Settlement[] = useMemo(() => {
    if (people.length < 2) return [];
    const balances = people.map(p => ({ id: p.id, name: p.name, balance: Number((p.paid - avg).toFixed(2)) }));
    const debtors = balances.filter(p => p.balance < 0);
    const creditors = balances.filter(p => p.balance > 0);
    const result: Settlement[] = [];

    // 优先完全匹配
    for (let i = debtors.length - 1; i >= 0; i--) {
      const d = debtors[i];
      const target = creditors.find(c => Math.abs(c.balance + d.balance) < 0.01);
      if (target) {
        result.push({ fromId: d.id, fromName: d.name, toId: target.id, toName: target.name, amount: Math.abs(d.balance) });
        d.balance = 0; target.balance = 0;
        debtors.splice(i, 1);
        const idx = creditors.findIndex(c => c.id === target.id); if (idx !== -1) creditors.splice(idx, 1);
      }
    }

    // 贪心分配剩余
    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const pay = Math.min(-debtors[i].balance, creditors[j].balance);
      result.push({ fromId: debtors[i].id, fromName: debtors[i].name, toId: creditors[j].id, toName: creditors[j].name, amount: Number(pay.toFixed(2)) });
      debtors[i].balance += pay; creditors[j].balance -= pay;
      if (Math.abs(debtors[i].balance) < 0.01) i++;
      if (Math.abs(creditors[j].balance) < 0.01) j++;
    }
    return result;
  }, [people, avg]);

  const perPersonTotals = useMemo(() => {
    const map = new Map<number, { in: number; out: number }>();
    people.forEach(p => map.set(p.id, { in: 0, out: 0 }));
    settlements.forEach(s => { map.get(s.fromId)!.out += s.amount; map.get(s.toId)!.in += s.amount; });
    return map;
  }, [people, settlements]);

  function loadExample() { setPeople([{ id: 1, name: "a", paid: 30 }, { id: 2, name: "b", paid: 90 }, { id: 3, name: "c", paid: 0 }]); }
  function resetAll() { setPeople([]); setError(""); }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-purple-100 p-4">
      <div className="max-w-3xl mx-auto bg-white/70 backdrop-blur-md rounded-3xl shadow-2xl p-5 sm:p-7">
        <motion.h1 initial={{ opacity:0,y:-20 }} animate={{ opacity:1,y:0 }} className="text-3xl font-bold mb-4 text-center text-purple-700">
          AA 收付款
        </motion.h1>

        <p className="text-sm text-slate-500 text-center mb-5">
          填写每个人实际支付的金额，系统自动计算推荐转账
        </p>

        {/* 输入区 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input ref={nameRef} value={nameInput} onChange={e=>setNameInput(e.target.value)} onKeyDown={handleKeyDown}
            className="flex-1 p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300"
            placeholder="姓名" />
          <input type="number" inputMode="decimal" value={amountInput} onChange={e=>setAmountInput(e.target.value)} onKeyDown={handleKeyDown}
            className="sm:w-32 p-3 border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-300"
            placeholder="金额" />
          <button onClick={addPerson} className="px-5 py-2 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg hover:scale-105 transition-transform duration-200">
            添加
          </button>
        </div>

        {error && <motion.div initial={{opacity:0}} animate={{opacity:1}} className="text-sm text-red-600 mb-3 text-center">{error}</motion.div>}

        {/* 成员列表 */}
        <motion.div layout className="space-y-3 mb-4">
          <AnimatePresence>
            {people.map(p=>{
              const t = perPersonTotals.get(p.id) || { in:0, out:0 };
              return (
                <motion.div key={p.id} initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}} layout
                  className="flex justify-between items-center p-3 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
                  <div>
                    <div className="font-medium text-purple-700">{p.name}</div>
                    <div className="text-xs text-slate-500">
                      已付 <span className="font-bold">¥{p.paid.toFixed(2)}</span> ｜ 
                      付出 <span className="font-bold">¥{t.out.toFixed(2)}</span> ｜ 
                      收入 <span className="font-bold">¥{t.in.toFixed(2)}</span>
                    </div>
                  </div>
                  <button onClick={()=>removePerson(p.id)} className="text-red-500 hover:text-red-700 transition-colors duration-200">删除</button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {/* 总额 & 均摊 */}
        <div className="mb-4 border-t pt-3 text-sm text-slate-600 space-y-1">
          <div>总花费：<span className="font-bold text-purple-700">¥{total.toFixed(2)}</span></div>
          <div>人均花费：<span className="font-bold text-purple-700">¥{avg.toFixed(2)}</span></div>
        </div>

        {/* 转账结果 */}
        <div className="border-t pt-3">
          <h3 className="text-sm font-medium mb-2 text-purple-700">推荐转账</h3>
          {settlements.length === 0 ? (
            <div className="text-sm text-slate-400">暂无转账</div>
          ) : (
            <motion.div layout className="space-y-2">
              {settlements.map((s,i)=>(
                <motion.div key={i} initial={{opacity:0,x:-10}} animate={{opacity:1,x:0}} exit={{opacity:0,x:10}} layout
                  className="flex justify-between p-3 bg-purple-50 rounded-xl shadow-sm">
                  <span>{s.fromName} → {s.toName}</span>
                  <span className="font-semibold text-purple-700">¥{s.amount.toFixed(2)}</span>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-3 justify-center">
          <button onClick={loadExample} className="px-5 py-2 bg-gradient-to-r from-sky-400 to-sky-600 text-white rounded-lg hover:scale-105 transition-transform duration-200">
            示例
          </button>
          <button onClick={resetAll} className="px-5 py-2 bg-slate-200 rounded-lg hover:bg-slate-300 transition-colors duration-200">
            清空
          </button>
        </div>
      </div>
    </div>
  );
}
