<template>
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <!-- 頁面標題 -->
    <header class="bg-white shadow-lg hover:shadow-xl transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="flex items-center justify-between">
          <div class="hover:scale-105 transition-transform duration-300 cursor-pointer">
            <h1 class="text-3xl font-bold text-gray-900">AI 皮膚健康助手</h1>
            <p class="text-gray-600 mt-2">智能皮膚分析 · 個性化護理建議 · 可視化</p>
          </div>
          <div class="flex items-center space-x-4">
            <!-- 語音控制按鈕 -->
            <button
              @click="toggleSpeech"
              :class="[
                'px-4 py-2 rounded-lg font-medium transition-all duration-300 transform active:scale-95',
                (speech?.isListening?.value)
                  ? 'bg-red-500 text-white animate-pulse hover:scale-105'
                  : 'bg-blue-500 text-white hover:bg-blue-600 hover:scale-105'
              ]"
            >
              {{ speech?.isListening?.value ? '🎤 聆聽中...' : '🎤 語音助手' }}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要內容區域 -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <!-- 左側：AI 分析區域 -->
        <div class="space-y-6">
          <!-- 相機與 AI 分析 -->
          <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
            <div class="p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-300">
              <h2 class="text-xl font-semibold text-gray-900">即時皮膚分析</h2>
              <p class="text-gray-600 text-sm mt-1">啟動相機進行 AI 智能檢測</p>
            </div>
            <FaceAnalyzer
              @detection-result="handleDetectionResult"
              @upload-image="handleUploadImage"
              @model-status="handleModelStatus"
              ref="faceAnalyzerRef"
            />
          </div>

          <!-- 語音交互區域 -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">語音助手</h3>

            <!-- 語音狀態指示器 -->
            <div class="flex items-center space-x-4 mb-4">
              <div class="flex items-center space-x-2 hover:scale-105 transition-transform duration-300 cursor-pointer">
                <div :class="[
                  'w-3 h-3 rounded-full transition-all duration-300',
                  speech?.canListen?.value ? 'bg-green-500 hover:scale-110' : 'bg-gray-400'
                ]"></div>
                <span class="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-300">
                  {{ speech?.canListen?.value ? '語音識別就緒' : '語音識別不可用' }}
                </span>
              </div>

              <div class="flex items-center space-x-2 hover:scale-105 transition-transform duration-300 cursor-pointer">
                <div :class="[
                  'w-3 h-3 rounded-full transition-all duration-300',
                  speech?.canSpeak?.value ? 'bg-green-500 hover:scale-110' : 'bg-gray-400'
                ]"></div>
                <span class="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-300">
                  {{ speech?.canSpeak?.value ? '語音合成就緒' : '語音合成不可用' }}
                </span>
              </div>
            </div>

            <!-- 語音轉錄本 -->
            <div v-if="speech?.lastResult?.value" class="bg-gray-50 rounded-lg p-4 mb-4 hover:bg-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer">
              <p class="text-sm text-gray-700">
                <strong>您說：</strong>{{ speech.lastResult.value }}
              </p>
            </div>

            <!-- 助手回應 -->
            <div v-if="assistantResponse" class="bg-blue-50 rounded-lg p-4 mb-4 hover:bg-blue-100 hover:shadow-md transition-all duration-300 cursor-pointer">
              <p class="text-sm text-gray-700">
                <strong>🤖 助手：</strong>{{ assistantResponse }}
              </p>
            </div>

            <!-- 語音控制提示 -->
            <div class="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-300 cursor-pointer">
              <p>💡 試著說："痤瘡怎麼辦" 或 "色斑的原因是什麼"</p>
            </div>
          </div>
        </div>

        <!-- 右側：3D 模型與報告 -->
        <div class="space-y-6">
          <!-- 3D 臉部模型 -->
          <div class="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
            <div class="p-6 border-b border-gray-200 hover:bg-gray-50 transition-colors duration-300">
              <h2 class="text-xl font-semibold text-gray-900">皮膚地圖</h2>
              <p class="text-gray-600 text-sm mt-1">可視化皮膚問題分布</p>
            </div>
            <FaceModel
              :issues="detectionResults"
              :face-landmarks="faceLandmarks"
              :image-src="uploadedImage || undefined"
              ref="faceModelRef"
            />
          </div>

          <!-- 皮膚健康報告 -->
          <div class="bg-white rounded-xl shadow-lg p-6 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer">
            <h3 class="text-lg font-semibold text-gray-900 mb-4">皮膚健康報告</h3>

            <!-- 檢測統計 -->
            <div v-if="detectionResults.length > 0" class="space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-blue-50 rounded-lg p-4 hover:bg-blue-100 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                  <div class="text-2xl font-bold text-blue-600">{{ detectionResults.length }}</div>
                  <div class="text-sm text-blue-800">檢測到問題</div>
                </div>
                <div class="bg-green-50 rounded-lg p-4 hover:bg-green-100 hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer">
                  <div class="text-2xl font-bold text-green-600">{{ getHealthyScore() }}%</div>
                  <div class="text-sm text-green-800">健康評分</div>
                </div>
              </div>

              <!-- 問題詳情 -->
              <div class="space-y-3">
                <h4 class="font-medium text-gray-900">檢測結果詳情：</h4>
                <div
                  v-for="(issue, index) in detectionResults"
                  :key="index"
                  class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 hover:shadow-md hover:scale-[1.02] transition-all duration-300 cursor-pointer"
                >
                  <div class="flex items-center space-x-3">
                    <div
                      :class="[
                        'w-4 h-4 rounded-full transition-transform duration-300 hover:scale-110',
                        getIssueColorClass(issue.type)
                      ]"
                    ></div>
                    <span class="font-medium hover:text-gray-800 transition-colors duration-300">{{ issue.name }}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <div class="flex space-x-1">
                      <div
                        v-for="i in 5"
                        :key="i"
                        :class="[
                          'w-2 h-2 rounded-full transition-all duration-300 hover:scale-110',
                          i <= issue.severity ? 'bg-yellow-400' : 'bg-gray-300'
                        ]"
                      ></div>
                    </div>
                    <div class="text-right">
                      <div class="text-sm text-gray-600 hover:text-gray-800 transition-colors duration-300">嚴重度 {{ issue.severity }}</div>
                      <div class="text-xs text-gray-500 hover:text-gray-600 transition-colors duration-300">信心度 {{ ((issue.confidence || 0) * 100).toFixed(1) }}%</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 建議 -->
              <div class="mt-6">
                <h4 class="font-medium text-gray-900 mb-3">護理建議：</h4>
                <div class="space-y-2 text-sm text-gray-700">
                  <p v-for="suggestion in getSuggestions()" :key="suggestion" class="flex items-start space-x-2 hover:bg-green-50 hover:shadow-sm p-2 rounded-md transition-all duration-300 cursor-pointer hover:scale-[1.01]">
                    <span class="text-green-500 mt-1 transition-transform duration-300 hover:scale-125">✓</span>
                    <span class="hover:text-gray-900 transition-colors duration-300">{{ suggestion }}</span>
                  </p>
                </div>
              </div>
              
              <!-- 模型 top3 概率 -->
              <div v-if="top3 && top3.length" class="mt-4 hover:shadow-md p-3 rounded-lg transition-all duration-300 hover:bg-purple-50">
                <h4 class="font-medium text-gray-900 mb-2">模型 Top-3 預測</h4>
                <ul class="text-sm text-gray-700 list-disc list-inside">
                  <li v-for="(t, idx) in top3" :key="idx" class="hover:text-gray-900 hover:scale-105 transition-all duration-300 cursor-pointer py-1">
                    {{ idx + 1 }}. {{ t.type }} — 機率 {{ (t.prob * 100).toFixed(2) }}%
                  </li>
                </ul>
              </div>
              <div v-else-if="modelStatus && modelStatus.status !== 'loaded'" class="mt-4 p-3 bg-yellow-50 rounded hover:bg-yellow-100 hover:shadow-md transition-all duration-300 cursor-pointer">
                <p class="text-sm text-yellow-800 font-medium">模型尚未載入或載入失敗，無法顯示 Top‑3 與信心度。</p>
                <p class="text-xs text-gray-600 mt-2">請檢查右側「模型載入狀態」中的錯誤訊息或重新整理頁面。</p>
              </div>

              <!-- 模型載入狀態（debug） -->
              <div v-if="modelStatus" class="mt-4 p-3 bg-gray-50 rounded hover:bg-gray-100 hover:shadow-md transition-all duration-300 cursor-pointer">
                <h4 class="font-medium text-gray-900 mb-2">模型載入狀態</h4>
                <div class="text-sm text-gray-700">
                  <p>狀態: <strong class="hover:text-blue-600 transition-colors duration-300">{{ modelStatus.status }}</strong></p>
                  <p v-if="modelStatus.summary" class="hover:text-gray-800 transition-colors duration-300">來源: {{ modelStatus.summary.path }}</p>
                  <p v-if="modelStatus.source" class="hover:text-gray-800 transition-colors duration-300">載入來源: {{ modelStatus.source }}</p>
                  <p v-if="modelStatus.mode" class="hover:text-gray-800 transition-colors duration-300">載入模式: {{ modelStatus.mode }}</p>
                  <p v-if="modelStatus.error" class="text-red-600 hover:text-red-700 transition-colors duration-300">錯誤: {{ modelStatus.error }}</p>
                  <pre v-if="modelStatus.summary" class="text-xs text-gray-600 mt-2 whitespace-pre-wrap hover:text-gray-700 transition-colors duration-300">{{ JSON.stringify(modelStatus.summary, null, 2) }}</pre>
                </div>
              </div>
            </div>

            <!-- 無檢測結果提示 -->
            <div v-else class="text-center py-8 text-gray-500 hover:text-gray-700 transition-colors duration-300">
              <div class="text-6xl mb-4 hover:scale-110 transition-transform duration-300 cursor-pointer">🔍</div>
              <p v-if="!noIssuesDetected" class="hover:text-gray-600 transition-colors duration-300">請啟動相機並開始分析</p>
              <p v-if="!noIssuesDetected" class="text-sm mt-2 hover:text-gray-500 transition-colors duration-300">系統將自動檢測您的皮膚問題</p>
              <div v-else class="space-y-2">
                <p class="font-medium hover:text-gray-800 transition-colors duration-300">系統/模型未檢測到明顯問題。</p>
                <p class="text-sm text-gray-600 hover:text-gray-500 transition-colors duration-300">（若您確定有可見問題，請嘗試使用更清晰照片或調整光線）</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 頁面底部 -->
    <footer class="bg-white border-t border-gray-200 mt-12 hover:shadow-lg transition-all duration-300">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div class="text-center text-gray-600 text-sm hover:text-gray-800 transition-colors duration-300 cursor-pointer">
          <p>© 2024 AI 皮膚健康助手 · 基於 TensorFlow.js & Vue 3 · 本地處理，保護隱私</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import FaceAnalyzer from './components/FaceAnalyzer.vue'
