\
import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Settings2,
  Sigma,
  ShieldAlert,
} from "lucide-react";

const STORAGE_KEY = "spc-monitor-data-v1";

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#0f172a",
  },
  header: {
    borderBottom: "1px solid #e2e8f0",
    background: "#ffffff",
  },
  headerInner: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "20px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "16px",
    flexWrap: "wrap",
  },
  main: {
    maxWidth: "1200px",
    margin: "0 auto",
    padding: "24px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "360px 1fr",
    gap: "24px",
  },
  leftCol: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  rightCol: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "20px",
    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
  },
  cardHeader: {
    padding: "18px 20px 0 20px",
  },
  cardTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "20px",
    fontWeight: 700,
    margin: 0,
  },
  cardBody: {
    padding: "18px 20px 20px 20px",
  },
  label: {
    display: "block",
    fontSize: "13px",
    color: "#475569",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    fontSize: "14px",
    outline: "none",
  },
  smallButton: {
    padding: "7px 12px",
    borderRadius: "12px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  },
  button: {
    padding: "10px 14px",
    borderRadius: "14px",
    border: "1px solid #cbd5e1",
    background: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  buttonPrimary: {
    padding: "10px 14px",
    borderRadius: "14px",
    border: "1px solid #0f172a",
    background: "#0f172a",
    color: "#ffffff",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "12px",
  },
  statBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "18px",
    padding: "16px",
    background: "#ffffff",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "14px",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #e2e8f0",
    color: "#64748b",
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #f1f5f9",
    verticalAlign: "top",
  },
  hint: {
    fontSize: "13px",
    lineHeight: 1.7,
    color: "#475569",
    background: "#f8fafc",
    borderRadius: "14px",
    padding: "12px 14px",
    border: "1px solid #e2e8f0",
  }
};

function avg(arr) {
  return arr.reduce((sum, n) => sum + n, 0) / arr.length;
}

function range(arr) {
  return Math.max(...arr) - Math.min(...arr);
}

function formatNum(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return Number(n).toFixed(3);
}

function calculateXbarRLimits(groups) {
  if (!groups || groups.length < 2) return null;
  const subgroupSize = 5;
  if (!groups.every((g) => Array.isArray(g.values) && g.values.length === subgroupSize)) return null;

  const A2 = 0.577;
  const D3 = 0;
  const D4 = 2.114;

  const xbList = groups.map((g) => avg(g.values));
  const rList = groups.map((g) => range(g.values));
  const xDoubleBar = avg(xbList);
  const rBar = avg(rList);

  return {
    xbarCL: xDoubleBar,
    xbarUCL: xDoubleBar + A2 * rBar,
    xbarLCL: xDoubleBar - A2 * rBar,
    rCL: rBar,
    rUCL: D4 * rBar,
    rLCL: D3 * rBar,
  };
}

function getRunRuleFlags(values, cl) {
  const flags = new Array(values.length).fill(false);

  for (let i = 6; i < values.length; i += 1) {
    const slice = values.slice(i - 6, i + 1);
    const allAbove = slice.every((v) => v > cl);
    const allBelow = slice.every((v) => v < cl);
    if (allAbove || allBelow) {
      for (let j = i - 6; j <= i; j += 1) flags[j] = true;
    }
  }

  for (let i = 5; i < values.length; i += 1) {
    const slice = values.slice(i - 5, i + 1);
    let increasing = true;
    let decreasing = true;
    for (let j = 1; j < slice.length; j += 1) {
      if (!(slice[j] > slice[j - 1])) increasing = false;
      if (!(slice[j] < slice[j - 1])) decreasing = false;
    }
    if (increasing || decreasing) {
      for (let j = i - 5; j <= i; j += 1) flags[j] = true;
    }
  }

  return flags;
}

