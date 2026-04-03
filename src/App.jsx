import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'spc-xbar-r-records-v1';
const LIMITS_KEY = 'spc-xbar-r-limits-v1';

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function toNumber(value) {
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function calcGroupStats(values) {
  const numbers = values.map((item) => Number(item));
  const mean = numbers.reduce((sum, item) => sum + item, 0) / numbers.length;
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const range = max - min;
  return { mean, range };
}

function calcOverallStats(records) {
  if (!records.length) {
    return {
      totalGroups: 0,
      xDoubleBar: 0,
      rBar: 0,
    };
  }

  const xDoubleBar = records.reduce((sum, item) => sum + item.mean, 0) / records.length;
  const rBar = records.reduce((sum, item) => sum + item.range, 0) / records.length;

  return {
    totalGroups: records.length,
    xDoubleBar,
    rBar,
  };
}

function ControlChart({ title, yLabel, data, cl, ucl, lcl, valueKey, lineColor }) {
  const width = 980;
  const height = 320;
  const padding = { top: 24, right: 30, bottom: 44, left: 62 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (!data.length) {
    return <div style={styles.emptyChart}>暂无分组数据，请先录入每天 5 个数据</div>;
  }

  const series = data.map((item) => item[valueKey]);
  const helperValues = [...series];
  if (cl !== '') helperValues.push(Number(cl));
  if (ucl !== '') helperValues.push(Number(ucl));
  if (lcl !== '') helperValues.push(Number(lcl));

  const minVal = Math.min(...helperValues);
  const maxVal = Math.max(...helperValues);
  const span = maxVal - minVal || 1;
  const buffer = span * 0.15 || 1;
  const chartMin = minVal - buffer;
  const chartMax = maxVal + buffer;

  const getX = (index) => {
    if (data.length === 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (value) => {
    const ratio = (value - chartMin) / (chartMax - chartMin || 1);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const pathD = data
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(item[valueKey])}`)
    .join(' ');

  const yTicks = Array.from({ length: 5 }, (_, i) => chartMin + ((chartMax - chartMin) / 4) * i);
  const tickStep = Math.max(1, Math.ceil(data.length / 10));

  const isOut = (value) => {
    if (ucl !== '' && value > Number(ucl)) return true;
    if (lcl !== '' && value < Number(lcl)) return true;
    return false;
  };

  return (
    <div style={styles.chartCard}>
      <h3 style={styles.chartTitle}>{title}</h3>
      <div style={styles.chartWrap}>
        <svg viewBox={`0 0 ${width} ${height}`} style={styles.svg}>
          <rect x="0" y="0" width={width} height={height} fill="#ffffff" rx="16" />

          {yTicks.map((tick, index) => {
            const y = getY(tick);
            return (
              <g key={index}>
                <line
                  x1={padding.left}
                  y1={y}
                  x2={width - padding.right}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                />
                <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="12" fill="#6b7280">
                  {tick.toFixed(3)}
                </text>
              </g>
            );
          })}

          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={height - padding.bottom}
            stroke="#9ca3af"
            strokeWidth="1.2"
          />
          <line
            x1={padding.left}
            y1={height - padding.bottom}
            x2={width - padding.right}
            y2={height - padding.bottom}
            stroke="#9ca3af"
            strokeWidth="1.2"
          />

          {cl !== '' && (
            <g>
              <line
                x1={padding.left}
                y1={getY(Number(cl))}
                x2={width - padding.right}
                y2={getY(Number(cl))}
                stroke="#2563eb"
                strokeWidth="1.5"
                strokeDasharray="6 6"
              />
              <text
                x={width - padding.right}
                y={getY(Number(cl)) - 6}
                textAnchor="end"
                fontSize="12"
                fill="#1d4ed8"
              >
                CL {Number(cl).toFixed(3)}
              </text>
            </g>
          )}

          {ucl !== '' && (
            <g>
              <line
                x1={padding.left}
                y1={getY(Number(ucl))}
                x2={width - padding.right}
                y2={getY(Number(ucl))}
                stroke="#dc2626"
                strokeWidth="1.5"
                strokeDasharray="8 5"
              />
              <text
                x={width - padding.right}
                y={getY(Number(ucl)) - 6}
                textAnchor="end"
                fontSize="12"
                fill="#b91c1c"
              >
                UCL {Number(ucl).toFixed(3)}
              </text>
            </g>
          )}

          {lcl !== '' && (
            <g>
              <line
                x1={padding.left}
                y1={getY(Number(lcl))}
                x2={width - padding.right}
                y2={getY(Number(lcl))}
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeDasharray="8 5"
              />
              <text
                x={width - padding.right}
                y={getY(Number(lcl)) - 6}
                textAnchor="end"
                fontSize="12"
                fill="#b45309"
              >
                LCL {Number(lcl).toFixed(3)}
              </text>
            </g>
          )}

          <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" />

          {data.map((item, index) => {
            const value = item[valueKey];
            return (
              <g key={item.id}>
                <circle
                  cx={getX(index)}
                  cy={getY(value)}
                  r="4.5"
                  fill={isOut(value) ? '#dc2626' : lineColor}
                />
                <title>{`组别 ${index + 1}\n日期: ${formatDate(item.date)}\n值: ${value.toFixed(3)}`}</title>
              </g>
            );
          })}

          {data.map((item, index) => {
            if ((index + 1) % tickStep !== 0 && index !== 0 && index !== data.length - 1) return null;
            return (
              <text
                key={`x-${item.id}`}
                x={getX(index)}
                y={height - padding.bottom + 18}
                textAnchor="middle"
                fontSize="12"
                fill="#6b7280"
              >
                {index + 1}
              </text>
            );
          })}

          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            fontSize="13"
            fill="#374151"
            fontWeight="600"
          >
            组别
          </text>

          <text
            x={20}
            y={height / 2}
            textAnchor="middle"
            fontSize="13"
            fill="#374151"
            fontWeight="600"
            transform={`rotate(-90 20 ${height / 2})`}
          >
            {yLabel}
          </text>
        </svg>
      </div>
    </div>
  );
}

export default function App() {
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [values, setValues] = useState(['', '', '', '', '']);
  const [records, setRecords] = useState([]);
  const [limits, setLimits] = useState({
    xbarUcl: '',
    xbarCl: '',
    xbarLcl: '',
    rUcl: '',
    rCl: '',
    rLcl: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      const savedLimits = localStorage.getItem(LIMITS_KEY);
      if (savedRecords) {
        const parsed = JSON.parse(savedRecords);
        if (Array.isArray(parsed)) setRecords(parsed);
      }
      if (savedLimits) {
        const parsedLimits = JSON.parse(savedLimits);
        setLimits((prev) => ({ ...prev, ...parsedLimits }));
      }
    } catch (error) {
      console.error('读取本地数据失败：', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(LIMITS_KEY, JSON.stringify(limits));
  }, [limits]);

  const overallStats = useMemo(() => calcOverallStats(records), [records]);

  const abnormalCount = useMemo(() => {
    return records.filter((item) => {
      const xOut =
        (limits.xbarUcl !== '' && item.mean > Number(limits.xbarUcl)) ||
        (limits.xbarLcl !== '' && item.mean < Number(limits.xbarLcl));
      const rOut =
        (limits.rUcl !== '' && item.range > Number(limits.rUcl)) ||
        (limits.rLcl !== '' && item.range < Number(limits.rLcl));
      return xOut || rOut;
    }).length;
  }, [records, limits]);

  const latestWarning = useMemo(() => {
    if (!records.length) return '';
    const latest = records[records.length - 1];
    const warnings = [];

    if (limits.xbarUcl !== '' && latest.mean > Number(limits.xbarUcl)) {
      warnings.push(`X-bar 超上限`);
    }
    if (limits.xbarLcl !== '' && latest.mean < Number(limits.xbarLcl)) {
      warnings.push(`X-bar 低于下限`);
    }
    if (limits.rUcl !== '' && latest.range > Number(limits.rUcl)) {
      warnings.push(`R 超上限`);
    }
    if (limits.rLcl !== '' && latest.range < Number(limits.rLcl)) {
      warnings.push(`R 低于下限`);
    }

    return warnings.length ? `最新组异常：${warnings.join('，')}` : '';
  }, [records, limits]);

  const handleValueChange = (index, nextValue) => {
    setValues((prev) => prev.map((item, i) => (i === index ? nextValue : item)));
  };

  const resetInputs = () => {
    setValues(['', '', '', '', '']);
  };

  const handleAddGroup = () => {
    const numbers = values.map(toNumber);
    if (!date) {
      setMessage('请选择日期');
      return;
    }
    if (numbers.some((item) => item === null)) {
      setMessage('请完整输入 5 个有效数字');
      return;
    }

    const { mean, range } = calcGroupStats(numbers);
    const newRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      date,
      values: numbers,
      mean,
      range,
    };

    setRecords((prev) => [...prev, newRecord]);
    resetInputs();
    setMessage(`第 ${records.length + 1} 组已添加成功`);
  };

  const handleDeleteGroup = (id) => {
    setRecords((prev) => prev.filter((item) => item.id !== id));
    setMessage('该组数据已删除');
  };

  const handleClearAll = () => {
    const confirmed = window.confirm('确定清空全部分组数据吗？此操作不可恢复。');
    if (!confirmed) return;
    setRecords([]);
    setMessage('全部分组数据已清空');
  };

  const handleExportCSV = () => {
    const headers = ['组别', '日期', '数据1', '数据2', '数据3', '数据4', '数据5', 'X-bar', 'R', '状态'];
    const rows = records.map((item, index) => {
      const abnormal =
        (limits.xbarUcl !== '' && item.mean > Number(limits.xbarUcl)) ||
        (limits.xbarLcl !== '' && item.mean < Number(limits.xbarLcl)) ||
        (limits.rUcl !== '' && item.range > Number(limits.rUcl)) ||
        (limits.rLcl !== '' && item.range < Number(limits.rLcl));

      return [
        index + 1,
        formatDate(item.date),
        item.values[0],
        item.values[1],
        item.values[2],
        item.values[3],
        item.values[4],
        item.mean.toFixed(3),
        item.range.toFixed(3),
        abnormal ? '异常' : '正常',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadFile(`spc-xbar-r-${Date.now()}.csv`, `\ufeff${csvContent}`, 'text/csv;charset=utf-8;');
    setMessage('CSV 已导出');
  };

  const handleExportJSON = () => {
    const content = JSON.stringify({ records, limits }, null, 2);
    downloadFile(`spc-xbar-r-${Date.now()}.json`, content, 'application/json;charset=utf-8;');
    setMessage('JSON 已导出');
  };

  const handleImportJSON = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const importedRecords = Array.isArray(parsed.records) ? parsed.records : [];
        setRecords(
          importedRecords.map((item, index) => ({
            id: item.id || `${Date.now()}-${index}`,
            date: item.date || new Date().toISOString().slice(0, 10),
            values: Array.isArray(item.values) ? item.values.map(Number).slice(0, 5) : [0, 0, 0, 0, 0],
            mean: Number(item.mean),
            range: Number(item.range),
          }))
        );
        if (parsed.limits) {
          setLimits((prev) => ({ ...prev, ...parsed.limits }));
        }
        setMessage('JSON 导入成功');
      } catch (error) {
        console.error(error);
        setMessage('导入失败，请确认 JSON 文件格式正确');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.headerRow}>
          <div>
            <h1 style={styles.title}>SPC X-bar / R 监控面板</h1>
            <p style={styles.subtitle}>每天录入 5 个数据，自动计算 X-bar 和 R；控制限由你手动输入</p>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>分组录入</h2>
          <div style={styles.formGrid}>
            <div>
              <label style={styles.label}>日期</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={styles.input} />
            </div>
            {[0, 1, 2, 3, 4].map((index) => (
              <div key={index}>
                <label style={styles.label}>{`数据${index + 1}`}</label>
                <input
                  type="number"
                  step="any"
                  value={values[index]}
                  onChange={(e) => handleValueChange(index, e.target.value)}
                  placeholder={`请输入第 ${index + 1} 个值`}
                  style={styles.input}
                />
              </div>
            ))}
          </div>

          <div style={styles.toolbar}>
            <button onClick={handleAddGroup} style={styles.primaryButton}>添加本组</button>
            <button onClick={handleExportCSV} style={styles.secondaryButton}>导出 CSV</button>
            <button onClick={handleExportJSON} style={styles.secondaryButton}>导出 JSON</button>
            <label style={styles.uploadButton}>
              导入 JSON
              <input type="file" accept="application/json" onChange={handleImportJSON} hidden />
            </label>
            <button onClick={handleClearAll} style={styles.dangerButton}>清空全部</button>
          </div>

          {message ? <div style={styles.message}>{message}</div> : null}
          {latestWarning ? <div style={styles.alarm}>{latestWarning}</div> : null}
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>控制限设置（手动输入）</h2>
          <div style={styles.limitSectionTitle}>X-bar 图</div>
          <div style={styles.limitGrid}>
            <div>
              <label style={styles.label}>UCL</label>
              <input
                type="number"
                step="any"
                value={limits.xbarUcl}
                onChange={(e) => setLimits((prev) => ({ ...prev, xbarUcl: e.target.value }))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>CL</label>
              <input
                type="number"
                step="any"
                value={limits.xbarCl}
                onChange={(e) => setLimits((prev) => ({ ...prev, xbarCl: e.target.value }))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>LCL</label>
              <input
                type="number"
                step="any"
                value={limits.xbarLcl}
                onChange={(e) => setLimits((prev) => ({ ...prev, xbarLcl: e.target.value }))}
                style={styles.input}
              />
            </div>
          </div>

          <div style={{ ...styles.limitSectionTitle, marginTop: 18 }}>R 图</div>
          <div style={styles.limitGrid}>
            <div>
              <label style={styles.label}>UCL</label>
              <input
                type="number"
                step="any"
                value={limits.rUcl}
                onChange={(e) => setLimits((prev) => ({ ...prev, rUcl: e.target.value }))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>CL</label>
              <input
                type="number"
                step="any"
                value={limits.rCl}
                onChange={(e) => setLimits((prev) => ({ ...prev, rCl: e.target.value }))}
                style={styles.input}
              />
            </div>
            <div>
              <label style={styles.label}>LCL</label>
              <input
                type="number"
                step="any"
                value={limits.rLcl}
                onChange={(e) => setLimits((prev) => ({ ...prev, rLcl: e.target.value }))}
                style={styles.input}
              />
            </div>
          </div>
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>总组数</div>
            <div style={styles.statValue}>{overallStats.totalGroups}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>X-double-bar</div>
            <div style={styles.statValue}>{overallStats.xDoubleBar.toFixed(3)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>R-bar</div>
            <div style={styles.statValue}>{overallStats.rBar.toFixed(3)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>异常组数</div>
            <div style={styles.statValue}>{abnormalCount}</div>
          </div>
        </div>

        <div style={styles.card}>
          <ControlChart
            title="X-bar 控制图"
            yLabel="组均值 X-bar"
            data={records}
            cl={limits.xbarCl}
            ucl={limits.xbarUcl}
            lcl={limits.xbarLcl}
            valueKey="mean"
            lineColor="#2563eb"
          />
        </div>

        <div style={styles.card}>
          <ControlChart
            title="R 控制图"
            yLabel="极差 R"
            data={records}
            cl={limits.rCl}
            ucl={limits.rUcl}
            lcl={limits.rLcl}
            valueKey="range"
            lineColor="#7c3aed"
          />
        </div>

        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h2 style={styles.sectionTitle}>分组明细</h2>
            <div style={styles.smallTip}>每行代表 1 天，每组固定 5 个数据</div>
          </div>
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>组别</th>
                  <th style={styles.th}>日期</th>
                  <th style={styles.th}>数据1</th>
                  <th style={styles.th}>数据2</th>
                  <th style={styles.th}>数据3</th>
                  <th style={styles.th}>数据4</th>
                  <th style={styles.th}>数据5</th>
                  <th style={styles.th}>X-bar</th>
                  <th style={styles.th}>R</th>
                  <th style={styles.th}>状态</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="11" style={styles.emptyCell}>暂无记录</td>
                  </tr>
                ) : (
                  records.map((item, index) => {
                    const abnormal =
                      (limits.xbarUcl !== '' && item.mean > Number(limits.xbarUcl)) ||
                      (limits.xbarLcl !== '' && item.mean < Number(limits.xbarLcl)) ||
                      (limits.rUcl !== '' && item.range > Number(limits.rUcl)) ||
                      (limits.rLcl !== '' && item.range < Number(limits.rLcl));

                    return (
                      <tr key={item.id}>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={styles.td}>{formatDate(item.date)}</td>
                        <td style={styles.td}>{item.values[0]}</td>
                        <td style={styles.td}>{item.values[1]}</td>
                        <td style={styles.td}>{item.values[2]}</td>
                        <td style={styles.td}>{item.values[3]}</td>
                        <td style={styles.td}>{item.values[4]}</td>
                        <td style={styles.td}>{item.mean.toFixed(3)}</td>
                        <td style={styles.td}>{item.range.toFixed(3)}</td>
                        <td style={styles.td}>
                          <span style={{ ...styles.badge, ...(abnormal ? styles.badgeAlarm : styles.badgeNormal) }}>
                            {abnormal ? '异常' : '正常'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => handleDeleteGroup(item.id)} style={styles.linkButton}>删除</button>
                        </td>
                      </tr>
                    );
                  })
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
    minHeight: '100vh',
    background: '#f3f4f6',
    padding: '24px',
    boxSizing: 'border-box',
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif',
    color: '#111827',
  },
  container: {
    maxWidth: '1240px',
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '18px',
  },
  title: {
    margin: 0,
    fontSize: '30px',
    fontWeight: 800,
  },
  subtitle: {
    margin: '8px 0 0',
    color: '#6b7280',
    fontSize: '14px',
  },
  card: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '20px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.06)',
    marginBottom: '18px',
  },
  sectionTitle: {
    margin: '0 0 14px',
    fontSize: '20px',
    fontWeight: 800,
    color: '#111827',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, 1fr)',
    gap: '12px',
  },
  limitGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
  },
  limitSectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#374151',
    marginBottom: '10px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    color: '#374151',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '12px 14px',
    borderRadius: '12px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    outline: 'none',
  },
  toolbar: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '16px',
  },
  primaryButton: {
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '11px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    borderRadius: '12px',
    padding: '11px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  uploadButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    borderRadius: '12px',
    padding: '11px 16px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
  },
  dangerButton: {
    border: 'none',
    background: '#dc2626',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '11px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  message: {
    marginTop: '14px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#eff6ff',
    color: '#1d4ed8',
    fontSize: '14px',
    fontWeight: 600,
  },
  alarm: {
    marginTop: '10px',
    padding: '12px 14px',
    borderRadius: '12px',
    background: '#fef2f2',
    color: '#b91c1c',
    fontSize: '14px',
    fontWeight: 700,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '14px',
    marginBottom: '18px',
  },
  statCard: {
    background: '#ffffff',
    borderRadius: '18px',
    padding: '18px',
    boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)',
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '13px',
    marginBottom: '8px',
  },
  statValue: {
    fontSize: '28px',
    fontWeight: 800,
    color: '#111827',
  },
  chartCard: {
    width: '100%',
  },
  chartTitle: {
    margin: '0 0 12px',
    fontSize: '18px',
    fontWeight: 800,
    color: '#111827',
  },
  chartWrap: {
    width: '100%',
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    background: '#ffffff',
  },
  svg: {
    width: '100%',
    minWidth: '920px',
    display: 'block',
  },
  emptyChart: {
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    border: '1px dashed #d1d5db',
    borderRadius: '16px',
    marginTop: '14px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  smallTip: {
    fontSize: '13px',
    color: '#6b7280',
  },
  tableWrap: {
    overflowX: 'auto',
    marginTop: '14px',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '1200px',
  },
  th: {
    background: '#f9fafb',
    textAlign: 'left',
    padding: '12px 14px',
    fontSize: '13px',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb',
  },
  td: {
    padding: '12px 14px',
    fontSize: '14px',
    borderBottom: '1px solid #f3f4f6',
  },
  emptyCell: {
    padding: '24px',
    textAlign: 'center',
    color: '#9ca3af',
  },
  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '999px',
    fontSize: '12px',
    fontWeight: 700,
  },
  badgeNormal: {
    background: '#ecfdf5',
    color: '#047857',
  },
  badgeAlarm: {
    background: '#fef2f2',
    color: '#b91c1c',
  },
  linkButton: {
    border: 'none',
    background: 'transparent',
    color: '#dc2626',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
};
