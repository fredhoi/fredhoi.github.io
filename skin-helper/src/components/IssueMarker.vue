<template>
  <TresGroup :position="position">
    <!-- 主標記球體 -->
    <TresMesh :geometry="sphereGeometry" :material="markerMaterial" />

    <!-- 外圍光暈效果 -->
    <TresMesh :geometry="haloGeometry" :material="haloMaterial" />

    <!-- 脈動動畫球體 -->
    <TresMesh v-if="animated" :geometry="pulseGeometry" :material="pulseMaterial" />

    <!-- 問題類型圖標提示 -->
    <TresMesh v-if="showLabel" :position="[0, radius + 0.3, 0]">
      <TresSprite :texture="labelTexture" />
    </TresMesh>

    <!-- 嚴重程度指示器 -->
    <SeverityIndicator
      v-if="showSeverity"
      :severity="severity"
      :position="[0, -radius - 0.2, 0]"
    />
  </TresGroup>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

// 組件屬性
const props = defineProps({
  position: {
    type: Array,
    required: true,
    default: () => [0, 0, 0]
  },
  type: {
    type: String,
    required: true
  },
  severity: {
    type: Number,
    default: 1,
    validator: (value) => value >= 1 && value <= 5
  },
  name: {
    type: String,
    default: ''
  },
  animated: {
    type: Boolean,
    default: true
  },
  showLabel: {
    type: Boolean,
    default: true
  },
  showSeverity: {
    type: Boolean,
    default: true
  }
})

// 響應式數據
const pulseRadius = ref(0.05)
const pulseOpacity = ref(0.8)
const animationFrame = ref(null)

// 幾何體
const sphereGeometry = computed(() => new THREE.SphereGeometry(radius.value, 16, 16))
const haloGeometry = computed(() => new THREE.SphereGeometry(radius.value * 1.5, 16, 16))
const pulseGeometry = computed(() => new THREE.SphereGeometry(pulseRadius.value, 16, 16))

// 問題類型顏色映射
const ISSUE_COLORS = {
  acne: '#ff4444',        // 紅色 - 痤瘡
  blackhead: '#444444',   // 深灰 - 黑頭
  spot: '#ffaa00',        // 橙色 - 色斑
  large_pores: '#aa44ff', // 紫色 - 毛孔
  wrinkle: '#4444ff'      // 藍色 - 皺紋
}

// 計算屬性
const markerColor = computed(() => ISSUE_COLORS[props.type] || '#ffffff')

const emissiveColor = computed(() => {
  const color = new THREE.Color(markerColor.value)
  return color.multiplyScalar(0.3)
})

const radius = computed(() => {
  // 根據嚴重程度調整標記大小
  return 0.05 + (props.severity - 1) * 0.02
})

// 材質
const markerMaterial = computed(() => {
  return new THREE.MeshStandardMaterial({
    color: markerColor.value,
    emissive: emissiveColor.value,
    emissiveIntensity: 0.2,
    transparent: true,
    opacity: 0.8
  })
})

const haloMaterial = computed(() => {
  return new THREE.MeshBasicMaterial({
    color: markerColor.value,
    transparent: true,
    opacity: 0.2
  })
})

const pulseMaterial = computed(() => {
  return new THREE.MeshBasicMaterial({
    color: markerColor.value,
    transparent: true,
    opacity: pulseOpacity.value
  })
})

const labelTexture = computed(() => {
  // 創建文字紋理
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 128
  canvas.height = 64

  // 設置背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 繪製文字
  ctx.fillStyle = 'white'
  ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(props.name, canvas.width / 2, canvas.height / 2 + 5)

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter

  return texture
})

// 脈動動畫
const animatePulse = () => {
  let time = 0
  const animate = () => {
    time += 0.05

    // 脈動效果
    pulseRadius.value = radius.value * (1 + Math.sin(time) * 0.3)
    pulseOpacity.value = 0.3 + Math.sin(time) * 0.2

    animationFrame.value = requestAnimationFrame(animate)
  }

  if (props.animated) {
    animate()
  }
}

// 組件掛載
onMounted(() => {
  animatePulse()
})

// 組件卸載
onUnmounted(() => {
  if (animationFrame.value) {
    cancelAnimationFrame(animationFrame.value)
  }

  // 清理紋理
  if (labelTexture.value) {
    labelTexture.value.dispose()
  }
})
</script>