function downloadCSV(parsedGroups) {
  const header = ["Group", "Value1", "Value2", "Value3", "Value4", "Value5", "Xbar", "R"];
  const rows = parsedGroups.map((g) => [g.label, ...g.values, g.xbar, g.r]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "spc_xbar_r_data.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function StatusTag({ ok, text }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: ok ? "#166534" : "#b91c1c" }}>
      {ok ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
      {text}
    </span>
  );
}

function App() {
  const [xbarUCL, setXbarUCL] = useState("10.5");
  const [xbarCL, setXbarCL] = useState("10.0");
  const [xbarLCL, setXbarLCL] = useState("9.5");
  const [rUCL, setRUCL] = useState("1.2");
  const [rCL, setRCL] = useState("0.6");
  const [rLCL, setRLCL] = useState("0.0");
  const [autoLimits, setAutoLimits] = useState(false);

  const [dayLabel, setDayLabel] = useState("");
  const [inputs, setInputs] = useState(["", "", "", "", ""]);
  const [groups, setGroups] = useState([
    { label: "Day 1", values: [10.1, 10.0, 9.9, 10.2, 10.1] },
    { label: "Day 2", values: [10.3, 10.1, 10.2, 10.4, 10.2] },
    { label: "Day 3", values: [9.8, 9.9, 10.0, 9.7, 9.8] },
  ]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved.xbarUCL) setXbarUCL(saved.xbarUCL);
      if (saved.xbarCL) setXbarCL(saved.xbarCL);
      if (saved.xbarLCL) setXbarLCL(saved.xbarLCL);
      if (saved.rUCL) setRUCL(saved.rUCL);
      if (saved.rCL) setRCL(saved.rCL);
      if (saved.rLCL) setRLCL(saved.rLCL);
      if (typeof saved.autoLimits === "boolean") setAutoLimits(saved.autoLimits);
      if (Array.isArray(saved.groups) && saved.groups.length > 0) {
        setGroups(saved.groups);
      }
    } catch (error) {
      console.error("Failed to read local data", error);
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ xbarUCL, xbarCL, xbarLCL, rUCL, rCL, rLCL, autoLimits, groups })
      );
    } catch (error) {
      console.error("Failed to save local data", error);
    }
  }, [xbarUCL, xbarCL, xbarLCL, rUCL, rCL, rLCL, autoLimits, groups]);

  const calculatedLimits = useMemo(() => calculateXbarRLimits(groups), [groups]);

  useEffect(() => {
    if (!autoLimits || !calculatedLimits) return;
    setXbarUCL(formatNum(calculatedLimits.xbarUCL));
    setXbarCL(formatNum(calculatedLimits.xbarCL));
    setXbarLCL(formatNum(calculatedLimits.xbarLCL));
    setRUCL(formatNum(calculatedLimits.rUCL));
    setRCL(formatNum(calculatedLimits.rCL));
    setRLCL(formatNum(calculatedLimits.rLCL));
  }, [autoLimits, calculatedLimits]);

  const parsedGroups = useMemo(() => {
    return groups.map((group, index) => {
      const xbar = avg(group.values);
      const r = range(group.values);
      const xbarStatus = xbar > Number(xbarUCL) || xbar < Number(xbarLCL) ? "out" : "in";
      const rStatus = r > Number(rUCL) || r < Number(rLCL) ? "out" : "in";
      return {
        id: index + 1,
        label: group.label,
        values: group.values,
        xbar,
        r,
        xbarStatus,
        rStatus,
      };
    });
  }, [groups, xbarUCL, xbarLCL, rUCL, rLCL]);

  const xbarValues = parsedGroups.map((g) => g.xbar);
  const xbarRunFlags = getRunRuleFlags(xbarValues, Number(xbarCL));

  const parsedGroupsWithRules = parsedGroups.map((g, index) => ({
    ...g,
    runRule: xbarRunFlags[index],
    finalAlarm: g.xbarStatus === "out" || g.rStatus === "out" || xbarRunFlags[index],
  }));

  const summary = useMemo(() => {
    const total = parsedGroupsWithRules.length;
    const xbarAlerts = parsedGroupsWithRules.filter((g) => g.xbarStatus === "out").length;
    const rAlerts = parsedGroupsWithRules.filter((g) => g.rStatus === "out").length;
    const ruleAlerts = parsedGroupsWithRules.filter((g) => g.runRule).length;
    return { total, xbarAlerts, rAlerts, ruleAlerts };
  }, [parsedGroupsWithRules]);

  function handleValueChange(index, value) {
    const next = [...inputs];
    next[index] = value;
    setInputs(next);
  }

  function addGroup() {
    const nums = inputs.map((v) => Number(v));
    const valid = nums.length === 5 && nums.every((n) => Number.isFinite(n));
    if (!valid) {
      alert("请先输入 5 个有效数字。");
      return;
    }
    const label = dayLabel.trim() || `Day ${groups.length + 1}`;
    setGroups([...groups, { label, values: nums }]);
    setInputs(["", "", "", "", ""]);
    setDayLabel("");
  }

  function removeLast() {
    if (groups.length === 0) return;
    setGroups(groups.slice(0, -1));
  }

  function resetAll() {
    localStorage.removeItem(STORAGE_KEY);
    setXbarUCL("10.5");
    setXbarCL("10.0");
    setXbarLCL("9.5");
    setRUCL("1.2");
    setRCL("0.6");
    setRLCL("0.0");
    setAutoLimits(false);
    setDayLabel("");
    setInputs(["", "", "", "", ""]);
    setGroups([
      { label: "Day 1", values: [10.1, 10.0, 9.9, 10.2, 10.1] },
      { label: "Day 2", values: [10.3, 10.1, 10.2, 10.4, 10.2] },
      { label: "Day 3", values: [9.8, 9.9, 10.0, 9.7, 9.8] },
    ]);
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#64748b", fontSize: 14 }}>
              <BarChart3 size={16} />
              SPC Quality Monitoring
            </div>
            <h1 style={{ margin: "8px 0 0 0", fontSize: 32 }}>Xbar-R 质量监控网站</h1>
          </div>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: 16, background: "#f8fafc", padding: "10px 14px", fontSize: 14, color: "#475569" }}>
            每天输入 5 个测量值，自动生成 Xbar-R 控制图
          </div>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.grid}>
          <div style={styles.leftCol}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}><Settings2 size={18} />控制限设置</h2>
              </div>
              <div style={styles.cardBody}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                  <strong>Xbar 图 / R 图</strong>
                  <button style={styles.smallButton} onClick={() => setAutoLimits((v) => !v)}>
                    {autoLimits ? "自动计算中" : "手动设置中"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
                  <div>
                    <label style={styles.label}>Xbar UCL</label>
                    <input style={styles.input} disabled={autoLimits} value={xbarUCL} onChange={(e) => setXbarUCL(e.target.value)} />
                  </div>
                  <div>
                    <label style={styles.label}>Xbar CL</label>
                    <input style={styles.input} disabled={autoLimits} value={xbarCL} onChange={(e) => setXbarCL(e.target.value)} />
                  </div>
                  <div>
                    <label style={styles.label}>Xbar LCL</label>
                    <input style={styles.input} disabled={autoLimits} value={xbarLCL} onChange={(e) => setXbarLCL(e.target.value)} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  <div>
                    <label style={styles.label}>R UCL</label>
                    <input style={styles.input} disabled={autoLimits} value={rUCL} onChange={(e) => setRUCL(e.target.value)} />
                  </div>
                  <div>
                    <label style={styles.label}>R CL</label>
                    <input style={styles.input} disabled={autoLimits} value={rCL} onChange={(e) => setRCL(e.target.value)} />
                  </div>
                  <div>
                    <label style={styles.label}>R LCL</label>
                    <input style={styles.input} disabled={autoLimits} value={rLCL} onChange={(e) => setRLCL(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}>新增一组数据</h2>
              </div>
              <div style={styles.cardBody}>
                <div style={{ marginBottom: 12 }}>
                  <label style={styles.label}>分组名称 / 日期</label>
                  <input style={styles.input} placeholder="例如：2026-04-01" value={dayLabel} onChange={(e) => setDayLabel(e.target.value)} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 14 }}>
                  {inputs.map((value, index) => (
                    <div key={index}>
                      <label style={styles.label}>值 {index + 1}</label>
                      <input
                        style={styles.input}
                        value={value}
                        onChange={(e) => handleValueChange(index, e.target.value)}
                        placeholder={String(index + 1)}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                  <button style={styles.buttonPrimary} onClick={addGroup}>添加数据</button>
                  <button style={styles.button} onClick={removeLast}>删除最后一组</button>
                  <button style={styles.button} onClick={() => downloadCSV(parsedGroupsWithRules)}>导出 CSV</button>
                  <button style={styles.button} onClick={resetAll}>恢复默认</button>
                </div>

                <div style={styles.hint}>
                  规则：每组固定输入 5 个测量值。系统会自动计算该组的平均值（Xbar）和极差（R），并显示在控制图上。当前数据会自动保存在浏览器本地。开启自动模式后，将按 n=5 的 Xbar-R 常数自动计算控制限；同时增加基础判异规则：7 点同侧、6 点持续上升或下降。
                </div>
              </div>
            </div>

            <div style={styles.statsGrid}>
              <div style={styles.statBox}>
                <div style={{ color: "#64748b", fontSize: 14 }}>总组数</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{summary.total}</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ color: "#64748b", fontSize: 14 }}>Xbar 报警</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{summary.xbarAlerts}</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ color: "#64748b", fontSize: 14 }}>R 图报警</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{summary.rAlerts}</div>
              </div>
              <div style={styles.statBox}>
                <div style={{ color: "#64748b", fontSize: 14 }}>规则报警</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{summary.ruleAlerts}</div>
              </div>
            </div>
          </div>

          <div style={styles.rightCol}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}><Sigma size={18} />Xbar 控制图</h2>
              </div>
              <div style={styles.cardBody}>
                <div style={{ width: "100%", height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={parsedGroupsWithRules}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis domain={["auto", "auto"]} />
                      <Tooltip formatter={(value) => formatNum(value)} />
                      <ReferenceLine y={Number(xbarUCL)} strokeDasharray="6 6" label="UCL" />
                      <ReferenceLine y={Number(xbarCL)} strokeDasharray="4 4" label="CL" />
                      <ReferenceLine y={Number(xbarLCL)} strokeDasharray="6 6" label="LCL" />
                      <Line type="monotone" dataKey="xbar" strokeWidth={3} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}><BarChart3 size={18} />R 控制图</h2>
              </div>
              <div style={styles.cardBody}>
                <div style={{ width: "100%", height: 340 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={parsedGroupsWithRules}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis domain={["auto", "auto"]} />
                      <Tooltip formatter={(value) => formatNum(value)} />
                      <ReferenceLine y={Number(rUCL)} strokeDasharray="6 6" label="UCL" />
                      <ReferenceLine y={Number(rCL)} strokeDasharray="4 4" label="CL" />
                      <ReferenceLine y={Number(rLCL)} strokeDasharray="6 6" label="LCL" />
                      <Line type="monotone" dataKey="r" strokeWidth={3} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h2 style={styles.cardTitle}><ShieldAlert size={18} />每日数据明细与规则判定</h2>
              </div>
              <div style={styles.cardBody}>
                <div style={{ overflowX: "auto" }}>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>分组</th>
                        <th style={styles.th}>5个测量值</th>
                        <th style={styles.th}>Xbar</th>
                        <th style={styles.th}>R</th>
                        <th style={styles.th}>状态</th>
                        <th style={styles.th}>规则</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedGroupsWithRules.map((row) => (
                        <tr key={row.id}>
                          <td style={styles.td}><strong>{row.label}</strong></td>
                          <td style={styles.td}>{row.values.map((v) => formatNum(v)).join(" / ")}</td>
                          <td style={styles.td}>{formatNum(row.xbar)}</td>
                          <td style={styles.td}>{formatNum(row.r)}</td>
                          <td style={styles.td}>
                            <StatusTag ok={!row.finalAlarm} text={row.finalAlarm ? "异常" : "正常"} />
                          </td>
                          <td style={styles.td}>
                            {row.runRule ? <span style={{ color: "#b91c1c" }}>连点/趋势异常</span> : <span style={{ color: "#64748b" }}>-</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @media (max-width: 980px) {
            .responsive-note {}
          }
          @media (max-width: 980px) {
            body {}
          }
          @media (max-width: 980px) {
            div[data-app-grid="1"] {}
          }
        `}</style>
      </main>
    </div>
  );
}

export default App;
