// EAIM Muni Story Village - Learning Story module
// Story purpose and learning-topic logic are kept separate from the main genre/style.

const learningGuides = {
  general: { label: '🌈 이야기동화', prompt: '' },
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

const learningTopicOptions = {
  science: [
    '식물의 성장', '동물의 특징', '날씨와 계절', '물의 변화',
    '태양계와 행성', '우리 몸', '소리와 빛', '직접 입력'
  ],
  math: [
    '수와 계산', '도형과 모양', '규칙 찾기', '길이와 크기',
    '시간', '분류와 비교', '위치와 방향', '직접 입력'
  ],
  music: [
    '빠르기', '리듬', '높고 낮은 소리', '악기와 음색',
    '셈여림', '선율', '음악의 느낌', '직접 입력'
  ]
};

let currentStoryPurpose = 'story';
let lastLearningMode = 'science';

function getStoryPurpose() { return currentStoryPurpose; }

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
    handleLearningModeChange({ preserveTopic: true });
  }

  if (!options.silent) {
    const topicEl = document.getElementById('learningTopic');
    if (currentStoryPurpose === 'story' && topicEl) topicEl.blur?.();
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

function handleLearningModeChange(options = {}) {
  const modeEl = document.getElementById('learningMode');
  const mode = modeEl && ['science', 'math', 'music'].includes(modeEl.value) ? modeEl.value : 'science';
  lastLearningMode = mode;

  const topicEl = document.getElementById('learningTopic');
  const currentTopic = options.preserveTopic && topicEl ? topicEl.value.trim() : '';
  renderLearningTopicChips(mode, currentTopic);

  const hintEl = document.getElementById('learningHint');
  const hints = {
    science: '과학 주제 중에서 하나를 골라보세요. 직접 입력도 가능해요.',
    math: '수학 주제 중에서 하나를 골라보세요. 직접 입력도 가능해요.',
    music: '음악 주제 중에서 하나를 골라보세요. 직접 입력도 가능해요.'
  };
  if (hintEl) hintEl.textContent = hints[mode] || hints.science;
}

function renderLearningTopicChips(mode, preferredTopic = '') {
  const wrap = document.getElementById('learningTopicChips');
  const topicEl = document.getElementById('learningTopic');
  const customRow = document.getElementById('learningCustomRow');
  const customInput = document.getElementById('learningCustomTopic');
  if (!wrap || !topicEl) return;

  const options = learningTopicOptions[mode] || learningTopicOptions.science;
  wrap.innerHTML = '';

  const isPreset = preferredTopic && options.includes(preferredTopic) && preferredTopic !== '직접 입력';
  const isCustom = preferredTopic && !isPreset;

  options.forEach(topic => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'learning-topic-chip';
    btn.textContent = topic === '직접 입력' ? '✏️ 직접 입력' : topic;
    if ((isPreset && topic === preferredTopic) || (isCustom && topic === '직접 입력')) btn.classList.add('active');
    btn.addEventListener('click', () => selectLearningTopic(topic));
    wrap.appendChild(btn);
  });

  if (isPreset) {
    topicEl.value = preferredTopic;
    customRow?.classList.remove('show');
    if (customInput) customInput.value = '';
  } else if (isCustom) {
    topicEl.value = preferredTopic;
    customRow?.classList.add('show');
    if (customInput) customInput.value = preferredTopic;
  } else {
    topicEl.value = '';
    customRow?.classList.remove('show');
    if (customInput) customInput.value = '';
  }
  updateLearningSelectedNote();
}

function selectLearningTopic(topic) {
  const topicEl = document.getElementById('learningTopic');
  const customRow = document.getElementById('learningCustomRow');
  const customInput = document.getElementById('learningCustomTopic');
  const chips = document.querySelectorAll('.learning-topic-chip');

  chips.forEach(chip => chip.classList.remove('active'));
  const targetLabel = topic === '직접 입력' ? '✏️ 직접 입력' : topic;
  Array.from(chips).find(chip => chip.textContent === targetLabel)?.classList.add('active');

  if (topic === '직접 입력') {
    customRow?.classList.add('show');
    if (topicEl) topicEl.value = (customInput?.value || '').trim();
    setTimeout(() => customInput?.focus(), 0);
  } else {
    customRow?.classList.remove('show');
    if (customInput) customInput.value = '';
    if (topicEl) topicEl.value = topic;
  }
  updateLearningSelectedNote();
}

function handleCustomLearningTopicInput(value) {
  const topicEl = document.getElementById('learningTopic');
  if (topicEl) topicEl.value = value.trimStart();
  updateLearningSelectedNote();
}

function updateLearningSelectedNote() {
  const note = document.getElementById('learningSelectedNote');
  const topic = (document.getElementById('learningTopic')?.value || '').trim();
  if (note) note.textContent = topic ? `선택한 배움: ${topic}` : '추천 주제를 하나 골라주세요.';
}

function setLearningTopicFromSaved(topic, mode) {
  const learningEl = document.getElementById('learningMode');
  if (learningEl && ['science','math','music'].includes(mode)) learningEl.value = mode;
  handleLearningModeChange();
  renderLearningTopicChips(mode || 'science', (topic || '').trim());
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
