import React, { useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'spc-monitor-records-v2';
const SETTINGS_KEY = 'spc-monitor-settings-v2';

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const sec = String(date.getSeconds()).padStart(2, '0');

  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${sec}`;
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

function calculateStats(values) {
  if (!values.length) {
    return {
      count: 0,
      mean: 0,
      min: 0,
      max: 0,
      range: 0,
      std: 0,
    };
  }

  const count = values.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / count;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;

  const variance =
    count > 1
      ? values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (count - 1)
      : 0;

  return {
    count,
    mean,
    min,
    max,
    range,
    std: Math.sqrt(variance),
  };
}

function SimpleLineChart({ data, usl, lsl, height = 320 }) {
  const width = 980;
  const padding = { top: 24, right: 28, bottom: 42, left: 52 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  if (!data.length) {
    return (
      <div style={styles.emptyChart}>
        暂无数据，请先录入测量值
      </div>
    );
  }

  const numericValues = data.map((item) => item.value);
  const allValues = [...numericValues];
  if (usl !== '') allValues.push(Number(usl));
  if (lsl !== '') allValues.push(Number(lsl));

  const minValue = Math.min(...allValues);
  const maxValue = Math.max(...allValues);
  const span = maxValue - minValue || 1;
  const buffer = span * 0.12 || 1;
  const chartMin = minValue - buffer;
  const chartMax = maxValue + buffer;

  const getX = (index) => {
    if (data.length === 1) return padding.left + plotWidth / 2;
    return padding.left + (index / (data.length - 1)) * plotWidth;
  };

  const getY = (value) => {
    const ratio = (value - chartMin) / (chartMax - chartMin || 1);
    return padding.top + plotHeight - ratio * plotHeight;
  };

  const linePath = data
    .map((item, index) => `${index === 0 ? 'M' : 'L'} ${getX(index)} ${getY(item.value)}`)
    .join(' ');

  const yTicks = Array.from({ length: 5 }, (_, i) => chartMin + ((chartMax - chartMin) / 4) * i);
  const tickStep = Math.max(1, Math.ceil(data.length / 10));

  return (
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
                {tick.toFixed(2)}
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

        {lsl !== '' && (
          <g>
            <line
              x1={padding.left}
              y1={getY(Number(lsl))}
              x2={width - padding.right}
              y2={getY(Number(lsl))}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <text
              x={width - padding.right}
              y={getY(Number(lsl)) - 6}
              textAnchor="end"
              fontSize="12"
              fill="#b45309"
            >
              LSL {Number(lsl).toFixed(2)}
            </text>
          </g>
        )}

        {usl !== '' && (
          <g>
            <line
              x1={padding.left}
              y1={getY(Number(usl))}
              x2={width - padding.right}
              y2={getY(Number(usl))}
              stroke="#dc2626"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />
            <text
              x={width - padding.right}
              y={getY(Number(usl)) - 6}
              textAnchor="end"
              fontSize="12"
              fill="#b91c1c"
            >
              USL {Number(usl).toFixed(2)}
            </text>
          </g>
        )}

        <path d={linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" />

        {data.map((item, index) => {
          const outOfLimit =
            (usl !== '' && item.value > Number(usl)) ||
            (lsl !== '' && item.value < Number(lsl));

          return (
            <g key={item.id}>
              <circle
                cx={getX(index)}
                cy={getY(item.value)}
                r="4.5"
                fill={outOfLimit ? '#dc2626' : '#2563eb'}
              />
              <title>{`组别 ${index + 1}\n值: ${item.value}\n时间: ${formatDateTime(item.time)}`}</title>
            </g>
          );
        })}

        {data.map((_, index) => {
          if ((index + 1) % tickStep !== 0 && index !== 0 && index !== data.length - 1) return null;
          return (
            <text
              key={`x-${index}`}
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
          x={18}
          y={height / 2}
          textAnchor="middle"
          fontSize="13"
          fill="#374151"
          fontWeight="600"
          transform={`rotate(-90 18 ${height / 2})`}
        >
          测量值
        </text>
      </svg>
    </div>
  );
}

export default function App() {
  const [inputValue, setInputValue] = useState('');
  const [records, setRecords] = useState([]);
  const [usl, setUsl] = useState('');
  const [lsl, setLsl] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(STORAGE_KEY);
      const savedSettings = localStorage.getItem(SETTINGS_KEY);

      if (savedRecords) {
        const parsed = JSON.parse(savedRecords);
        if (Array.isArray(parsed)) {
          setRecords(parsed);
        }
      }

      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setUsl(parsedSettings.usl ?? '');
        setLsl(parsedSettings.lsl ?? '');
      }
    } catch (error) {
      console.error('读取本地数据失败：', error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        usl,
        lsl,
      })
    );
  }, [usl, lsl]);

  const stats = useMemo(() => calculateStats(records.map((item) => item.value)), [records]);

  const alarmCount = useMemo(() => {
    return records.filter((item) => {
      if (usl !== '' && item.value > Number(usl)) return true;
      if (lsl !== '' && item.value < Number(lsl)) return true;
      return false;
    }).length;
  }, [records, usl, lsl]);

  const latestAlarm = useMemo(() => {
    if (!records.length) return '';

    const latest = records[records.length - 1];
    if (usl !== '' && latest.value > Number(usl)) {
      return `最新一组超上限：${latest.value} > ${usl}`;
    }
    if (lsl !== '' && latest.value < Number(lsl)) {
      return `最新一组超下限：${latest.value} < ${lsl}`;
    }
    return '';
  }, [records, usl, lsl]);

  const handleAddRecord = () => {
    const numericValue = Number(inputValue);

    if (inputValue === '' || Number.isNaN(numericValue)) {
      setMessage('请输入有效数字');
      return;
    }

    const newRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      value: numericValue,
      time: new Date().toISOString(),
    };

    setRecords((prev) => [...prev, newRecord]);
    setInputValue('');

    if (usl !== '' && numericValue > Number(usl)) {
      setMessage(`已记录。当前值 ${numericValue} 超过上限 ${usl}`);
      return;
    }

    if (lsl !== '' && numericValue < Number(lsl)) {
      setMessage(`已记录。当前值 ${numericValue} 低于下限 ${lsl}`);
      return;
    }

    setMessage('记录成功');
  };

  const handleDeleteRecord = (id) => {
    setRecords((prev) => prev.filter((item) => item.id !== id));
    setMessage('已删除该条记录');
  };

  const handleClearAll = () => {
    const confirmed = window.confirm('确定清空全部记录吗？此操作不可恢复。');
    if (!confirmed) return;

    setRecords([]);
    setMessage('全部记录已清空');
  };

  const handleExportCSV = () => {
    const headers = ['组别', '时间', '测量值', '状态'];
    const rows = records.map((item, index) => {
      const status =
        (usl !== '' && item.value > Number(usl)) || (lsl !== '' && item.value < Number(lsl))
          ? '超限'
          : '正常';
      return [index + 1, formatDateTime(item.time), item.value, status];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    downloadFile(`spc-records-${Date.now()}.csv`, `\ufeff${csvContent}`, 'text/csv;charset=utf-8;');
    setMessage('CSV 已导出');
  };

  const handleExportJSON = () => {
    const content = JSON.stringify(
      {
        settings: { usl, lsl },
        records,
      },
      null,
      2
    );

    downloadFile(`spc-records-${Date.now()}.json`, content, 'application/json;charset=utf-8;');
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
            value: Number(item.value),
            time: item.time || new Date().toISOString(),
          }))
        );

        if (parsed.settings) {
          setUsl(parsed.settings.usl ?? '');
          setLsl(parsed.settings.lsl ?? '');
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
            <h1 style={styles.title}>SPC 监控面板</h1>
            <p style={styles.subtitle}>图表横坐标已改为组别，数据明细保留时间记录</p>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.grid2}>
            <div>
              <label style={styles.label}>录入测量值</label>
              <div style={styles.inputRow}>
                <input
                  type="number"
                  step="any"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="请输入测量值"
                  style={styles.input}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddRecord();
                  }}
                />
                <button onClick={handleAddRecord} style={styles.primaryButton}>
                  添加记录
                </button>
              </div>
            </div>

            <div style={styles.limitGrid}>
              <div>
                <label style={styles.label}>上限 USL</label>
                <input
                  type="number"
                  step="any"
                  value={usl}
                  onChange={(e) => setUsl(e.target.value)}
                  placeholder="可选"
                  style={styles.input}
                />
              </div>
              <div>
                <label style={styles.label}>下限 LSL</label>
                <input
                  type="number"
                  step="any"
                  value={lsl}
                  onChange={(e) => setLsl(e.target.value)}
                  placeholder="可选"
                  style={styles.input}
                />
              </div>
            </div>
          </div>

          <div style={styles.toolbar}>
            <button onClick={handleExportCSV} style={styles.secondaryButton}>
              导出 CSV
            </button>
            <button onClick={handleExportJSON} style={styles.secondaryButton}>
              导出 JSON
            </button>
            <label style={styles.uploadButton}>
              导入 JSON
              <input type="file" accept="application/json" onChange={handleImportJSON} hidden />
            </label>
            <button onClick={handleClearAll} style={styles.dangerButton}>
              清空全部
            </button>
          </div>

          {message ? <div style={styles.message}>{message}</div> : null}
          {latestAlarm ? <div style={styles.alarm}>{latestAlarm}</div> : null}
        </div>

        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>总组数</div>
            <div style={styles.statValue}>{stats.count}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>平均值</div>
            <div style={styles.statValue}>{stats.mean.toFixed(3)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>标准差</div>
            <div style={styles.statValue}>{stats.std.toFixed(3)}</div>
          </div>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>超限组数</div>
            <div style={styles.statValue}>{alarmCount}</div>
          </div>
        </div>

        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>趋势图</h2>
          <SimpleLineChart data={records} usl={usl} lsl={lsl} />
        </div>

        <div style={styles.card}>
          <div style={styles.tableHeader}>
            <h2 style={styles.sectionTitle}>数据明细</h2>
            <div style={styles.smallTip}>图表看组别，明细保留时间</div>
          </div>

          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>组别</th>
                  <th style={styles.th}>时间</th>
                  <th style={styles.th}>测量值</th>
                  <th style={styles.th}>状态</th>
                  <th style={styles.th}>操作</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={styles.emptyCell}>
                      暂无记录
                    </td>
                  </tr>
                ) : (
                  records.map((item, index) => {
                    const outOfLimit =
                      (usl !== '' && item.value > Number(usl)) ||
                      (lsl !== '' && item.value < Number(lsl));

                    return (
                      <tr key={item.id}>
                        <td style={styles.td}>{index + 1}</td>
                        <td style={styles.td}>{formatDateTime(item.time)}</td>
                        <td style={styles.td}>{item.value}</td>
                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.badge,
                              ...(outOfLimit ? styles.badgeAlarm : styles.badgeNormal),
                            }}
                          >
                            {outOfLimit ? '超限' : '正常'}
                          </span>
                        </td>
                        <td style={styles.td}>
                          <button onClick={() => handleDeleteRecord(item.id)} style={styles.linkButton}>
                            删除
                          </button>
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
    maxWidth: '1180px',
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
  grid2: {
    display: 'grid',
    gridTemplateColumns: '1.4fr 1fr',
    gap: '16px',
  },
  inputRow: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center',
  },
  limitGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
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
  primaryButton: {
    border: 'none',
    background: '#2563eb',
    color: '#ffffff',
    borderRadius: '12px',
    padding: '12px 18px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  secondaryButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    borderRadius: '12px',
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  uploadButton: {
    border: '1px solid #d1d5db',
    background: '#ffffff',
    color: '#111827',
    borderRadius: '12px',
    padding: '10px 14px',
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
    padding: '10px 14px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '16px',
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
  sectionTitle: {
    margin: 0,
    fontSize: '20px',
    fontWeight: 800,
    color: '#111827',
  },
  chartWrap: {
    marginTop: '14px',
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
    minWidth: '760px',
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