import FaceModel from './components/FaceModel.vue'
import { useSpeech } from './composables/useSpeech.js'

// 響應式數據
  const detectionResults = ref([])
const faceLandmarks = ref(null)
const uploadedImage = ref(null)
const top3 = ref([])
const faceAnalyzerRef = ref(null)
const faceModelRef = ref(null)
const modelStatus = ref(null)
const noIssuesDetected = ref(false)
const assistantResponse = ref('')

// 語音助手
const speech = useSpeech(detectionResults)

// 監聽語音回應變化
watch(() => speech.conversationHistory?.value, (history) => {
  if (history && history.length > 0) {
    const lastConversation = history[history.length - 1]
    assistantResponse.value = lastConversation.response || ''
  }
}, { deep: true })

// 處理檢測結果
const handleDetectionResult = (results, landmarks, meta) => {
  detectionResults.value = results || []
  faceLandmarks.value = landmarks || null
  if (meta && meta.top3) {
    top3.value = meta.top3
    console.log('Top3:', top3.value)
  }
  noIssuesDetected.value = !!(meta && meta.noIssuesDetected)
  console.log('收到檢測結果:', detectionResults.value.length, '個問題')
}

const handleUploadImage = (dataUrl) => {
  uploadedImage.value = dataUrl
  if (dataUrl) {
    console.log('Uploaded image received (size approx):', Math.round((dataUrl.length || 0) / 1024), 'KB')
  } else {
    console.log('Uploaded image cleared (received null)')
  }
}

