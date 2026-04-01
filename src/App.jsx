import React, { useState } from "react";

function avg(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function range(arr) {
  return Math.max(...arr) - Math.min(...arr);
}

export default function App() {
  const [inputs, setInputs] = useState(["", "", "", "", ""]);
  const [data, setData] = useState([]);

  const handleChange = (i, val) => {
    const newInputs = [...inputs];
    newInputs[i] = val;
    setInputs(newInputs);
  };

  const addData = () => {
    const nums = inputs.map(Number);
    if (nums.some(isNaN)) {
      alert("请输入5个数字");
      return;
    }
    setData([...data, nums]);
    setInputs(["", "", "", "", ""]);
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

      <div style={{ marginTop: 20 }}>
        {data.map((d, i) => (
          <div key={i}>
            第{i + 1}组：平均={avg(d).toFixed(2)}，极差={range(d).toFixed(2)}
          </div>
        ))}
      </div>
    </div>
  );
}
