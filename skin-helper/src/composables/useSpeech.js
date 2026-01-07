import { ref, computed, watch, readonly } from 'vue'

// 皮膚問題知識庫
const SKIN_KNOWLEDGE = {
  acne: {
    name: '痤瘡',
    causes: ['荷爾蒙變化', '皮脂腺過度活躍', '毛孔堵塞', '細菌感染'],
    suggestions: [
      '保持臉部清潔，每天早晚洗臉',
      '使用含水楊酸或苯甲酸的產品',
      '避免用手擠壓痤瘡',
      '保持規律作息和健康飲食',
      '定期更換枕套和毛巾'
    ],
    severity: {
      1: '輕微痤瘡，通過日常護理即可改善',
      2: '中度痤瘡，建議使用專門的抗痤瘡產品',
      3: '嚴重痤瘡，建議諮詢皮膚科醫生',
      4: '重度痤瘡，需要專業醫療治療',
      5: '極為嚴重的痤瘡，必須立即就醫'
    }
  },

  blackhead: {
    name: '黑頭',
    causes: ['毛孔堵塞', '過度分泌皮脂', '角質堆積', '環境污染'],
    suggestions: [
      '使用溫和的去角質產品',
      '定期使用面膜清潔毛孔',
      '保持臉部補水平衡',
      '避免使用油性護膚品',
      '定期清潔毛孔'
    ],
    severity: {
      1: '輕微黑頭，可通過日常清潔改善',
      2: '中度黑頭，建議使用毛孔清潔產品',
      3: '嚴重黑頭，可能需要專業清潔',
      4: '重度黑頭，建議諮詢美容師',
      5: '極為嚴重的黑頭，需要醫療干預'
    }
  },

  spot: {
    name: '色斑',
    causes: ['紫外線傷害', '荷爾蒙變化', '老化', '炎症後色素沉澱'],
    suggestions: [
      '每天使用防曬霜，SPF 30+',
      '使用含維生素C的美白產品',
      '避免日曬，特別是中午時段',
      '保持規律作息',
      '使用溫和的去角質產品'
    ],
    severity: {
      1: '輕微色斑，通過防曬和保養即可改善',
      2: '中度色斑，建議使用美白產品',
      3: '嚴重色斑，可能需要專業治療',
      4: '重度色斑，建議諮詢皮膚科醫生',
      5: '極為嚴重的色斑，需要醫療治療'
    }
  },

  large_pores: {
    name: '毛孔粗大',
    causes: ['遺傳因素', '老化', '皮脂分泌過多', '紫外線傷害'],
    suggestions: [
      '使用收斂毛孔的產品',
      '保持臉部補水',
      '定期去角質',
      '使用溫和的清潔產品',
      '避免過度清潔'
    ],
    severity: {
      1: '輕微毛孔粗大，通過保養改善',
      2: '中度毛孔粗大，建議使用專門產品',
      3: '嚴重毛孔粗大，可能需要專業護理',
      4: '重度毛孔粗大，建議諮詢美容師',
      5: '極為嚴重的毛孔粗大，需要專業治療'
    }
  },

  wrinkle: {
    name: '皺紋',
    causes: ['自然老化', '紫外線傷害', '表情習慣', '水分流失'],
    suggestions: [
      '使用含玻尿酸的保濕產品',
      '每天使用防曬霜',
      '保持健康的生活習慣',
      '使用抗氧化產品',
      '定期按摩臉部肌肉'
    ],
    severity: {
      1: '輕微皺紋，通過保養即可改善',
      2: '中度皺紋，建議使用抗皺產品',
      3: '嚴重皺紋，可能需要醫美治療',
      4: '重度皺紋，建議諮詢皮膚科醫生',
      5: '極為嚴重的皺紋，需要專業醫療治療'
    }
  }
}

// 語音識別關鍵字
const SPEECH_KEYWORDS = {
  greetings: ['你好', '您好', 'hello', 'hi', '嗨'],
  questions: ['什麼', '如何', '怎麼', '為什麼', '原因', '建議', '治療', '改善', '解決'],
  issues: ['痤瘡', '黑頭', '色斑', '毛孔', '皺紋', '問題', '狀況'],
  help: ['幫助', '說明', '使用', '功能', '怎麼用']
}