const handleModelStatus = (status) => {
  modelStatus.value = status
  console.log('模型狀態更新:', status)
}
 
// 若模型狀態為錯誤或尚未載入，清空 top3 並提示
watch(() => modelStatus.value, (s) => {
  if (!s) return
  if (s.status !== 'loaded') {
    top3.value = []
  }
})

// 切換語音功能
const toggleSpeech = () => {
  if (!speech) return

  try {
    if (speech.isListening?.value) {
      speech.stopListening?.()
    } else {
      speech.startListening?.()
    }
  } catch (error) {
    console.error('語音切換失敗:', error)
  }
}

// 計算健康評分
const getHealthyScore = () => {
  if (detectionResults.value.length === 0) return 100

  const totalSeverity = detectionResults.value.reduce((sum, issue) => sum + issue.severity, 0)
  const averageSeverity = totalSeverity / detectionResults.value.length
  const score = Math.max(0, 100 - (averageSeverity * 15))
  return Math.round(score)
}

// 獲取問題顏色類
const getIssueColorClass = (type) => {
  const colors = {
    acne: 'bg-red-500',
    blackhead: 'bg-gray-800',
    spot: 'bg-orange-500',
    large_pores: 'bg-purple-500',
    wrinkle: 'bg-blue-500'
  }
  return colors[type] || 'bg-gray-500'
}

