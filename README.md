# SPC Xbar-R 质量监控网站

这是一个可直接部署到 Vercel 的 React + Vite 项目。

## 你怎么用
### 方法 1：最简单
1. 到 Vercel 注册并登录
2. 选择 `Add New Project`
3. 上传这个文件夹压缩包
4. 点 `Deploy`

### 方法 2：本地运行
```bash
npm install
npm run dev
```

## 功能
- 每组输入 5 个测量值
- Xbar-R 控制图
- 手动设置控制限
- 自动计算控制限（n=5）
- 基础判异规则：7 点同侧、6 点连续上升或下降
- 本地自动保存
- 导出 CSV
