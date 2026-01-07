import { createApp } from 'vue'
import App from './App.vue'

// 引入 Tailwind CSS
import './style.css'

// TresJS 全局組件註冊 (v5 兼容)
import { TresCanvas } from '@tresjs/core'
import {
  OrbitControls,
  GLTFModel
} from '@tresjs/cientos'

// 創建 Vue 應用實例
const app = createApp(App)

// TresJS v5 組件會自動註冊，無需手動註冊

// 全局錯誤處理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue 應用錯誤:', err)
  console.error('錯誤信息:', info)
  console.error('組件實例:', instance)

  // 在生產環境中可以發送錯誤報告到服務器
  if (process.env.NODE_ENV === 'production') {
    // reportErrorToServer(err, info)
  }
}

// 全局警告處理
app.config.warnHandler = (msg, instance, trace) => {
  console.warn('Vue 警告:', msg)
  console.warn('組件實例:', instance)
  console.warn('組件追蹤:', trace)
}

// 性能監控（僅在開發環境）
if (process.env.NODE_ENV === 'development') {
  app.config.performance = true
}

// 掛載應用
app.mount('#app')

// 應用啟動後的初始化檢查
setTimeout(() => {
  console.log('AI 皮膚健康助手已成功載入')

  // 檢查必要的 Web API 支持
  const apiSupport = {
    camera: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
    speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
    speechSynthesis: 'speechSynthesis' in window,
    webgl: (() => {
      try {
        const canvas = document.createElement('canvas')
        return !!(window.WebGLRenderingContext &&
          canvas.getContext('webgl'))
      } catch (e) {
        return false
      }
    })(),
    serviceWorker: 'serviceWorker' in navigator,
    indexedDB: 'indexedDB' in window,
  }

  console.log('API 支持檢查:', apiSupport)

  // 如果關鍵 API 不支持，顯示警告
  if (!apiSupport.camera) {
    console.warn('警告: 相機 API 不受支持，無法進行皮膚分析')
  }

  if (!apiSupport.webgl) {
    console.warn('警告: WebGL 不受支持，3D 模型可能無法正常顯示')
  }

  // 導出全局應用實例（用於調試）
  if (process.env.NODE_ENV === 'development') {
    window.__VUE_APP__ = app
  }
})
