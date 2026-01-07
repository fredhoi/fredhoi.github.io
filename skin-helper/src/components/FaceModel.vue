<template>
  <div class="w-full h-96 bg-gray-100 rounded-lg overflow-hidden relative">
    <!-- 2D 底圖 -->
    <img
      ref="imageRef"
      :src="chosenImg"
      alt="Face map"
      class="w-full h-full object-contain"
      @load="onImageLoad"
      @error="onImageError"
    />

    <!-- 標記覆蓋層 -->
    <div class="absolute inset-0 pointer-events-none">
      <template v-for="(issue, index) in issues" :key="`marker-${index}`">
        <div
          class="absolute flex items-center space-x-2 transform -translate-x-1/2 -translate-y-1/2"
          :style="getMarkerStyle(issue)"
        >
          <div
            :title="`${issue.name} (嚴重度 ${issue.severity})`"
            :class="getMarkerClass(issue.type)"
            :style="getMarkerCircleStyle(issue)"
          ></div>
          <div class="text-xs bg-white bg-opacity-80 px-2 py-1 rounded shadow">
            <div class="font-medium">{{ issue.name }}</div>
            <div class="text-gray-600">嚴重度 {{ issue.severity }}</div>
          </div>
        </div>
      </template>
    </div>

    <!-- 控制面板 -->
    <div class="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg p-3 shadow-lg">
      <div class="flex flex-col space-y-2">
        <div class="text-xs text-gray-600">
          <p>問題數量: {{ issues.length }}</p>
          <p>圖像狀態: {{ modelLoaded ? '已載入' : '載入中' }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'
import { TresCanvas } from '@tresjs/core'
import { OrbitControls, GLTFModel } from '@tresjs/cientos'
import * as THREE from 'three'
import IssueMarker from './IssueMarker.vue'
import SeverityIndicator from './SeverityIndicator.vue'

// 組件屬性
const props = defineProps({
  issues: {
    type: Array,
    default: () => []
  },
  faceLandmarks: {
    type: Object,
    default: null
  }
  ,
  imageSrc: {
    type: String,
    default: ''
  }
})

// 響應式數據
const canvasRef = ref(null)
const faceGroupRef = ref(null)
const modelRef = ref(null)
const modelLoaded = ref(false)
const showStats = ref(false)
const animatedMarkers = ref([])
const markerAnimations = ref(new Map())
// device pixel ratio for TresCanvas (safe for SSR)
const dpr = ref(typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1)
// 2D image
const imageRef = ref(null)
const issues = computed(() => props.issues || [])
const BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) ? import.meta.env.BASE_URL : '/'
const chosenImg = computed(() => {
  return props.imageSrc && props.imageSrc.length > 0 ? props.imageSrc : `${BASE_URL}test.png`
})

const modelError = ref('')

const onImageLoad = (e) => {
  modelLoaded.value = true
  if (!imageRef.value) imageRef.value = e.target
}

const onImageError = (e) => {
  modelLoaded.value = false
  modelError.value = `2D 臉部底圖載入失敗，請確認 ${BASE_URL}models/face.png 是否存在`
  console.error(modelError.value, e)
}

// 監聽父組件傳入的 imageSrc 變化，用於排查有時不顯示的狀況
watch(() => props.imageSrc, (val) => {
  try {
    if (!val) {
      console.log('FaceModel: imageSrc cleared or empty; using default base image')
      modelLoaded.value = false
      // reset imageRef src if element present
      if (imageRef.value && imageRef.value.src) {
        imageRef.value.src = chosenImg.value
      }
      return
    }
    console.log('FaceModel: received new imageSrc (length approx):', Math.round((val.length || 0) / 1024), 'KB')
    modelLoaded.value = false
    // if image element already mounted, update src to force reload
    if (imageRef.value) {
      imageRef.value.src = val
    }
  } catch (e) {
    console.warn('FaceModel watch imageSrc error:', e)
  }
}, { immediate: false })

// 計算標記位置（像素）
const get2DPosition = (issue) => {
  const img = imageRef.value
  if (!img || !props.faceLandmarks || !props.faceLandmarks.keypoints) {
    // fallback: center
    return { left: '50%', top: '50%' }
  }

  const keypoints = props.faceLandmarks.keypoints
  const regionMapping = FACE_LANDMARK_MAPPING[issue.region] || [{ landmarkIndex: 1, weight: 1 }]

  let totalX = 0, totalY = 0, totalWeight = 0
  regionMapping.forEach(({ landmarkIndex, weight }) => {
    const p = keypoints[landmarkIndex]
    if (p) {
      totalX += p.x * weight
      totalY += p.y * weight
      totalWeight += weight
    }
  })

  if (totalWeight === 0) return { left: '50%', top: '50%' }

  const avgX = totalX / totalWeight
  const avgY = totalY / totalWeight

  // normalize using assumed video size 640x480 (same as FaceAnalyzer)
  const VIDEO_W = 640, VIDEO_H = 480
  const normX = avgX / VIDEO_W
  const normY = avgY / VIDEO_H

  // Use percentage positioning so markers scale with the image element
  const leftPct = Math.max(0, Math.min(1, normX)) * 100
  const topPct = Math.max(0, Math.min(1, normY)) * 100
  return { left: `${leftPct}%`, top: `${topPct}%` }
}

