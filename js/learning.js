// EAIM Muni Story Village - Learning Story module
// Keeps learning-topic logic separate from the main story genre/style.

const learningGuides = {
  general: {
    label: '🌈 자유 동화',
    prompt: ''
  },
  science: {
    label: '🔬 과학 배움동화',
    prompt: `이 이야기는 '과학 배움동화'야.
- 과학 개념은 어린이가 이해하기 쉬운 말로 정확하게 표현해줘.
- 설명문처럼 가르치지 말고, 등장인물이 사건을 해결하거나 관찰하고 발견하는 과정 속에 과학 개념이 자연스럽게 드러나게 해줘.
- 사실과 다른 과학 정보를 만들어내지 마.
- 관찰, 궁금증, 예상, 발견의 흐름을 살려줘.`
  },
  math: {
    label: '🔢 수학 배움동화',
    prompt: `이 이야기는 '수학 배움동화'야.
- 수학 문제집처럼 만들지 말고 이야기 속 사건을 해결하는 과정에 수학적 생각이 자연스럽게 필요하도록 해줘.
- 수, 규칙, 모양, 비교, 측정, 공간, 분류, 간단한 논리 중 주제에 맞는 요소를 사용해줘.
- 계산을 강요하기보다 발견하고 추리하고 비교하는 재미를 살려줘.
- 어린이가 이해할 수 있는 정확하고 간단한 표현을 사용해줘.`
  },
  music: {
    label: '🎵 음악 배움동화',
    prompt: `이 이야기는 '음악 배움동화'야.
- 음악 지식을 설명문처럼 나열하지 말고 이야기와 소리의 경험 속에서 자연스럽게 만나게 해줘.
- 리듬, 빠르기, 높낮이, 셈여림, 음색, 선율, 악기 중 주제에 맞는 음악 요소를 활용해줘.
- 등장인물이 듣고, 느끼고, 비교하고, 표현하는 장면을 넣어줘.
- 음악 용어는 어린이가 이해하기 쉬운 말과 함께 사용해줘.`
  }
};

function getLearningSelection() {
  const modeEl = document.getElementById('learningMode');
  const topicEl = document.getElementById('learningTopic');
  const mode = modeEl ? modeEl.value : 'general';
  const topic = (topicEl ? topicEl.value : '').trim();
  return { mode, topic, guide: learningGuides[mode] || learningGuides.general };
}

function handleLearningModeChange() {
  const { mode } = getLearningSelection();
  const topicEl = document.getElementById('learningTopic');
  const hintEl = document.getElementById('learningHint');
  const examples = {
    general: '예: 우정, 용기, 가족, 자연처럼 자유롭게 이야기해요.',
    science: '예: 씨앗은 어떻게 자랄까? · 그림자는 왜 생길까? · 달은 왜 모양이 달라질까?',
    math: '예: 반복되는 무늬 찾기 · 더 길고 짧은 것 비교하기 · 모양으로 길 찾기',
    music: '예: 빠르고 느린 음악 · 악기 음색 찾기 · 리듬으로 친구와 대화하기'
  };
  if (topicEl) {
    topicEl.placeholder = mode === 'general'
      ? '선택사항: 이야기에서 특별히 다루고 싶은 주제'
      : '예: ' + (mode === 'science' ? '식물의 성장' : mode === 'math' ? '규칙 찾기' : '악기 음색');
  }
  if (hintEl) hintEl.textContent = examples[mode] || examples.general;
}

function buildLearningPromptBlock() {
  const { mode, topic, guide } = getLearningSelection();
  if (mode === 'general') return '';
  return `\n[배움동화 설정]\n- 배움 장르: ${guide.label}\n- 배움 주제: ${topic || '장르에 맞는 어린이 수준의 흥미로운 주제를 자연스럽게 선택'}\n${guide.prompt}\n- 가장 중요한 원칙: 재미있는 동화가 먼저이고, 배움은 이야기 속 사건과 발견에 자연스럽게 스며들어야 해.\n`;
}

function learningModeLabel(mode) {
  return (learningGuides[mode] || learningGuides.general).label;
}
