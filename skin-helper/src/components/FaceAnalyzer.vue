<template>
  <div class="relative w-full max-w-2xl mx-auto">
    <!-- 相機視頻區域 -->
    <div class="relative bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref="videoRef"
        autoplay
        playsinline
        muted
        class="w-full h-auto transform scale-x-[-1]"
        @loadedmetadata="onVideoLoaded"
      ></video>

      <!-- 畫布疊加層用於繪製檢測結果 -->
      <canvas
        ref="canvasRef"
        class="absolute top-0 left-0 w-full h-full transform scale-x-[-1]"
      ></canvas>

      <!-- 載入指示器 -->
      <div
        v-if="isLoading"
        class="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50"
      >
        <div class="text-white text-center">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>AI 分析中...</p>
        </div>
      </div>

      <!-- 錯誤顯示 -->
      <div
        v-if="initializationError && !isLoading"
        class="absolute inset-0 flex items-center justify-center bg-red-900 bg-opacity-50"
      >
        <div class="text-white text-center max-w-md px-4">
          <div class="text-6xl mb-4">⚠️</div>
          <h3 class="text-xl font-bold mb-2">初始化失敗</h3>
          <p class="text-sm opacity-90 mb-4">{{ initializationError }}</p>
          <button
            @click="retryInitialization"
            class="px-6 py-2 bg-white text-red-900 rounded-lg hover:bg-gray-100 font-medium"
          >
            重試
          </button>
        </div>
      </div>
    </div>

    <!-- 控制按鈕 -->
    <div class="mt-4 flex justify-center space-x-4">
      <button
        @click="startAnalysis"
        :disabled="isAnalyzing || !isModelLoaded"
        class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ isAnalyzing ? '分析中...' : '開始分析' }}
      </button>

      <button
        @click="stopAnalysis"
        class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
      >
        停止
      </button>
    </div>
    <!-- 圖片上傳 -->
    <div class="mt-4 flex justify-center">
      <label class="px-4 py-2 bg-gray-200 rounded cursor-pointer">
        上傳照片
        <input type="file" accept="image/*" class="hidden" @change="onFileChange" />
      </label>
      <button @click="clearUpload" class="ml-3 px-4 py-2 bg-gray-300 rounded">清除照片</button>
    </div>

    <!-- 狀態信息 -->
    <div class="mt-4 text-center text-sm">
      <p v-if="initializationError" class="text-red-600">
        {{ initializationError }}
      </p>
      <p v-else-if="!isModelLoaded && !isLoading" class="text-orange-600">
        AI 模型載入失敗，請檢查網路連接
      </p>
      <p v-else-if="!isModelLoaded" class="text-gray-600">
        載入 AI 模型中...
      </p>
      <p v-else-if="isAnalyzing" class="text-green-600">
        即時檢測中 - 檢測到 {{ detectedIssues.length }} 個問題區域
      </p>
      <p v-else class="text-gray-600">
        模型已就緒，點擊開始分析
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, readonly } from 'vue'
import * as tf from '@tensorflow/tfjs'
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection'

// 組件屬性
const props = defineProps({})
const emit = defineEmits(['detection-result', 'upload-image', 'model-status'])

// 響應式數據
const videoRef = ref(null)
const canvasRef = ref(null)
const isLoading = ref(true)
const isAnalyzing = ref(false)
const isModelLoaded = ref(false)
const detectedIssues = ref([])
const uploadedImageDataUrl = ref(null)
const isImageMode = ref(false)
const imageElement = ref(null)
const initializationError = ref('')
const modelDebug = ref(null)

// AI 模型實例
let detector = null
let animationFrame = null
let stream = null
// 本地皮膚分類模型 (TensorFlow.js)
let skinModel = null
// 本地模型類別映射（prediction index -> issue type）
const CLASS_ORDER = ['acne', 'blackhead', 'spot', 'large_pores', 'wrinkle']

// 皮膚問題類型映射
const ISSUE_TYPES = {
  ACNE: 'acne',
  BLACKHEAD: 'blackhead',
  SPOT: 'spot',
  LARGE_PORES: 'large_pores',
  WRINKLE: 'wrinkle'
}

// 問題類型中文名稱
const ISSUE_NAMES = {
  [ISSUE_TYPES.ACNE]: '痤瘡',
  [ISSUE_TYPES.BLACKHEAD]: '黑頭',
  [ISSUE_TYPES.SPOT]: '色斑',
  [ISSUE_TYPES.LARGE_PORES]: '毛孔粗大',
  [ISSUE_TYPES.WRINKLE]: '皺紋'
}

// 初始化 AI 模型
const initializeModel = async () => {
  try {
    console.log('開始初始化 TensorFlow.js...')
    await tf.ready()
    console.log('TensorFlow.js 初始化完成')

    console.log('載入 MediaPipe Face Mesh 模型...')
    const model = faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh
    detector = await faceLandmarksDetection.createDetector(model, {
      runtime: 'tfjs',
      refineLandmarks: true,
      maxFaces: 1
    })
    console.log('Face Mesh 模型載入完成')

    isModelLoaded.value = true
    initializationError.value = ''
    console.log('AI 模型初始化成功')
  } catch (error) {
    console.error('模型初始化失敗:', error)
    initializationError.value = `AI 模型初始化失敗: ${error.message}`
    isModelLoaded.value = false
  }
}

// 初始化相機
const initializeCamera = async () => {
  try {
    console.log('請求相機權限...')
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        facingMode: 'user'
      }
    })
    console.log('相機初始化成功')

    if (videoRef.value) {
      videoRef.value.srcObject = stream
      console.log('視頻流已設置到 video 元素')
    }
  } catch (error) {
    console.error('相機初始化失敗:', error)
    initializationError.value = `相機初始化失敗: ${error.message}`
    alert('無法訪問相機，請確保已授權相機權限並使用 HTTPS')
  }
}

