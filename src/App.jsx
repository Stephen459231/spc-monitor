import { useState } from "react";

export default function App() {
  const [data, setData] = useState([]);

  return (
    <div style={{ padding: 20 }}>
      <h1>SPC Xbar-R 质量监控</h1>
      <p>页面已经成功运行 ✅</p>
      <p>接下来我们可以再优化功能</p>
    </div>
  );
}
