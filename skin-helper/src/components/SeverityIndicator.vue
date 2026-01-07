<template>
  <TresGroup :position="position">
    <!-- 嚴重程度條 -->
    <TresGroup v-for="i in 5" :key="i" :position="[(i - 3) * 0.08, 0, 0]">
      <TresMesh
        :geometry="boxGeometry"
        :material="i <= severity ? activeMaterial : inactiveMaterial"
      />
    </TresGroup>

    <!-- 數值顯示 -->
    <TresMesh v-if="showValue" :position="[0, -0.08, 0]" :scale="[0.5, 0.25, 1]">
      <TresSprite :texture="valueTexture" />
    </TresMesh>
  </TresGroup>
</template>

<script setup>
import { computed } from 'vue'
import * as THREE from 'three'

// 組件屬性
const props = defineProps({
  severity: {
    type: Number,
    required: true,
    validator: (value) => value >= 1 && value <= 5
  },
  position: {
    type: Array,
    default: () => [0, 0, 0]
  },
  showValue: {
    type: Boolean,
    default: false
  }
})

// 響應式數據
const boxGeometry = new THREE.BoxGeometry(0.05, 0.01, 0.01)

// 計算屬性
const activeColor = computed(() => {
  // 根據嚴重程度選擇顏色
  const colors = ['#00ff00', '#ffff00', '#ffaa00', '#ff6600', '#ff0000']
  return colors[props.severity - 1] || '#ffffff'
})

const inactiveColor = computed(() => '#666666')

const activeMaterial = computed(() => {
  const color = new THREE.Color(activeColor.value)
  const emissive = color.clone().multiplyScalar(0.2)
  return new THREE.MeshStandardMaterial({
    color: color,
    emissive: emissive,
    emissiveIntensity: 0.1
  })
})

const inactiveMaterial = computed(() => {
  return new THREE.MeshStandardMaterial({
    color: inactiveColor.value
  })
})

const valueTexture = computed(() => {
  // 創建數值紋理
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  canvas.width = 64
  canvas.height = 32

  // 設置背景
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 繪製數值
  ctx.fillStyle = 'white'
  ctx.font = 'bold 16px Arial'
  ctx.textAlign = 'center'
  ctx.fillText(props.severity.toString(), canvas.width / 2, canvas.height / 2 + 5)

  const texture = new THREE.CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = THREE.LinearFilter

  return texture
})
</script>