// 載入本地 TensorFlow.js 模型（嘗試多個常見路徑作 fallback）
const loadLocalSkinModel = async () => {
  const candidatePaths = [
    '/models/skin_classifier/model.json',
    '/model/skin_classifier/model.json',
    '/models/model.json',
    '/model/model.json',
    '/model/model.json', // fallback duplicates safe
    '/models/skin_classifier/model.json' // final retry
  ]

  for (const p of candidatePaths) {
    try {
      // 先檢查 model.json 是否存在且為有效 JSON
      const resp = await fetch(p, { cache: 'no-store' })
      if (!resp.ok) {
        console.debug('model.json not found at', p, resp.status)
        continue
      }

      const txt = await resp.text()
      try {
        const parsed = JSON.parse(txt) // quick validation
        // build parsed summary for UI/debug
        const parsedSummary = {
          path: p,
          format: parsed.format || parsed['format'],
          modelTopologyType: parsed.modelTopology ? parsed.modelTopology.class_name || parsed.modelTopology['class_name'] : undefined,
          convertedBy: parsed.convertedBy || parsed['convertedBy'],
          weightsCount: parsed.weightsManifest ? parsed.weightsManifest.reduce((acc, m) => acc + (m.weights ? m.weights.length : 0), 0) : undefined
        }
        modelDebug.value = { status: 'found', summary: parsedSummary }
        emit('model-status', modelDebug.value)
        console.debug('model.json parsed summary:', parsedSummary)
      } catch (e) {
        console.debug('Invalid JSON at', p)
        continue
      }

      // 嘗試用 tfjs 載入 (layers model)
      try {
        skinModel = await tf.loadLayersModel(p)
        console.log('本地皮膚分類模型 (layers) 已載入，來源：', p)
        modelDebug.value = { status: 'loaded', source: p, mode: 'layers' }
        emit('model-status', modelDebug.value)
        return
      } catch (layersErr) {
        console.debug('loadLayersModel failed for', p, layersErr)
        // 回退：嘗試 graph model
        try {
          skinModel = await tf.loadGraphModel(p)
          console.log('本地皮膚分類模型 (graph) 已載入，來源：', p)
          modelDebug.value = { status: 'loaded', source: p, mode: 'graph' }
          emit('model-status', modelDebug.value)
          return
        } catch (graphErr) {
          console.warn('loadGraphModel also failed for', p, graphErr)
          // 最後嘗試使用 browserFiles IOHandler（fetch shards 並以 File 形式傳入）
          try {
            console.log('嘗試透過 browserFiles 回退載入模型（fetch shards）', p)
            const baseUrl = p.substring(0, p.lastIndexOf('/') + 1)
            // make absolute base URL using window.location.origin to avoid Invalid base URL
            const absoluteBase = (typeof window !== 'undefined' && window.location && window.location.origin)
              ? new URL(baseUrl, window.location.origin).toString()
              : baseUrl
            const modelJson = JSON.parse(txt)
            const files = []
            // model.json 作為第一個檔案
            files.push(new File([txt], 'model.json', { type: 'application/json' }))
            if (modelJson.weightsManifest && Array.isArray(modelJson.weightsManifest)) {
              for (const manifestEntry of modelJson.weightsManifest) {
                for (const shardPath of manifestEntry.paths) {
                  const shardUrl = new URL(shardPath, absoluteBase).toString()
                  console.debug('fetching shard', shardUrl)
                  const respShard = await fetch(shardUrl)
                  if (!respShard.ok) throw new Error('Failed to fetch shard: ' + shardUrl)
                  const ab = await respShard.arrayBuffer()
                  const fileName = shardPath.split('/').pop()
                  files.push(new File([ab], fileName, { type: 'application/octet-stream' }))
                }
              }
            }
            skinModel = await tf.loadLayersModel(tf.io.browserFiles(files))
            console.log('本地皮膚分類模型 (layers via browserFiles) 已載入，來源：', p)
            modelDebug.value = { status: 'loaded', source: p, mode: 'layers_browserFiles' }
            emit('model-status', modelDebug.value)
            return
          } catch (browserFilesErr) {
            console.error('browserFiles fallback failed for', p, browserFilesErr)
            modelDebug.value = { status: 'error', source: p, error: String(browserFilesErr) }
            emit('model-status', modelDebug.value)
            throw graphErr
          }
        }
      }
    } catch (err) {
      console.warn('嘗試從', p, '載入模型失敗：', err)
      skinModel = null
      continue
    }
  }

  console.warn('未找到可用的本地皮膚模型 (嘗試過多個路徑)')
  skinModel = null
}

