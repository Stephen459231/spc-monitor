import React, { useState } from "react";
import React, { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "spc-xbar-r-data-v1";

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
  return arr.reduce((sum, n) => sum + n, 0) / arr.length;
}

function range(arr) {
function calcRange(arr) {
return Math.max(...arr) - Math.min(...arr);
}

function toFixedNum(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function getYPosition(value, min, max, height) {
  if (max === min) return height / 2;
  const ratio = (value - min) / (max - min);
  return height - ratio * height;
}

function SimpleLineChart({
  title,
  data,
  valueKey,
  labels,
  ucl,
  cl,
  lcl,
  color = "#2563eb",
}) {
  const width = 760;
  const height = 260;
  const padding = 40;

  const values = data.map((d) => d[valueKey]);
  const allValues = [
    ...values,
    Number(ucl),
    Number(cl),
    Number(lcl),
  ].filter((v) => Number.isFinite(v));

  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 1);

  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  const points = data.map((d, i) => {
    const x =
      data.length === 1
        ? padding + innerWidth / 2
        : padding + (i * innerWidth) / (data.length - 1);
    const y =
      padding +
      getYPosition(d[valueKey], minVal, maxVal, innerHeight);
    return { x, y, value: d[valueKey], label: labels[i] };
  });

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");

  const lineY = (value) =>
    padding + getYPosition(Number(value), minVal, maxVal, innerHeight);

  return (
    <div style={styles.card}>
      <h3 style={styles.cardTitle}>{title}</h3>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", background: "#fff" }}
      >
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="#ffffff"
          stroke="#e5e7eb"
        />

        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (innerHeight / 4) * i;
          return (
            <line
              key={i}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          );
        })}

        <line
          x1={padding}
          y1={lineY(ucl)}
          x2={width - padding}
          y2={lineY(ucl)}
          stroke="#dc2626"
          strokeDasharray="6 4"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={lineY(cl)}
          x2={width - padding}
          y2={lineY(cl)}
          stroke="#16a34a"
          strokeDasharray="6 4"
          strokeWidth="2"
        />
        <line
          x1={padding}
          y1={lineY(lcl)}
          x2={width - padding}
          y2={lineY(lcl)}
          stroke="#dc2626"
          strokeDasharray="6 4"
          strokeWidth="2"
        />

        <text x={width - 70} y={lineY(ucl) - 6} fontSize="12" fill="#dc2626">
          UCL {ucl}
        </text>
        <text x={width - 70} y={lineY(cl) - 6} fontSize="12" fill="#16a34a">
          CL {cl}
        </text>
        <text x={width - 70} y={lineY(lcl) - 6} fontSize="12" fill="#dc2626">
          LCL {lcl}
        </text>

        {points.length > 1 && (
          <polyline
            fill="none"
            stroke={color}
            strokeWidth="3"
            points={polyline}
          />
        )}

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill={color} />
            <text
              x={p.x}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#374151"
            >
              {p.label}
            </text>
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fontSize="11"
              fill="#111827"
            >
              {toFixedNum(p.value)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function App() {
const [inputs, setInputs] = useState(["", "", "", "", ""]);
  const [data, setData] = useState([]);
  const [groups, setGroups] = useState([]);

  const [xbarUCL, setXbarUCL] = useState("1.50");
  const [xbarCL, setXbarCL] = useState("1.00");
  const [xbarLCL, setXbarLCL] = useState("0.50");

  const [rUCL, setRUCL] = useState("1.00");
  const [rCL, setRCL] = useState("0.50");
  const [rLCL, setRLCL] = useState("0.00");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;

  const handleChange = (i, val) => {
    const newInputs = [...inputs];
    newInputs[i] = val;
    setInputs(newInputs);
    try {
      const parsed = JSON.parse(saved);
      setInputs(parsed.inputs || ["", "", "", "", ""]);
      setGroups(parsed.groups || []);
      setXbarUCL(parsed.xbarUCL || "1.50");
      setXbarCL(parsed.xbarCL || "1.00");
      setXbarLCL(parsed.xbarLCL || "0.50");
      setRUCL(parsed.rUCL || "1.00");
      setRCL(parsed.rCL || "0.50");
      setRLCL(parsed.rLCL || "0.00");
    } catch (e) {
      console.error("读取本地数据失败", e);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        inputs,
        groups,
        xbarUCL,
        xbarCL,
        xbarLCL,
        rUCL,
        rCL,
        rLCL,
      })
    );
  }, [inputs, groups, xbarUCL, xbarCL, xbarLCL, rUCL, rCL, rLCL]);

  const processedData = useMemo(() => {
    return groups.map((group, index) => {
      const xbar = avg(group.values);
      const r = calcRange(group.values);

      return {
        id: index + 1,
        name: `第${index + 1}组`,
        values: group.values,
        xbar,
        r,
        xbarStatus:
          xbar > Number(xbarUCL) || xbar < Number(xbarLCL) ? "超限" : "正常",
        rStatus:
          r > Number(rUCL) || r < Number(rLCL) ? "超限" : "正常",
      };
    });
  }, [groups, xbarUCL, xbarLCL, rUCL, rLCL]);

  const handleInputChange = (index, value) => {
    const next = [...inputs];
    next[index] = value;
    setInputs(next);
};

  const addData = () => {
    const nums = inputs.map(Number);
    if (nums.some(isNaN)) {
      alert("请输入5个数字");
  const addGroup = () => {
    const nums = inputs.map((v) => Number(v));
    const isValid = nums.length === 5 && nums.every((n) => !Number.isNaN(n));

    if (!isValid) {
      alert("请输入 5 个有效数字");
return;
}
    setData([...data, nums]);

    setGroups((prev) => [...prev, { values: nums }]);
setInputs(["", "", "", "", ""]);
};

  const deleteLastGroup = () => {
    if (groups.length === 0) return;
    setGroups((prev) => prev.slice(0, -1));
  };

  const clearAll = () => {
    if (!window.confirm("确定要清空所有数据吗？")) return;
    setInputs(["", "", "", "", ""]);
    setGroups([]);
    localStorage.removeItem(STORAGE_KEY);
  };

return (
    <div style={{ padding: 20 }}>
      <h1>SPC Xbar-R 质量监控</h1>

      <div style={{ marginTop: 20 }}>
        {inputs.map((v, i) => (
          <input
            key={i}
            value={v}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={`值${i + 1}`}
            style={{ marginRight: 5 }}
          />
        ))}
        <button onClick={addData}>添加数据</button>
      </div>
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>SPC Xbar-R 质量监控</h1>

      <div style={{ marginTop: 20 }}>
        {data.map((d, i) => (
          <div key={i}>
            第{i + 1}组：平均={avg(d).toFixed(2)}，极差={range(d).toFixed(2)}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>输入 5 个测量值</h3>
          <div style={styles.inputRow}>
            {inputs.map((v, i) => (
              <input
                key={i}
                value={v}
                onChange={(e) => handleInputChange(i, e.target.value)}
                placeholder={`值${i + 1}`}
                style={styles.input}
              />
            ))}
</div>
        ))}

          <div style={styles.buttonRow}>
            <button onClick={addGroup} style={styles.primaryButton}>
              添加数据
            </button>
            <button onClick={deleteLastGroup} style={styles.button}>
              删除最后一组
            </button>
            <button onClick={clearAll} style={styles.button}>
              清空全部
            </button>
          </div>
        </div>

        <div style={styles.limitGrid}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Xbar 控制限</h3>
            <div style={styles.limitRow}>
              <label style={styles.label}>UCL</label>
              <input
                value={xbarUCL}
                onChange={(e) => setXbarUCL(e.target.value)}
                style={styles.smallInput}
              />
            </div>
            <div style={styles.limitRow}>
              <label style={styles.label}>CL</label>
              <input
                value={xbarCL}
                onChange={(e) => setXbarCL(e.target.value)}
                style={styles.smallInput}
              />
            </div>
            <div style={styles.limitRow}>
              <label style={styles.label}>LCL</label>
              <input
                value={xbarLCL}
                onChange={(e) => setXbarLCL(e.target.value)}
                style={styles.smallInput}
              />
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>R 控制限</h3>
            <div style={styles.limitRow}>
              <label style={styles.label}>UCL</label>
              <input
                value={rUCL}
                onChange={(e) => setRUCL(e.target.value)}
                style={styles.smallInput}
              />
            </div>
            <div style={styles.limitRow}>
              <label style={styles.label}>CL</label>
              <input
                value={rCL}
                onChange={(e) => setRCL(e.target.value)}
                style={styles.smallInput}
              />
            </div>
            <div style={styles.limitRow}>
              <label style={styles.label}>LCL</label>
              <input
                value={rLCL}
                onChange={(e) => setRLCL(e.target.value)}
                style={styles.smallInput}
              />
            </div>
          </div>
        </div>

        <SimpleLineChart
          title="Xbar 图"
          data={processedData}
          valueKey="xbar"
          labels={processedData.map((d) => d.name)}
          ucl={xbarUCL}
          cl={xbarCL}
          lcl={xbarLCL}
          color="#2563eb"
        />

        <SimpleLineChart
          title="R 图"
          data={processedData}
          valueKey="r"
          labels={processedData.map((d) => d.name)}
          ucl={rUCL}
          cl={rCL}
          lcl={rLCL}
          color="#ea580c"
        />

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>数据明细</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>组别</th>
                  <th style={styles.th}>5个测量值</th>
                  <th style={styles.th}>平均值 Xbar</th>
                  <th style={styles.th}>极差 R</th>
                  <th style={styles.th}>Xbar 判定</th>
                  <th style={styles.th}>R 判定</th>
                </tr>
              </thead>
              <tbody>
                {processedData.length === 0 ? (
                  <tr>
                    <td style={styles.td} colSpan="6">
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  processedData.map((row) => (
                    <tr key={row.id}>
                      <td style={styles.td}>{row.name}</td>
                      <td style={styles.td}>
                        {row.values.map((v) => toFixedNum(v)).join(" / ")}
                      </td>
                      <td style={styles.td}>{toFixedNum(row.xbar)}</td>
                      <td style={styles.td}>{toFixedNum(row.r)}</td>
                      <td
                        style={{
                          ...styles.td,
                          color: row.xbarStatus === "超限" ? "#dc2626" : "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        {row.xbarStatus}
                      </td>
                      <td
                        style={{
                          ...styles.td,
                          color: row.rStatus === "超限" ? "#dc2626" : "#16a34a",
                          fontWeight: 600,
                        }}
                      >
                        {row.rStatus}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
</div>
</div>
);
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f3f4f6",
    padding: "24px",
    fontFamily: "Arial, sans-serif",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
  },
  title: {
    fontSize: "42px",
    fontWeight: "700",
    marginBottom: "24px",
    color: "#111827",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "14px",
    padding: "20px",
    marginBottom: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
  },
  cardTitle: {
    margin: "0 0 16px 0",
    fontSize: "22px",
    color: "#111827",
  },
  inputRow: {
    display: "grid",
    gridTemplateColumns: "repeat(5, 1fr)",
    gap: "10px",
    marginBottom: "14px",
  },
  input: {
    padding: "10px 12px",
    fontSize: "16px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
  },
  smallInput: {
    width: "120px",
    padding: "8px 10px",
    fontSize: "15px",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
  },
  primaryButton: {
    background: "#2563eb",
    color: "#ffffff",
    border: "none",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "15px",
    cursor: "pointer",
  },
  button: {
    background: "#ffffff",
    color: "#111827",
    border: "1px solid #d1d5db",
    borderRadius: "8px",
    padding: "10px 16px",
    fontSize: "15px",
    cursor: "pointer",
  },
  limitGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
  },
  limitRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  },
  label: {
    fontSize: "16px",
    color: "#374151",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
    background: "#f9fafb",
  },
  td: {
    padding: "12px",
    borderBottom: "1px solid #e5e7eb",
  },
};
