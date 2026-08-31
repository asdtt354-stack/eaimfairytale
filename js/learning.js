// EAIM Muni Story Village - Learning Story module
// Story purpose and learning-topic logic are kept separate from the main genre/style.

const learningGuides = {
  general: {
    label: '🌈 이야기동화',
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

let currentStoryPurpose = 'story';
let lastLearningMode = 'science';

function getStoryPurpose() {
  return currentStoryPurpose;
}

function setStoryPurpose(purpose, options = {}) {
  currentStoryPurpose = purpose === 'learning' ? 'learning' : 'story';

  const storyBtn = document.getElementById('storyPurposeStoryBtn');
  const learningBtn = document.getElementById('storyPurposeLearningBtn');
  const storyTopicBox = document.getElementById('storyTopicBox');
  const learningBox = document.getElementById('learningBox');
  const learningEl = document.getElementById('learningMode');

  if (storyBtn) storyBtn.classList.toggle('active', currentStoryPurpose === 'story');
  if (learningBtn) learningBtn.classList.toggle('active', currentStoryPurpose === 'learning');
  if (storyTopicBox) storyTopicBox.hidden = currentStoryPurpose !== 'story';
  if (learningBox) learningBox.hidden = currentStoryPurpose !== 'learning';

  if (currentStoryPurpose === 'learning') {
    if (learningEl) {
      const validModes = ['science', 'math', 'music'];
      if (!validModes.includes(learningEl.value)) learningEl.value = lastLearningMode;
      lastLearningMode = learningEl.value;
    }
    handleLearningModeChange();
  }

  if (!options.silent) {
    const topicEl = document.getElementById('learningTopic');
    if (currentStoryPurpose === 'story' && topicEl) topicEl.blur();
  }
}

function getLearningSelection() {
  const purpose = getStoryPurpose();
  const modeEl = document.getElementById('learningMode');
  const topicEl = document.getElementById('learningTopic');

  if (purpose !== 'learning') {
    return { purpose: 'story', mode: 'general', topic: '', guide: learningGuides.general };
  }

  const mode = modeEl && ['science', 'math', 'music'].includes(modeEl.value) ? modeEl.value : 'science';
  const topic = (topicEl ? topicEl.value : '').trim();
  lastLearningMode = mode;
  return { purpose: 'learning', mode, topic, guide: learningGuides[mode] || learningGuides.science };
}

function handleLearningModeChange() {
  const modeEl = document.getElementById('learningMode');
  const mode = modeEl && ['science', 'math', 'music'].includes(modeEl.value) ? modeEl.value : 'science';
  lastLearningMode = mode;

  const topicEl = document.getElementById('learningTopic');
  const hintEl = document.getElementById('learningHint');
  const examples = {
    science: '예: 씨앗은 어떻게 자랄까? · 그림자는 왜 생길까? · 달은 왜 모양이 달라질까?',
    math: '예: 반복되는 무늬 찾기 · 더 길고 짧은 것 비교하기 · 모양으로 길 찾기',
    music: '예: 빠르고 느린 음악 · 악기 음색 찾기 · 리듬으로 친구와 대화하기'
  };
  const placeholders = {
    science: '예: 식물의 성장',
    math: '예: 규칙 찾기',
    music: '예: 악기 음색'
  };

  if (topicEl) topicEl.placeholder = placeholders[mode] || placeholders.science;
  if (hintEl) hintEl.textContent = examples[mode] || examples.science;
}

function buildLearningPromptBlock() {
  const { purpose, mode, topic, guide } = getLearningSelection();
  if (purpose !== 'learning' || mode === 'general') return '';
  return `\n[배움동화 설정]\n- 배움 영역: ${guide.label}\n- 배움 내용: ${topic || '선택한 배움 영역에 맞는 어린이 수준의 흥미로운 내용을 자연스럽게 선택'}\n${guide.prompt}\n- 가장 중요한 원칙: 재미있는 동화가 먼저이고, 배움은 이야기 속 사건과 발견에 자연스럽게 스며들어야 해.\n`;
}

function learningModeLabel(mode) {
  return (learningGuides[mode] || learningGuides.general).label;
}

function storyPurposeLabel(purpose, mode) {
  const resolvedPurpose = purpose || (mode && mode !== 'general' ? 'learning' : 'story');
  return resolvedPurpose === 'learning' ? learningModeLabel(mode || 'science') : '🌈 이야기동화';
}

document.addEventListener('DOMContentLoaded', () => {
  setStoryPurpose('story', { silent: true });
  handleLearningModeChange();
});