// 皮膚問題檢測算法
const detectSkinIssues = async (face, imageData) => {
  const issues = []

  try {
    // 1. 痤瘡檢測 - 基於顏色變化與紋理分析
    const acneIssues = await detectAcne(face, imageData)
    issues.push(...acneIssues)

    // 2. 黑頭檢測 - 基於暗色區域與形狀分析
    const blackheadIssues = await detectBlackheads(face, imageData)
    issues.push(...blackheadIssues)

    // 3. 色斑檢測 - 基於顏色不均勻性
    const spotIssues = await detectSpots(face, imageData)
    issues.push(...spotIssues)

    // 4. 毛孔粗大檢測 - 基於紋理細節分析
    const poreIssues = await detectLargePores(face, imageData)
    issues.push(...poreIssues)

    // 5. 皺紋檢測 - 基於邊緣檢測與形狀分析
    const wrinkleIssues = await detectWrinkles(face, imageData)
    issues.push(...wrinkleIssues)

  } catch (error) {
    console.error('皮膚問題檢測失敗:', error)
  }

  // 若有本地分類模型，做全臉或分區的補充檢測
  try {
    if (skinModel && videoRef.value) {
      // 取整張臉部區域進行快速分類（模型需返回 5 類概率）
      const keypoints = face.keypoints
      const faceRegion = getFaceRegion(keypoints)

      // 裁切出影像區塊並預處理成 tensor
      const patchTensor = cropFacePatchTensor(faceRegion)
      if (patchTensor) {
        const preds = await skinModel.predict(patchTensor)
        const probs = await preds.data()
        // 假設模型輸出對應順序: [acne, blackhead, spot, large_pores, wrinkle]
        const CLASS_ORDER = ['acne', 'blackhead', 'spot', 'large_pores', 'wrinkle']
        for (let i = 0; i < probs.length && i < CLASS_ORDER.length; i++) {
          const p = probs[i]
          if (p > 0.35) { // 閾值可調
            const severity = Math.min(5, Math.max(1, Math.round(p * 5)))
            issues.push({
              type: CLASS_ORDER[i],
              name: ISSUE_NAMES[CLASS_ORDER[i]],
              position: { x: faceRegion.x + faceRegion.width / 2, y: faceRegion.y + faceRegion.height / 2 },
              severity,
              confidence: Number(p.toFixed(3)),
              region: 'face',
              source: 'local_model'
            })
          }
        }
        // 清理
        if (preds.dispose) preds.dispose()
        patchTensor.dispose()
      }
    }
  } catch (err) {
    console.warn('本地模型推理失敗:', err)
  }

  return issues
}

// 一次性執行模型預測，回傳 issues 陣列（不啟動循環）
const runPredictionOnce = async () => {
  try {
    if (!skinModel || !canvasRef.value) return null

    // ensure detector is ready
    if (!detector) {
      console.warn('detector is not ready, attempting to initialize...')
      try {
        await initializeModel()
      } catch (e) {
        console.warn('initializeModel failed while recovering detector:', e)
      }
      if (!detector) {
        console.warn('detector still not available; aborting single prediction')
        return null
      }
    }

    let faces = null
    let face = null

    // 如果處於 image mode，使用上傳的圖片
    if (isImageMode.value && uploadedImageDataUrl.value) {
      const img = new Image()
      img.src = uploadedImageDataUrl.value
      await new Promise((res, rej) => {
        img.onload = res
        img.onerror = rej
      })
      // draw image onto canvas for consistent preprocessing
      const canvas = canvasRef.value
      const ctx = canvas.getContext('2d')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.drawImage(img, 0, 0)

      faces = await detector?.estimateFaces(img)
      face = faces && faces[0]
      // build patch tensor from the canvas crop
      if (face) {
        const faceRegion = getFaceRegion(face.keypoints)
        const tmp = document.createElement('canvas')
        tmp.width = Math.max(1, Math.floor(faceRegion.width))
        tmp.height = Math.max(1, Math.floor(faceRegion.height))
        const tctx = tmp.getContext('2d')
        tctx.drawImage(canvas, faceRegion.x, faceRegion.y, faceRegion.width, faceRegion.height, 0, 0, tmp.width, tmp.height)
        let tensor = tf.browser.fromPixels(tmp).toFloat()
        tensor = tf.image.resizeBilinear(tensor, [128, 128]).div(255.0).expandDims(0)
        const preds = await skinModel.predict(tensor)
        const probs = Array.from(await preds.data())
        if (preds.dispose) preds.dispose()
        tensor.dispose()
        const top3 = probs
          .map((p, i) => ({ type: CLASS_ORDER[i] || `class_${i}`, prob: Number(p.toFixed(4)) }))
          .sort((a, b) => b.prob - a.prob)
          .slice(0, 3)
        const results = []
        probs.forEach((p, i) => {
          results.push({
            type: CLASS_ORDER[i] || 'unknown',
            name: ISSUE_NAMES[CLASS_ORDER[i]] || CLASS_ORDER[i],
            confidence: Number(p.toFixed(3)),
            severity: Math.min(5, Math.max(1, Math.round(p * 5))),
            position: { x: faceRegion.x + faceRegion.width / 2, y: faceRegion.y + faceRegion.height / 2 },
            region: 'face',
            source: 'single_prediction'
          })
        })
        return { results, top3 }
      } else {
        return []
      }
    } else {
      if (!videoRef.value) return null
      const canvas = canvasRef.value
      const ctx = canvas.getContext('2d')
      ctx.drawImage(videoRef.value, 0, 0)
      faces = await detector?.estimateFaces(videoRef.value)
      face = faces && faces[0]
    }
    if (!faces || faces.length === 0) return []

    const faceRegion = getFaceRegion(face.keypoints)
    const patchTensor = cropFacePatchTensor(faceRegion, 128)
    if (!patchTensor) return []

    const preds = await skinModel.predict(patchTensor)
    const probs = Array.from(await preds.data())
    // compute top-3 probabilities
    const top3 = probs
      .map((p, i) => ({ type: CLASS_ORDER[i] || `class_${i}`, prob: Number(p.toFixed(4)) }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3)
    const results = []
    probs.forEach((p, i) => {
      results.push({
        type: CLASS_ORDER[i] || 'unknown',
        name: ISSUE_NAMES[CLASS_ORDER[i]] || CLASS_ORDER[i],
        confidence: Number(p.toFixed(3)),
        severity: Math.min(5, Math.max(1, Math.round(p * 5))),
        position: { x: faceRegion.x + faceRegion.width / 2, y: faceRegion.y + faceRegion.height / 2 },
        region: 'face',
        source: 'single_prediction'
      })
    })

    if (preds.dispose) preds.dispose()
    patchTensor.dispose()
    return { results, top3 }
  } catch (err) {
    console.error('runPredictionOnce error:', err)
    return null
  }
}

// 對整張上傳圖片或任意 dataUrl 進行模型分類（不依賴 detector）
const predictWholeImage = async (dataUrl, targetSize = 256) => {
  try {
    if (!skinModel) {
      // fallback to dummy predictor so UI can show Top3/confidences for debugging
      console.warn('predictWholeImage: skinModel not loaded, using dummy predictor')
      const dummy = await dummyPredict(targetSize)
      modelDebug.value = { status: 'dummy_active', source: 'internal_dummy' }
      emit('model-status', modelDebug.value)
      return dummy
    }
    const img = new Image()
    img.src = dataUrl
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
    })
    const tmp = document.createElement('canvas')
    tmp.width = targetSize
    tmp.height = targetSize
    const ctx = tmp.getContext('2d')
    // draw and resize to model input size
    ctx.drawImage(img, 0, 0, targetSize, targetSize)
    let tensor = tf.browser.fromPixels(tmp).toFloat()
    tensor = tf.image.resizeBilinear(tensor, [targetSize, targetSize]).div(255.0).expandDims(0)
    const preds = await skinModel.predict(tensor)
    const probs = Array.from(await preds.data())
    if (preds.dispose) preds.dispose()
    tensor.dispose()
    const top3 = probs
      .map((p, i) => ({ type: CLASS_ORDER[i] || `class_${i}`, prob: Number(p.toFixed(4)) }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 3)
    return { probs, top3 }
  } catch (err) {
    console.error('predictWholeImage error:', err)
    return null
  }
}