const getMarkerStyle = (issue) => {
  return get2DPosition(issue)
}

const getMarkerClass = (type) => {
  const map = {
    acne: 'bg-red-500',
    blackhead: 'bg-gray-800',
    spot: 'bg-orange-500',
    large_pores: 'bg-purple-500',
    wrinkle: 'bg-blue-500'
  }
  return `w-4 h-4 rounded-full ${map[type] || 'bg-white'}`
}

const getMarkerCircleStyle = (issue) => {
  const size = 8 + (issue.severity || 1) * 4
  return {
    width: `${size}px`,
    height: `${size}px`,
    boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
  }
}

// 2D 到 3D 坐標映射
const FACE_LANDMARK_MAPPING = {
  // 額頭區域
  forehead: [
    { landmarkIndex: 10, weight: 1.0 },  // 額頭中心
    { landmarkIndex: 151, weight: 0.8 }, // 額頭左側
    { landmarkIndex: 9, weight: 0.8 }    // 額頭右側
  ],

  // 臉頰區域
  cheek_left: [
    { landmarkIndex: 234, weight: 1.0 }, // 左臉頰
    { landmarkIndex: 93, weight: 0.7 },
    { landmarkIndex: 132, weight: 0.7 }
  ],

  cheek_right: [
    { landmarkIndex: 454, weight: 1.0 }, // 右臉頰
    { landmarkIndex: 323, weight: 0.7 },
    { landmarkIndex: 361, weight: 0.7 }
  ],

  // T字區
  t_zone: [
    { landmarkIndex: 1, weight: 1.0 },   // 鼻子尖
    { landmarkIndex: 2, weight: 0.8 },   // 鼻子
    { landmarkIndex: 168, weight: 0.6 }  // 下巴
  ],

  // 眼睛區域
  eye_left: [
    { landmarkIndex: 226, weight: 1.0 }, // 左眼中心
    { landmarkIndex: 113, weight: 0.8 },
    { landmarkIndex: 225, weight: 0.8 }
  ],

  eye_right: [
    { landmarkIndex: 446, weight: 1.0 }, // 右眼中心
    { landmarkIndex: 342, weight: 0.8 },
    { landmarkIndex: 445, weight: 0.8 }
  ],

  // 嘴巴區域
  mouth: [
    { landmarkIndex: 0, weight: 1.0 },   // 上唇中心
    { landmarkIndex: 17, weight: 0.8 },  // 下唇中心
    { landmarkIndex: 291, weight: 0.7 }
  ]
}

// 將 2D 檢測結果映射到 3D 模型坐標
const get3DPosition = (issue) => {
  if (!props.faceLandmarks || !props.faceLandmarks.keypoints) {
    // 如果沒有臉部關鍵點數據，使用預設映射
    return getDefault3DPosition(issue)
  }

  const keypoints = props.faceLandmarks.keypoints
  const regionMapping = FACE_LANDMARK_MAPPING[issue.region]

  if (!regionMapping) {
    return getDefault3DPosition(issue)
  }

  // 計算加權平均坐標
  let totalX = 0, totalY = 0, totalZ = 0, totalWeight = 0

  regionMapping.forEach(({ landmarkIndex, weight }) => {
    const point = keypoints[landmarkIndex]
    if (point) {
      totalX += point.x * weight
      totalY += point.y * weight
      totalZ += (point.z || 0) * weight
      totalWeight += weight
    }
  })

  if (totalWeight === 0) {
    return getDefault3DPosition(issue)
  }

  // 將 2D 坐標轉換為 3D 坐標系統
  // 假設視頻畫面寬度 640，高度 480
  const videoWidth = 640
  const videoHeight = 480

  const x = (totalX / totalWeight - videoWidth / 2) / (videoWidth / 2) * 2
  const y = -(totalY / totalWeight - videoHeight / 2) / (videoHeight / 2) * 2
  const z = 1.5 + (issue.severity || 0) * 0.1 // 根據嚴重程度調整 Z 坐標

  return [x, y, z]
}

// 獲取預設 3D 坐標（當沒有臉部關鍵點時使用）
const getDefault3DPosition = (issue) => {
  const defaultPositions = {
    forehead: [0, 1.2, 1.8],
    cheek_left: [-0.8, 0.2, 1.6],
    cheek_right: [0.8, 0.2, 1.6],
    t_zone: [0, 0.5, 1.7],
    eye_left: [-0.4, 0.8, 1.5],
    eye_right: [0.4, 0.8, 1.5],
    mouth: [0, -0.3, 1.6],
    face: [0, 0.3, 1.7]
  }

  const position = defaultPositions[issue.region] || [0, 0, 1.5]

  // 添加隨機偏移以避免標記重疊
  const offset = (Math.random() - 0.5) * 0.2
  return [
    position[0] + offset,
    position[1] + offset,
    position[2] + (issue.severity || 0) * 0.05
  ]
}

