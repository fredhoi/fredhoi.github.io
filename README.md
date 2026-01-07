# AI Skin Health Assistant (FaceHelper)

一個基於 AI 的智慧皮膚健康分析應用程式，提供即時皮膚問題檢測、個人化護理建議和互動式語音助手功能。

## 📁 專案結構

```
FaceHelper/
├── .gitignore              # Git 忽略規則
├── skin-helper/           # 主要應用程式
│   ├── public/           # 靜態資源
│   ├── src/              # 源代碼
│   ├── package.json      # 專案依賴
│   ├── vite.config.js    # Vite 配置
│   └── ...               # 其他配置文件
└── README.md             # 專案說明
```

## 🚀 快速開始

### 本地開發

1. **安裝依賴**:
   ```bash
   cd skin-helper
   npm install
   ```

2. **啟動開發服務器**:
   ```bash
   npm run dev
   ```

3. **訪問應用**:
   打開瀏覽器訪問 `http://localhost:3000/skin-helper/`

### 部署到 GitHub Pages

詳見 [GitHub Pages 部署指南](./skin-helper/GITHUB_PAGES_DEPLOYMENT.md)

## 🎯 主要功能

- **📷 即時皮膚分析**: 使用相機進行實時皮膚問題檢測
- **📤 圖片上傳**: 支持上傳圖片進行離線分析
- **🎙️ 智慧語音助手**: 提供個性化護理建議和對話功能
- **📊 健康報告**: 顯示檢測結果和置信度分析
- **🎨 可視化地圖**: 2D 皮膚問題分佈圖
- **📱 響應式設計**: 支援各種設備尺寸

## 🛠️ 技術棧

- **前端框架**: Vue 3 + Composition API
- **建構工具**: Vite
- **UI 框架**: Tailwind CSS
- **AI/ML**: TensorFlow.js, MediaPipe Face Mesh
- **3D 可視化**: TresJS (Three.js for Vue)
- **語音功能**: Web Speech API

## 📋 系統要求

- **瀏覽器**: Chrome 88+, Firefox 85+, Safari 14+, Edge 88+
- **硬體**: 需要相機權限進行皮膚分析
- **網路**: 首次載入需要下載 AI 模型（約 50MB）

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

本專案僅供學習和研究使用。

## 📞 聯絡

如有問題或建議，請通過 GitHub Issues 聯絡我們。