// Dummy predictor - returns stable pseudo-random probs summing to 1
const dummyPredict = async (targetSize = 256) => {
  // produce deterministic pseudo-random numbers using current time slice
  const seed = Math.floor(Date.now() / 10000)
  const rng = (n) => {
    // simple LCG
    let x = (seed + n) & 0xffffffff
    x = (1664525 * x + 1013904223) & 0xffffffff
    return (x % 1000) / 1000
  }
  const probs = CLASS_ORDER.map((_, i) => rng(i) + 0.05)
  const sum = probs.reduce((a, b) => a + b, 0)
  const norm = probs.map(p => p / sum)
  const top3 = norm
    .map((p, i) => ({ type: CLASS_ORDER[i] || `class_${i}`, prob: Number(p.toFixed(4)) }))
    .sort((a, b) => b.prob - a.prob)
    .slice(0, 3)
  return { probs: norm, top3 }
}

// 裁切 video 畫面上的區域並回傳預處理後的 tensor (shape [1,h,w,3])
const cropFacePatchTensor = (region, targetSize = 128, sourceElement = null) => {
  try {
    const src = sourceElement || videoRef.value
    if (!src) return null
    const tmp = document.createElement('canvas')
    tmp.width = Math.max(1, Math.floor(region.width))
    tmp.height = Math.max(1, Math.floor(region.height))
    const ctx = tmp.getContext('2d')
    // 支援從 video 或 image/canvas 裁切
    ctx.drawImage(src, region.x, region.y, region.width, region.height, 0, 0, tmp.width, tmp.height)
    let tensor = tf.browser.fromPixels(tmp).toFloat()
    tensor = tf.image.resizeBilinear(tensor, [targetSize, targetSize])
    tensor = tensor.div(255.0).expandDims(0)
    return tensor
  } catch (err) {
    console.warn('裁切 patch 失敗:', err)
    return null
  }
}

// 痤瘡檢測算法
const detectAcne = async (face, imageData) => {
  const issues = []
  const keypoints = face.keypoints

  // 簡化的痤瘡檢測邏輯（實際應使用訓練好的模型）
  // 這裡使用顏色閾值和形狀檢測來模擬

  // 在臉頰和額頭區域檢測紅色區域
  const cheekRegions = getCheekRegions(keypoints)

  for (const region of cheekRegions) {
    const regionPixels = getRegionPixels(imageData, region)

    // 檢測紅色高亮區域（痤瘡特徵）
    const redSpots = detectRedRegions(regionPixels, region)

    redSpots.forEach(spot => {
      issues.push({
        type: ISSUE_TYPES.ACNE,
        name: ISSUE_NAMES[ISSUE_TYPES.ACNE],
        position: spot.position,
        severity: spot.severity,
        confidence: spot.confidence,
        region: 'cheek'
      })
    })
  }

  return issues
}

// 黑頭檢測算法
const detectBlackheads = async (face, imageData) => {
  const issues = []
  const keypoints = face.keypoints

  // 在T字區和鼻子區域檢測暗色點狀區域
  const tZoneRegions = getTZoneRegions(keypoints)

  for (const region of tZoneRegions) {
    const regionPixels = getRegionPixels(imageData, region)

    // 檢測暗色圓形區域（黑頭特徵）
    const darkSpots = detectDarkCircularRegions(regionPixels, region)

    darkSpots.forEach(spot => {
      issues.push({
        type: ISSUE_TYPES.BLACKHEAD,
        name: ISSUE_NAMES[ISSUE_TYPES.BLACKHEAD],
        position: spot.position,
        severity: spot.severity,
        confidence: spot.confidence,
        region: 't_zone'
      })
    })
  }

  return issues
}

// 色斑檢測算法
const detectSpots = async (face, imageData) => {
  const issues = []
  const keypoints = face.keypoints

  // 在全臉區域檢測顏色不均勻區域
  const faceRegion = getFaceRegion(keypoints)
  const regionPixels = getRegionPixels(imageData, faceRegion)

  // 檢測顏色偏差較大的區域
  const colorIrregularities = detectColorIrregularities(regionPixels, faceRegion)

  colorIrregularities.forEach(spot => {
    issues.push({
      type: ISSUE_TYPES.SPOT,
      name: ISSUE_NAMES[ISSUE_TYPES.SPOT],
      position: spot.position,
      severity: spot.severity,
      confidence: spot.confidence,
      region: 'face'
    })
  })

  return issues
}