export function useSpeech(detectionResults = null) {
  // 響應式狀態
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const transcript = ref('')
  const lastResult = ref('')
  const error = ref('')
  const conversationHistory = ref([])

  // Web Speech API 實例
  let recognition = null
  let speechSynthesis = null
  let speechUtterance = null

  // 計算屬性
  const canListen = computed(() => {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  })

  const canSpeak = computed(() => {
    return 'speechSynthesis' in window
  })

  // 初始化語音識別
  const initRecognition = () => {
    if (!canListen.value) {
      error.value = '您的瀏覽器不支持語音識別功能'
      return false
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognition = new SpeechRecognition()

    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'zh-TW' // 設定為中文

    recognition.onstart = () => {
      isListening.value = true
      error.value = ''
      console.log('語音識別已開始')
    }

    recognition.onresult = (event) => {
      const result = event.results[0][0].transcript
      transcript.value = result
      lastResult.value = result
      console.log('識別結果:', result)

      // 處理識別結果
      processSpeechResult(result)
    }

    recognition.onerror = (event) => {
      error.value = `語音識別錯誤: ${event.error}`
      isListening.value = false
      console.error('語音識別錯誤:', event.error)
    }

    recognition.onend = () => {
      isListening.value = false
      console.log('語音識別已結束')
    }

    return true
  }

  // 初始化語音合成
  const initSpeechSynthesis = () => {
    if (!canSpeak.value) {
      error.value = '您的瀏覽器不支持語音合成功能'
      return false
    }

    speechSynthesis = window.speechSynthesis
    return true
  }

  // 開始語音識別
  const startListening = () => {
    if (!recognition && !initRecognition()) {
      return
    }

    if (isListening.value) {
      stopListening()
      return
    }

    try {
      recognition.start()
    } catch (err) {
      error.value = '無法啟動語音識別'
      console.error('啟動語音識別失敗:', err)
    }
  }

  // 停止語音識別
  const stopListening = () => {
    if (recognition && isListening.value) {
      recognition.stop()
    }
  }

  // 語音合成說話
  const speak = (text, options = {}) => {
    if (!speechSynthesis) {
      initSpeechSynthesis()
    }

    if (!canSpeak.value) {
      console.warn('語音合成不可用')
      return
    }

    // 停止當前語音
    if (isSpeaking.value) {
      speechSynthesis.cancel()
    }

    speechUtterance = new SpeechSynthesisUtterance(text)

    // 設定語音選項
    speechUtterance.lang = options.lang || 'zh-TW'
    speechUtterance.rate = options.rate || 1.0
    speechUtterance.pitch = options.pitch || 1.0
    speechUtterance.volume = options.volume || 0.8

    speechUtterance.onstart = () => {
      isSpeaking.value = true
      console.log('開始語音合成')
    }

    speechUtterance.onend = () => {
      isSpeaking.value = false
      console.log('語音合成結束')
    }

    speechUtterance.onerror = (event) => {
      isSpeaking.value = false
      error.value = `語音合成錯誤: ${event.error}`
      console.error('語音合成錯誤:', event.error)
    }

    speechSynthesis.speak(speechUtterance)
  }

  // 停止語音合成
  const stopSpeaking = () => {
    if (speechSynthesis && isSpeaking.value) {
      speechSynthesis.cancel()
      isSpeaking.value = false
    }
  }

  // 處理語音識別結果
  const processSpeechResult = (text) => {
    const lowerText = text.toLowerCase()

    // 分析語音內容
    const intent = analyzeIntent(text)
    const response = generateSmartResponse(intent, text)

    // 記錄對話歷史
    conversationHistory.value.push({
      user: text,
      intent: intent,
      response: response,
      timestamp: new Date()
    })

    // 限制歷史記錄長度
    if (conversationHistory.value.length > 10) {
      conversationHistory.value.shift()
    }

    // 語音回覆
    if (response) {
      speak(response)
    }
  }

  // 分析用戶意圖
  const analyzeIntent = (text) => {
    const lowerText = text.toLowerCase()

    // 檢查是否是問候
    if (SPEECH_KEYWORDS.greetings.some(word => lowerText.includes(word))) {
      return { type: 'greeting' }
    }

    // 檢查是否是問題
    if (SPEECH_KEYWORDS.questions.some(word => lowerText.includes(word))) {
      // 確定問題類型
      for (const issueType in SKIN_KNOWLEDGE) {
        if (SKIN_KNOWLEDGE[issueType].name && lowerText.includes(SKIN_KNOWLEDGE[issueType].name)) {
          return {
            type: 'question',
            issue: issueType,
            questionType: determineQuestionType(text)
          }
        }
      }
      return { type: 'general_question' }
    }

    // 檢查是否是幫助請求
    if (SPEECH_KEYWORDS.help.some(word => lowerText.includes(word))) {
      return { type: 'help' }
    }

    return { type: 'unknown' }
  }

  // 獲取問題統計信息
  const getIssueStatistics = (issues) => {
    const stats = {}
    issues.forEach(issue => {
      stats[issue.type] = (stats[issue.type] || 0) + 1
    })

    const mainIssues = Object.entries(stats)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => `${SKIN_KNOWLEDGE[type]?.name}(${count}處)`)
      .join('、')

    const summary = Object.entries(stats)
      .map(([type, count]) => `${SKIN_KNOWLEDGE[type]?.name}${count}處`)
      .join('、')

    return { mainIssues, summary, stats }
  }

  // 獲取用戶特定問題的嚴重程度
  const getUserIssueSeverity = (issueType, issues) => {
    const userIssues = issues.filter(issue => issue.type === issueType)
    if (userIssues.length === 0) return 1

    const avgSeverity = userIssues.reduce((sum, issue) => sum + issue.severity, 0) / userIssues.length
    return Math.round(avgSeverity)
  }

  // 獲取個性化建議
  const getPersonalizedSuggestions = (issue, severity) => {
    const baseSuggestions = [...issue.suggestions]

    // 根據嚴重程度調整建議
    if (severity >= 4) {
      baseSuggestions.unshift('建議盡快諮詢皮膚科醫生')
    } else if (severity >= 3) {
      baseSuggestions.unshift('建議使用專業護膚品')
    }

    return baseSuggestions.slice(0, 3)
  }

  // 確定問題類型
  const determineQuestionType = (text) => {
    const lowerText = text.toLowerCase()

    if (lowerText.includes('原因') || lowerText.includes('為什麼') || lowerText.includes('why')) {
      return 'cause'
    }
    if (lowerText.includes('如何') || lowerText.includes('怎麼') || lowerText.includes('建議') || lowerText.includes('how')) {
      return 'suggestion'
    }
    if (lowerText.includes('治療') || lowerText.includes('解決') || lowerText.includes('treatment')) {
      return 'treatment'
    }

    return 'general'
  }

  // 生成智能回覆內容（基於檢測結果）
  const generateSmartResponse = (intent, originalText) => {
    const currentIssues = detectionResults.value || []

    // 如果有檢測結果，提供個性化建議
    if (currentIssues.length > 0) {
      return generatePersonalizedResponse(intent, originalText, currentIssues)
    }

    // 否則使用通用回應
    return generateGeneralResponse(intent, originalText)
  }

  // 生成個性化回應
  const generatePersonalizedResponse = (intent, originalText, issues) => {
    const issueStats = getIssueStatistics(issues)

    switch (intent.type) {
      case 'greeting':
        return `您好！我在您的臉部檢測到${issues.length}個問題區域。主要問題包括${issueStats.mainIssues}。我可以為您提供詳細的護理建議。`

      case 'question':
        if (intent.issue && SKIN_KNOWLEDGE[intent.issue]) {
          const issue = SKIN_KNOWLEDGE[intent.issue]
          const userSeverity = getUserIssueSeverity(intent.issue, issues)

          switch (intent.questionType) {
            case 'cause':
              return `根據您的檢測結果，${issue.name}的主要原因是：${issue.causes.join('、')}。您當前的嚴重程度為${userSeverity}級。`

            case 'suggestion':
              const personalizedSuggestions = getPersonalizedSuggestions(issue, userSeverity)
              return `針對您的${issue.name}情況（${userSeverity}級嚴重），建議：${personalizedSuggestions.join('、')}。`

            case 'treatment':
              return `對於您的${issue.name}，建議先諮詢皮膚科醫生。日常護理可以從${issue.suggestions.slice(0, 2).join('、')}開始。`

            default:
              return `您的${issue.name}問題比較${userSeverity <= 2 ? '輕微' : '嚴重'}。建議關注${issue.suggestions[0]}。`
          }
        }
        return `我在您的臉部檢測到${issues.length}個問題。我可以解答關於痤瘡、黑頭、色斑、毛孔粗大和皺紋的問題。`

      case 'help':
        return `我可以幫您分析臉部皮膚問題，提供個性化護理建議。當前檢測到${issues.length}個問題區域：${issueStats.summary}。您可以問我具體問題的原因、改善方法等。`

      default:
        return `我已經分析了您的皮膚狀況，發現${issueStats.mainIssues}。有什麼特定的問題需要我為您解答嗎？`
    }
  }

  // 生成通用回應
  const generateGeneralResponse = (intent, originalText) => {
    switch (intent.type) {
      case 'greeting':
        return '您好！我是您的AI皮膚健康助手。我可以幫您分析臉部皮膚問題，並提供護理建議。請問您想要了解什麼？'

      case 'question':
        if (intent.issue && SKIN_KNOWLEDGE[intent.issue]) {
          const issue = SKIN_KNOWLEDGE[intent.issue]

          switch (intent.questionType) {
            case 'cause':
              return `${issue.name}的主要原因是：${issue.causes.join('、')}。`

            case 'suggestion':
              return `關於${issue.name}的改善建議：${issue.suggestions.slice(0, 3).join('、')}。`

            case 'treatment':
              return `針對${issue.name}，建議：${issue.suggestions.join('、')}。如果情況嚴重，請諮詢專業醫生。`

            default:
              return `關於${issue.name}，您可以通過保持良好護理習慣來改善。主要建議包括：${issue.suggestions.slice(0, 2).join('、')}。`
          }
        }
        return '我可以幫您解答關於痤瘡、黑頭、色斑、毛孔粗大和皺紋等方面的問題。請具體說明您的問題。'

      case 'help':
        return '我可以為您提供皮膚問題分析、護理建議和改善方法。您可以詢問具體問題，如「痤瘡怎麼辦」或「色斑的原因是什麼」。我會根據您的臉部分析結果給出針對性的建議。'

      case 'general_question':
        return '我可以幫您解答關於臉部皮膚健康的各種問題。請告訴我您想要了解哪方面的皮膚問題，我會給您詳細的解答和建議。'

      default:
        return '抱歉，我沒有聽清楚您的問題。請再說一次，或者告訴我您想要了解什麼皮膚問題。'
    }
  }

  // 獲取可用語音列表
  const getAvailableVoices = () => {
    if (!speechSynthesis) return []

    return speechSynthesis.getVoices().filter(voice =>
      voice.lang.startsWith('zh') || voice.lang.startsWith('en')
    )
  }

  // 設定特定語音
  const setVoice = (voiceURI) => {
    if (speechUtterance) {
      const voices = getAvailableVoices()
      const voice = voices.find(v => v.voiceURI === voiceURI)
      if (voice) {
        speechUtterance.voice = voice
      }
    }
  }

  // 初始化
  const init = () => {
    try {
      console.log('初始化語音識別...')
      initRecognition()
      console.log('初始化語音合成...')
      initSpeechSynthesis()
      console.log('語音功能初始化完成')
    } catch (error) {
      console.error('語音初始化失敗:', error)
      error.value = `語音初始化失敗: ${error.message}`
    }
  }

  // 清理資源
  const cleanup = () => {
    stopListening()
    stopSpeaking()
  }

  return {
    // 狀態
    isListening: readonly(isListening),
    isSpeaking: readonly(isSpeaking),
    transcript: readonly(transcript),
    lastResult: readonly(lastResult),
    error: readonly(error),
    conversationHistory: readonly(conversationHistory),
    canListen,
    canSpeak,

    // 方法
    init,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    getAvailableVoices,
    setVoice,
    cleanup,

    // 新增方法
    getIssueStatistics,
    getPersonalizedSuggestions
  }
}