// 重置視角
const resetView = () => {
  if (canvasRef.value && canvasRef.value.camera) {
    canvasRef.value.camera.position.set(0, 0, 5)
    canvasRef.value.camera.lookAt(0, 0, 0)
  }
}

// 切換統計顯示
const toggleStats = () => {
  showStats.value = !showStats.value
}

// 添加動畫標記
function addAnimatedMarker(issue) {
  const marker = {
    id: `marker-${Date.now()}-${Math.random()}`,
    position: get3DPosition(issue),
    type: issue.type,
    radius: 0.1,
    opacity: 0.8,
    animation: {
      phase: 0,
      speed: 0.05
    }
  }

  animatedMarkers.value.push(marker)

  // 啟動動畫
  animateMarker(marker)
}

// 移除動畫標記
function removeAnimatedMarker(markerId) {
  const index = animatedMarkers.value.findIndex(m => m.id === markerId)
  if (index > -1) {
    const marker = animatedMarkers.value[index]

    // 停止動畫
    if (marker.animation.frameId) {
      cancelAnimationFrame(marker.animation.frameId)
    }

    animatedMarkers.value.splice(index, 1)
  }
}

// 動畫標記
function animateMarker(marker) {
  const animate = () => {
    marker.animation.phase += marker.animation.speed

    // 脈動效果
    marker.radius = 0.1 + Math.sin(marker.animation.phase) * 0.05
    marker.opacity = 0.3 + Math.sin(marker.animation.phase) * 0.3

    marker.animation.frameId = requestAnimationFrame(animate)
  }

  animate()
}

// 清空所有動畫標記
function clearAnimatedMarkers() {
  animatedMarkers.value.forEach(marker => {
    if (marker.animation.frameId) {
      cancelAnimationFrame(marker.animation.frameId)
    }
  })
  animatedMarkers.value = []
}

// 根據問題數據更新動畫標記
function updateAnimatedMarkers(issues) {
  // 清空現有動畫標記
  clearAnimatedMarkers()

  // 為新的問題添加動畫標記
  issues.forEach(issue => {
    if (issue.severity >= 3) { // 只為嚴重問題添加動畫
      addAnimatedMarker(issue)
    }
  })
}

// 監聽問題數據變化
watch(() => props.issues, (newIssues) => {
  try {
    console.log('收到新的問題數據:', Array.isArray(newIssues) ? newIssues.length : 0, '個問題')
    updateAnimatedMarkers(Array.isArray(newIssues) ? newIssues : [])
  } catch (e) {
    console.warn('更新動畫標記發生錯誤:', e)
  }
}, { deep: true, immediate: true })

// 獲取標記顏色
const getMarkerColor = (type) => {
  const colors = {
    acne: '#ff4444',
    blackhead: '#444444',
    spot: '#ffaa00',
    large_pores: '#aa44ff',
    wrinkle: '#4444ff'
  }
  return colors[type] || '#ffffff'
}

// 獲取環形幾何體
const getRingGeometry = (marker) => {
  return new THREE.RingGeometry(marker.radius * 0.8, marker.radius, 16)
}

// 獲取環形材質
const getRingMaterial = (marker) => {
  return new THREE.MeshBasicMaterial({
    color: getMarkerColor(marker.type),
    transparent: true,
    opacity: marker.opacity
  })
}

// 模型載入完成處理
const onModelLoad = (gltf) => {
  modelLoaded.value = true
  console.log('3D 模型載入完成:', gltf)

  // 設置模型材質屬性
  if (gltf.scene) {
    gltf.scene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true
        child.receiveShadow = true

        // 優化材質
        if (child.material) {
          child.material.needsUpdate = true
        }
      }
    })
  }
}

// 模型載入錯誤處理
const onModelError = (error) => {
  console.error('3D 模型載入失敗:', error)
  modelLoaded.value = false
}

// 組件掛載
onMounted(() => {
  console.log('FaceModel 組件已掛載')
})

// 組件卸載
onUnmounted(() => {
  // 清理所有動畫標記
  clearAnimatedMarkers()

  // 清理模型資源
  if (modelRef.value && modelRef.value.scene) {
    modelRef.value.scene.traverse((child) => {
      if (child.isMesh) {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(material => material.dispose())
          } else {
            child.material.dispose()
          }
        }
      }
    })
  }
})
</script>

<style scoped>
/* 自定義 3D 場景樣式 */
.tres-canvas {
  width: 100%;
  height: 100%;
}

/* 載入動畫 */
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>