// 毛孔粗大檢測算法
const detectLargePores = async (face, imageData) => {
  const issues = []
  const keypoints = face.keypoints

  // 在T字區檢測紋理細節
  const tZoneRegions = getTZoneRegions(keypoints)

  for (const region of tZoneRegions) {
    const regionPixels = getRegionPixels(imageData, region)

    // 檢測粗糙紋理區域（毛孔粗大特徵）
    const roughTextures = detectRoughTextures(regionPixels, region)

    roughTextures.forEach(area => {
      issues.push({
        type: ISSUE_TYPES.LARGE_PORES,
        name: ISSUE_NAMES[ISSUE_TYPES.LARGE_PORES],
        position: area.position,
        severity: area.severity,
        confidence: area.confidence,
        region: 't_zone'
      })
    })
  }

  return issues
}

// 皺紋檢測算法
const detectWrinkles = async (face, imageData) => {
  const issues = []
  const keypoints = face.keypoints

  // 在眼睛、額頭和嘴巴周圍檢測線性特徵
  const wrinkleRegions = getWrinkleRegions(keypoints)

  for (const region of wrinkleRegions) {
    const regionPixels = getRegionPixels(imageData, region)

    // 檢測線性邊緣（皺紋特徵）
    const linearFeatures = detectLinearFeatures(regionPixels, region)

    linearFeatures.forEach(line => {
      issues.push({
        type: ISSUE_TYPES.WRINKLE,
        name: ISSUE_NAMES[ISSUE_TYPES.WRINKLE],
        position: line.position,
        severity: line.severity,
        confidence: line.confidence,
        region: region.name
      })
    })
  }

  return issues
}

// 輔助函數 - 獲取臉部區域
const getCheekRegions = (keypoints) => {
  // 簡化的臉頰區域定義
  return [{
    x: keypoints[234].x, y: keypoints[234].y,
    width: Math.abs(keypoints[454].x - keypoints[234].x),
    height: Math.abs(keypoints[152].y - keypoints[10].y)
  }]
}

const getTZoneRegions = (keypoints) => {
  // T字區：額頭、鼻子、下巴
  return [
    { name: 'forehead', x: keypoints[10].x, y: keypoints[10].y - 50, width: 100, height: 80 },
    { name: 'nose', x: keypoints[1].x, y: keypoints[1].y, width: 60, height: 100 }
  ]
}

const getFaceRegion = (keypoints) => {
  const minX = Math.min(...keypoints.map(k => k.x))
  const maxX = Math.max(...keypoints.map(k => k.x))
  const minY = Math.min(...keypoints.map(k => k.y))
  const maxY = Math.max(...keypoints.map(k => k.y))

  return {
    x: minX, y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

const getWrinkleRegions = (keypoints) => {
  return [
    { name: 'forehead', x: keypoints[10].x, y: keypoints[10].y - 30, width: 120, height: 40 },
    { name: 'eye_area', x: keypoints[226].x, y: keypoints[226].y, width: 80, height: 30 },
    { name: 'mouth_area', x: keypoints[0].x, y: keypoints[0].y, width: 60, height: 20 }
  ]
}

// 輔助函數 - 像素處理
const getRegionPixels = (imageData, region) => {
  const pixels = []
  const data = imageData.data
  const width = imageData.width
  const height = imageData.height

  // 確保區域坐標在圖像範圍內
  const startX = Math.max(0, Math.floor(region.x))
  const startY = Math.max(0, Math.floor(region.y))
  const endX = Math.min(width, Math.floor(region.x + region.width))
  const endY = Math.min(height, Math.floor(region.y + region.height))

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const index = (y * width + x) * 4
      pixels.push({
        x, y,
        r: data[index],
        g: data[index + 1],
        b: data[index + 2],
        a: data[index + 3]
      })
    }
  }

  return pixels
}

// 計算顏色距離
const colorDistance = (color1, color2) => {
  return Math.sqrt(
    Math.pow(color1.r - color2.r, 2) +
    Math.pow(color1.g - color2.g, 2) +
    Math.pow(color1.b - color2.b, 2)
  )
}

// 計算區域平均顏色
const getAverageColor = (pixels) => {
  if (pixels.length === 0) return { r: 0, g: 0, b: 0 }

  let totalR = 0, totalG = 0, totalB = 0
  pixels.forEach(pixel => {
    totalR += pixel.r
    totalG += pixel.g
    totalB += pixel.b
  })

  return {
    r: totalR / pixels.length,
    g: totalG / pixels.length,
    b: totalB / pixels.length
  }
}

// 檢測紅色區域（痤瘡）
const detectRedRegions = (pixels, region) => {
  const issues = []
  const threshold = 30 // 紅色閾值
  const minSize = 5 // 最小區域大小

  // 將像素分組為小的區域
  const regions = []
  const processed = new Set()

  pixels.forEach(pixel => {
    if (processed.has(`${pixel.x},${pixel.y}`)) return

    // 檢查是否為紅色區域（紅色通道明顯高於其他通道）
    if (pixel.r > pixel.g + threshold && pixel.r > pixel.b + threshold) {
      const region = floodFill(pixels, pixel.x, pixel.y, (p) =>
        p.r > p.g + threshold && p.r > p.b + threshold
      )

      if (region.length >= minSize) {
        regions.push(region)
        region.forEach(p => processed.add(`${p.x},${p.y}`))
      }
    }
  })

  // 為每個檢測到的紅色區域創建問題記錄
  regions.forEach(regionPixels => {
    const centerX = regionPixels.reduce((sum, p) => sum + p.x, 0) / regionPixels.length
    const centerY = regionPixels.reduce((sum, p) => sum + p.y, 0) / regionPixels.length
    const avgColor = getAverageColor(regionPixels)

    // 根據紅色強度和區域大小評估嚴重程度
    const severity = Math.min(5, Math.floor(
      (regionPixels.length / 20) * (avgColor.r / 255) * 3
    )) + 1

    issues.push({
      position: { x: centerX, y: centerY },
      severity: severity,
      confidence: Math.min(0.95, regionPixels.length / 50),
      size: regionPixels.length
    })
  })

  return issues
}