// 獲取護理建議
const getSuggestions = () => {
  const suggestions = new Set()

  detectionResults.value.forEach(issue => {
    // 根據問題類型添加建議
    const issueSuggestions = getIssueSuggestions(issue.type)
    issueSuggestions.slice(0, 2).forEach(suggestion => suggestions.add(suggestion))
  })

  return Array.from(suggestions).slice(0, 5)
}

// 獲取具體問題的建議
const getIssueSuggestions = (type) => {
  const suggestionMap = {
    acne: ['保持臉部清潔，每天早晚洗臉', '使用含水楊酸的產品', '避免用手擠壓痤瘡'],
    blackhead: ['使用溫和的去角質產品', '定期清潔毛孔', '保持臉部補水'],
    spot: ['每天使用防曬霜', '使用美白產品', '保持規律作息'],
    large_pores: ['使用收斂毛孔的產品', '定期去角質', '保持補水'],
    wrinkle: ['使用保濕產品', '防曬保護', '健康生活習慣']
  }

  return suggestionMap[type] || ['保持良好的護理習慣', '定期檢查皮膚狀況']
}

// 組件掛載
onMounted(() => {
  speech.init()
  console.log('AI 皮膚健康助手已啟動')
})

// 組件卸載
onUnmounted(() => {
  speech.cleanup()
})
</script>

<style scoped>
/* 自定義動畫 */
@keyframes pulse-ring {
  0% {
    transform: scale(0.33);
  }
  40%, 50% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: scale(1.5);
  }
}

.animate-pulse {
  animation: pulse-ring 2s cubic-bezier(0.455, 0.03, 0.515, 0.955) infinite;
}
</style>