// 檢測暗色圓形區域（黑頭）
const detectDarkCircularRegions = (pixels, region) => {
  const issues = []
  const threshold = 80 // 暗色閾值
  const minRadius = 2 // 最小半徑

  pixels.forEach(pixel => {
    // 檢查是否為暗色區域
    const brightness = (pixel.r + pixel.g + pixel.b) / 3
    if (brightness < threshold) {
      // 檢查是否近似圓形
      const circularity = checkCircularity(pixels, pixel.x, pixel.y, minRadius)
      if (circularity > 0.7) { // 圓形度大於70%
        issues.push({
          position: { x: pixel.x, y: pixel.y },
          severity: Math.floor((threshold - brightness) / 20) + 1,
          confidence: circularity,
          radius: minRadius
        })
      }
    }
  })

  return issues
}

// 檢測顏色不均勻區域（色斑）
const detectColorIrregularities = (pixels, region) => {
  const issues = []
  const blockSize = 8 // 分析區塊大小
  const threshold = 25 // 顏色差異閾值

  const width = Math.floor(region.width)
  const height = Math.floor(region.height)

  // 將區域分為網格
  for (let y = 0; y < height - blockSize; y += blockSize) {
    for (let x = 0; x < width - blockSize; x += blockSize) {
      const blockPixels = pixels.filter(p =>
        p.x >= region.x + x && p.x < region.x + x + blockSize &&
        p.y >= region.y + y && p.y < region.y + y + blockSize
      )

      if (blockPixels.length > 0) {
        const avgColor = getAverageColor(blockPixels)
        const variance = calculateColorVariance(blockPixels, avgColor)

        if (variance > threshold) {
          const centerX = region.x + x + blockSize / 2
          const centerY = region.y + y + blockSize / 2

          issues.push({
            position: { x: centerX, y: centerY },
            severity: Math.min(5, Math.floor(variance / 10)),
            confidence: Math.min(0.9, variance / 100),
            variance: variance
          })
        }
      }
    }
  }

  return issues
}

// 檢測粗糙紋理（毛孔粗大）
const detectRoughTextures = (pixels, region) => {
  const issues = []
  const windowSize = 5 // 紋理分析窗口大小
  const threshold = 15 // 紋理粗糙度閾值

  pixels.forEach(pixel => {
    // 計算局部紋理變化
    const neighbors = getNeighbors(pixels, pixel.x, pixel.y, windowSize)
    if (neighbors.length > 0) {
      const textureVariance = calculateTextureVariance(neighbors, pixel)
      if (textureVariance > threshold) {
        issues.push({
          position: { x: pixel.x, y: pixel.y },
          severity: Math.min(5, Math.floor(textureVariance / 5)),
          confidence: Math.min(0.85, textureVariance / 50),
          textureVariance: textureVariance
        })
      }
    }
  })

  return issues
}

// 檢測線性特徵（皺紋）
const detectLinearFeatures = (pixels, region) => {
  const issues = []
  const minLength = 10 // 最小線段長度
  const threshold = 20 // 邊緣強度閾值

  // 使用Sobel算子檢測邊緣
  const edges = detectEdges(pixels, region)

  // 尋找連續的邊緣點形成線段
  const lines = findLineSegments(edges, minLength, threshold)

  lines.forEach(line => {
    // 根據線段長度和強度評估皺紋嚴重程度
    const severity = Math.min(5, Math.floor(line.length / 20) + Math.floor(line.strength / 30))
    const confidence = Math.min(0.9, (line.length / 50) * (line.strength / 100))

    issues.push({
      position: { x: line.centerX, y: line.centerY },
      severity: severity,
      confidence: confidence,
      length: line.length,
      strength: line.strength
    })
  })

  return issues
}

// 洪水填充算法
const floodFill = (pixels, startX, startY, condition) => {
  const region = []
  const visited = new Set()
  const queue = [{ x: startX, y: startY }]

  while (queue.length > 0) {
    const current = queue.shift()
    const key = `${current.x},${current.y}`

    if (visited.has(key)) continue
    visited.add(key)

    const pixel = pixels.find(p => p.x === current.x && p.y === current.y)
    if (!pixel || !condition(pixel)) continue

    region.push(pixel)

    // 添加相鄰像素
    const neighbors = [
      { x: current.x + 1, y: current.y },
      { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 },
      { x: current.x, y: current.y - 1 }
    ]

    neighbors.forEach(neighbor => {
      const neighborKey = `${neighbor.x},${neighbor.y}`
      if (!visited.has(neighborKey)) {
        queue.push(neighbor)
      }
    })
  }

  return region
}

// 檢查圓形度
const checkCircularity = (pixels, centerX, centerY, radius) => {
  let onCircle = 0
  let total = 0

  for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
    const x = Math.round(centerX + radius * Math.cos(angle))
    const y = Math.round(centerY + radius * Math.sin(angle))

    const pixel = pixels.find(p => p.x === x && p.y === y)
    if (pixel) {
      const brightness = (pixel.r + pixel.g + pixel.b) / 3
      if (brightness < 100) onCircle++ // 暗色點
    }
    total++
  }

  return onCircle / total
}

// 計算顏色方差
const calculateColorVariance = (pixels, avgColor) => {
  if (pixels.length === 0) return 0

  let variance = 0
  pixels.forEach(pixel => {
    variance += Math.pow(colorDistance(pixel, avgColor), 2)
  })

  return variance / pixels.length
}

// 獲取鄰域像素
const getNeighbors = (pixels, centerX, centerY, radius) => {
  return pixels.filter(pixel => {
    const distance = Math.sqrt(
      Math.pow(pixel.x - centerX, 2) + Math.pow(pixel.y - centerY, 2)
    )
    return distance <= radius && distance > 0
  })
}

// 計算紋理方差
const calculateTextureVariance = (neighbors, centerPixel) => {
  if (neighbors.length === 0) return 0

  let variance = 0
  neighbors.forEach(neighbor => {
    const diff = colorDistance(centerPixel, neighbor)
    variance += diff * diff
  })

  return variance / neighbors.length
}

// Sobel邊緣檢測
const detectEdges = (pixels, region) => {
  const edges = []
  const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1]
  const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1]

  pixels.forEach(pixel => {
    const neighbors = get3x3Neighbors(pixels, pixel.x, pixel.y)
    if (neighbors.length === 9) {
      let gx = 0, gy = 0

      for (let i = 0; i < 9; i++) {
        const brightness = (neighbors[i].r + neighbors[i].g + neighbors[i].b) / 3
        gx += brightness * sobelX[i]
        gy += brightness * sobelY[i]
      }

      const magnitude = Math.sqrt(gx * gx + gy * gy)
      if (magnitude > 50) { // 邊緣閾值
        edges.push({
          x: pixel.x,
          y: pixel.y,
          strength: magnitude
        })
      }
    }
  })

  return edges
}

// 獲取3x3鄰域
const get3x3Neighbors = (pixels, centerX, centerY) => {
  const neighbors = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const pixel = pixels.find(p => p.x === centerX + dx && p.y === centerY + dy)
      if (pixel) neighbors.push(pixel)
    }
  }
  return neighbors
}

// 尋找線段
const findLineSegments = (edges, minLength, threshold) => {
  const lines = []
  const visited = new Set()

  edges.forEach(edge => {
    if (visited.has(`${edge.x},${edge.y}`) || edge.strength < threshold) return

    const line = traceLine(edges, edge.x, edge.y, visited)
    if (line.length >= minLength) {
      const centerX = line.reduce((sum, p) => sum + p.x, 0) / line.length
      const centerY = line.reduce((sum, p) => sum + p.y, 0) / line.length
      const avgStrength = line.reduce((sum, p) => sum + p.strength, 0) / line.length

      lines.push({
        centerX, centerY,
        length: line.length,
        strength: avgStrength
      })
    }
  })

  return lines
}

// 線段追蹤
const traceLine = (edges, startX, startY, visited) => {
  const line = []
  const queue = [{ x: startX, y: startY }]

  while (queue.length > 0) {
    const current = queue.shift()
    const key = `${current.x},${current.y}`

    if (visited.has(key)) continue

    const edge = edges.find(e => e.x === current.x && e.y === current.y)
    if (!edge) continue

    visited.add(key)
    line.push(edge)

    // 檢查8個方向的相鄰邊緣點
    const directions = [
      [-1, -1], [-1, 0], [-1, 1],
      [0, -1],           [0, 1],
      [1, -1],  [1, 0],  [1, 1]
    ]

    directions.forEach(([dx, dy]) => {
      const neighborX = current.x + dx
      const neighborY = current.y + dy
      const neighborKey = `${neighborX},${neighborY}`

      if (!visited.has(neighborKey)) {
        const neighborEdge = edges.find(e => e.x === neighborX && e.y === neighborY)
        if (neighborEdge && neighborEdge.strength > 30) {
          queue.push({ x: neighborX, y: neighborY })
        }
      }
    })
  }

  return line
}

// 分析循環
const analyzeFrame = async () => {
  if (!isAnalyzing.value || !detector || !videoRef.value || !canvasRef.value) return

  try {
    console.log('analyzeFrame tick')
    const faces = await detector.estimateFaces(videoRef.value)

    let meta = null
    if (faces.length > 0) {
      const canvas = canvasRef.value
      const ctx = canvas.getContext('2d')
      const video = videoRef.value

      // 設置畫布尺寸
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      // 清空畫布
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // 繪製視頻幀
      ctx.drawImage(video, 0, 0)

      // 獲取圖像數據
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      // 檢測皮膚問題
      const issues = await detectSkinIssues(faces[0], imageData)
      detectedIssues.value = issues

      // 繪製檢測結果
      drawDetectionResults(ctx, faces[0], issues)

      // 限制最多顯示8個問題
      const limitedIssues = issues ? issues.slice(0, 8) : []

      // 發送檢測結果給父組件
      if (!limitedIssues || limitedIssues.length === 0) meta = { noIssuesDetected: true }
      emit('detection-result', limitedIssues, faces[0], meta)
    }
  } catch (error) {
    console.error('分析幀失敗:', error)
  }

  // 繼續下一幀分析
  animationFrame = requestAnimationFrame(analyzeFrame)
}

// 分析上傳的圖片（單次）
const analyzeImageFile = async (dataUrl) => {
  try {
    const img = new Image()
    img.src = dataUrl
    await new Promise((res, rej) => {
      img.onload = res
      img.onerror = rej
    })

    // 確保 detector 已初始化
    if (!detector) {
      console.warn('analyzeImageFile: detector 尚未就緒，嘗試重新初始化')
      try {
        await initializeModel()
      } catch (e) {
        console.warn('重新初始化 detector 失敗:', e)
      }
    }

    // 使用 detector 處理靜態圖像
    const faces = await detector?.estimateFaces(img)
    if (!faces || faces.length === 0) {
      detectedIssues.value = []
      emit('detection-result', [], null, { noIssuesDetected: true })
      return
    }

    // 在 canvas 上繪製並獲取 imageData
    const canvas = canvasRef.value
    const ctx = canvas.getContext('2d')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

    const issues = await detectSkinIssues(faces[0], imageData)
    detectedIssues.value = issues
    // also compute top3 via model or dummy predictor
    let meta = null
    try {
      const modelPred = await predictWholeImage(dataUrl)
      if (modelPred) {
        meta = { top3: modelPred.top3, probs: modelPred.probs }
        // attach per-issue confidences where possible
        for (let i = 0; i < (modelPred.probs || []).length; i++) {
          const type = CLASS_ORDER[i] || `class_${i}`
          // add a pseudo-issue entry if none exists for that type
          if (!issues.find(it => it.type === type)) {
            issues.push({
              type,
              name: ISSUE_NAMES[type] || type,
              confidence: Number(modelPred.probs[i].toFixed ? modelPred.probs[i].toFixed(3) : Number(modelPred.probs[i]).toFixed(3)),
              severity: Math.min(5, Math.max(1, Math.round((modelPred.probs[i] || 0) * 5))),
              position: { x: canvas.width / 2, y: canvas.height / 2 },
              region: 'face',
              source: 'model_only'
            })
          }
        }
      }
    } catch (e) {
      console.warn('predictWholeImage for meta failed:', e)
    }

    // 限制最多顯示8個問題
    const limitedIssues = issues ? issues.slice(0, 8) : []

    emit('detection-result', limitedIssues, faces[0], meta)
  } catch (err) {
    console.error('analyzeImageFile error:', err)
  }
}

// 繪製檢測結果
const drawDetectionResults = (ctx, face, issues) => {
  // 繪製臉部關鍵點
  ctx.strokeStyle = '#00ff00'
  ctx.lineWidth = 1
  face.keypoints.forEach(point => {
    ctx.beginPath()
    ctx.arc(point.x, point.y, 2, 0, 2 * Math.PI)
    ctx.stroke()
  })

  // 繪製檢測到的問題區域
  issues.forEach(issue => {
    const color = getIssueColor(issue.type)
    ctx.strokeStyle = color
    ctx.fillStyle = color + '40' // 半透明填充
    ctx.lineWidth = 2

    ctx.beginPath()
    ctx.arc(issue.position.x, issue.position.y, 10 + issue.severity * 5, 0, 2 * Math.PI)
    ctx.fill()
    ctx.stroke()

    // 繪製問題標籤
    ctx.fillStyle = '#ffffff'
    ctx.font = '12px Arial'
    ctx.fillText(issue.name, issue.position.x + 15, issue.position.y - 5)
  })
}

// 獲取問題類型顏色
const getIssueColor = (type) => {
  const colors = {
    [ISSUE_TYPES.ACNE]: '#ff4444',      // 紅色 - 痤瘡
    [ISSUE_TYPES.BLACKHEAD]: '#444444', // 深灰 - 黑頭
    [ISSUE_TYPES.SPOT]: '#ffaa00',      // 橙色 - 色斑
    [ISSUE_TYPES.LARGE_PORES]: '#aa44ff', // 紫色 - 毛孔
    [ISSUE_TYPES.WRINKLE]: '#4444ff'    // 藍色 - 皺紋
  }
  return colors[type] || '#ffffff'
}

// 開始分析
const startAnalysis = () => {
  if (!isModelLoaded.value) return
  console.log('startAnalysis invoked, isModelLoaded=', isModelLoaded.value)
  // Start continuous analysis loop
  isAnalyzing.value = true
  analyzeFrame()
  // Also run a single-shot model prediction if available
  runPredictionOnce().then(res => {
    if (res && res.results) {
      console.log('single prediction result:', res)
      // 限制最多顯示8個問題
      const limitedResults = res.results ? res.results.slice(0, 8) : []
      emit('detection-result', limitedResults, null, { top3: res.top3 })
    }
  }).catch(err => {
    console.warn('single prediction failed:', err)
  })
}

// 停止分析
const stopAnalysis = () => {
  console.log('stopAnalysis invoked')
  isAnalyzing.value = false
  if (animationFrame) {
    cancelAnimationFrame(animationFrame)
    animationFrame = null
  }
  detectedIssues.value = []
  // notify parent that analysis stopped
  emit('detection-result', [], null)
}

// 重試初始化
const retryInitialization = async () => {
  console.log('重試初始化...')
  isLoading.value = true
  initializationError.value = ''
  isModelLoaded.value = false

  try {
    await Promise.all([
      initializeModel(),
      initializeCamera()
    ])
    isLoading.value = false
  } catch (error) {
    console.error('重試初始化失敗:', error)
    isLoading.value = false
  }
}

// 視頻載入完成
const onVideoLoaded = () => {
  const canvas = canvasRef.value
  if (canvas && videoRef.value) {
    canvas.width = videoRef.value.videoWidth
    canvas.height = videoRef.value.videoHeight
  }
}

// 生命週期
onMounted(async () => {
  try {
    console.log('開始應用初始化...')
    await Promise.all([
      initializeModel(),
      initializeCamera(),
      loadLocalSkinModel()
    ])
    console.log('應用初始化完成')
  } catch (error) {
    console.error('應用初始化失敗:', error)
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  stopAnalysis()
  if (stream) {
    stream.getTracks().forEach(track => track.stop())
  }
})

// 檔案選擇處理
const onFileChange = async (event) => {
  const file = event.target.files && event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = async (e) => {
    const dataUrl = e.target.result
    uploadedImageDataUrl.value = dataUrl
    isImageMode.value = true
    // 停止 camera 分析循環
    stopAnalysis()
    // 發送上傳圖片給父組件（事件）
    emit('upload-image', dataUrl)
    // 執行靜態圖片分析
    await analyzeImageFile(dataUrl)
  }
  reader.readAsDataURL(file)
}

const clearUpload = () => {
  uploadedImageDataUrl.value = null
  isImageMode.value = false
  imageElement.value = null
  // 恢復 camera 分析（不自動啟動）
  // 呼叫父組件通知
  emit('upload-image', null)
}

// 暴露方法給父組件
defineExpose({
  startAnalysis,
  stopAnalysis,
  retryInitialization,
  isAnalyzing: readonly(isAnalyzing),
  isModelLoaded: readonly(isModelLoaded),
  detectedIssues: readonly(detectedIssues),
  initializationError: readonly(initializationError)
})
</script>
