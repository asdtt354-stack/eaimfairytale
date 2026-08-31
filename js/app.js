function pickGenre(value){
  const sel=document.getElementById('storyGenre');
  if(sel){ sel.value=value; handleGenreChange(value); }
}

let currentStoryBookObject = null;
  let db = null;
  let isPlaying = false;
  let isRepeatMode = false;
  let isLibraryPlayingMode = false;
  let myLibraryBooks = [];
  let currentLibraryIndex = 0;
  let currentPageIndex = 0;

  let childPhotoBase64 = null;
  let childPhotoMime = "image/jpeg";

  // 🎵 --- BGM 오디오 엔진 ---
  let bgmAudio = new Audio();
  bgmAudio.loop = true;
  bgmAudio.preload = 'auto';
  bgmAudio.playsInline = true;
  let isBgmEnabled = true;
  let targetBgmVolume = 0.42;

  const bgmPlaylist = {
    "fantasy": { name: "Moonlit Forest Path", url: "./assets/bgm/moonlit-forest-path.mp3" },
    "heroic": { name: "Little Brave Hero", url: "./assets/bgm/little-brave-hero.mp3" },
    "mystery": { name: "The Secret in the Box", url: "./assets/bgm/the-secret-in-the-box.mp3" },
    "scifi": { name: "Starry Night Journey", url: "./assets/bgm/starry-night-journey.mp3" },
    "animal": { name: "Sunny Bunny Trail", url: "./assets/bgm/sunny-bunny-trail.mp3" },
    "comic": { name: "Pudding Parade", url: "./assets/bgm/pudding-parade.mp3" },
    "bedtime": { name: "Moonlit Pillow Song", url: "./assets/bgm/moonlit-pillow-song.mp3" },
    "custom": { name: "Moonlit Forest Path", url: "./assets/bgm/moonlit-forest-path.mp3" }
  };

  function getCurrentBgmSelection() {
    const actingStyle = document.getElementById('actingStyle')?.value || 'dynamic_theater';
    if (actingStyle === 'bedtime_calm') {
      return { key: 'bedtime', data: bgmPlaylist.bedtime, volume: 0.34 };
    }

    const genreEl = document.getElementById('storyGenre');
    const genreKey =
      (currentStoryBookObject && currentStoryBookObject.genre) ||
      (genreEl ? genreEl.value : 'fantasy');

    return {
      key: genreKey,
      data: bgmPlaylist[genreKey] || bgmPlaylist.fantasy,
      volume: targetBgmVolume
    };
  }

  function handleActingStyleChange() {
    const selection = getCurrentBgmSelection();
    const textEl = document.getElementById('bgmTitleText');
    if (textEl) textEl.innerText = `배경음악: ${selection.data.name}`;

    const wasPlaying = bgmAudio && !bgmAudio.paused;
    if (bgmAudio.getAttribute('src') !== selection.data.url) {
      bgmAudio.src = selection.data.url;
      try { bgmAudio.load(); } catch (e) {}
    }
    bgmAudio.volume = selection.volume;

    if (wasPlaying && isBgmEnabled) {
      try {
        const p = bgmAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      } catch (e) {}
    }
  }

  function handleGenreChange(genreKey) {
    updateBgmGenrePreview(genreKey);
  }

  function updateBgmGenrePreview(genreKey) {
    const selection = getCurrentBgmSelection();
    const bgmData = selection.data;
    const textEl = document.getElementById('bgmTitleText');
    if (textEl) textEl.innerText = `배경음악: ${bgmData.name}`;
    bgmAudio.src = bgmData.url;
    bgmAudio.volume = selection.volume;
  }

  function playBgmForCurrentStory() {
    if (!isBgmEnabled || !bgmAudio) return Promise.resolve(false);

    const selection = getCurrentBgmSelection();
    const bgmData = selection.data;
    const textEl = document.getElementById('bgmTitleText');
    if (textEl) textEl.innerText = `배경음악: ${bgmData.name}`;

    // src 속성 기준으로 비교해 불필요한 재로딩을 줄입니다.
    if (bgmAudio.getAttribute('src') !== bgmData.url) {
      bgmAudio.src = bgmData.url;
      try { bgmAudio.load(); } catch (e) {}
    }

    bgmAudio.muted = false;
    bgmAudio.volume = selection.volume;

    try {
      const p = bgmAudio.play();
      if (p && typeof p.then === 'function') {
        return p.then(() => true).catch(e => {
          console.log("BGM 재생 대기:", e);
          return false;
        });
      }
      return Promise.resolve(true);
    } catch (e) {
      console.log("BGM 재생 오류:", e);
      return Promise.resolve(false);
    }
  }

  function stopBgm() {
    bgmAudio.pause();
    bgmAudio.currentTime = 0;
  }

  function toggleBgmSound() {
    isBgmEnabled = !isBgmEnabled;
    const topBtn = document.getElementById('bgmSwitchTopBtn');
    const bottomBtn = document.getElementById('bgmControlBtn');
    const icon = document.getElementById('bgmIcon');

    if (isBgmEnabled) {
      if (topBtn) { topBtn.className = "bgm-switch-btn"; topBtn.innerText = "🎵 BGM: ON"; }
      if (bottomBtn) { bottomBtn.className = "bgm-btn"; bottomBtn.innerText = "🎵 배경음악: ON"; }
      if (icon) icon.innerText = "🎵";
      if (isPlaying) playBgmForCurrentStory();
    } else {
      if (topBtn) { topBtn.className = "bgm-switch-btn off"; topBtn.innerText = "🔇 BGM: OFF"; }
      if (bottomBtn) { bottomBtn.className = "bgm-btn off"; bottomBtn.innerText = "🔇 배경음악: OFF"; }
      if (icon) icon.innerText = "🔇";
      bgmAudio.pause();
    }
  }

  function changeBgmVolume(val) {
    targetBgmVolume = parseFloat(val);
    bgmAudio.volume = targetBgmVolume;
  }

  // 💡 [모바일 음성 합성 엔진 안정화]
  // iOS Safari / Android Chrome에서 Web Speech API가 늦게 준비되거나
  // cancel 직후 무음 상태가 되는 문제를 줄이기 위한 상태값입니다.
  let availableVoices = [];
  let currentUtterance = null;
  let speechSessionId = 0;
  let speechWatchdog = null;
  let isSpeechPaused = false;
  let lastStoppedPageIndex = 0;
  let wasStoppedByUser = false;

  function initVoices() {
    if (typeof window.speechSynthesis === 'undefined') return;
    const voices = window.speechSynthesis.getVoices() || [];
    if (voices.length) availableVoices = voices;
    updateVoiceStatus();
  }

  if (typeof window.speechSynthesis !== 'undefined') {
    initVoices();
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = initVoices;
    }
    // 일부 모바일 브라우저는 첫 getVoices()가 빈 배열을 반환합니다.
    setTimeout(initVoices, 250);
    setTimeout(initVoices, 1000);
  }

  function clearSpeechWatchdog() {
    if (speechWatchdog) {
      clearInterval(speechWatchdog);
      speechWatchdog = null;
    }
  }

  function safeCancelSpeech() {
    if (typeof window.speechSynthesis === 'undefined') return;
    clearSpeechWatchdog();
    try {
      // pause 상태에서 cancel만 하면 iOS가 다음 speak를 무시하는 경우가 있어
      // 먼저 resume 한 뒤 cancel 합니다.
      window.speechSynthesis.resume();
      window.speechSynthesis.cancel();
    } catch (e) {
      console.log('speech cancel notice:', e);
    }
    currentUtterance = null;
    isSpeechPaused = false;
  }

  // BGM만 사용자 터치로 미리 활성화합니다.
  // 음성합성에 빈 문장을 speak()하지 않습니다. (iOS 무음 원인 가능)
  function unlockMobileAudio() {
    if (!bgmAudio) return;
    const oldVolume = bgmAudio.volume;
    bgmAudio.volume = 0;
    const p = bgmAudio.play();
    if (p && typeof p.then === 'function') {
      p.then(() => {
        bgmAudio.pause();
        bgmAudio.currentTime = 0;
        bgmAudio.volume = oldVolume || targetBgmVolume;
      }).catch(() => {
        bgmAudio.volume = oldVolume || targetBgmVolume;
      });
    }
  }

  // 💡 [동화 제작 함수]
  async function generateStoryAndImages() {
    try {
      const apiKeyEl = document.getElementById('apiKey');
      const authorEl = document.getElementById('authorName');
      const genreEl = document.getElementById('storyGenre');
      const charEl = document.getElementById('character');
      const bgEl = document.getElementById('background');
      const lessonEl = document.getElementById('lesson');
      const lengthEl = document.getElementById('storyLength');
      const btn = document.getElementById('generateBtn');
      const statusLog = document.getElementById('status-log');
      const bookContainer = document.getElementById('book-container');
      const pagesWrapper = document.getElementById('story-pages-wrapper');
      const controlPanel = document.getElementById('controlPanel');

      const apiKey = (apiKeyEl ? apiKeyEl.value : '').trim();
      const author = (authorEl ? authorEl.value : '').trim();
      
      if (!apiKey || apiKey.length < 5) {
        alert('🔑 Google AI Studio API Key를 먼저 입력해 주세요.');
        if (apiKeyEl) apiKeyEl.focus();
        return;
      }

      if (!author) {
        alert('✍️ 나만의 서재에 안전하게 책을 저장하기 위해 [작가 닉네임]을 적어주세요!');
        if (authorEl) authorEl.focus();
        return;
      }

      const genreKey = genreEl ? genreEl.value : "fantasy";
      const char = (charEl ? charEl.value : '').trim();
      const bg = (bgEl ? bgEl.value : '').trim();
      const lesson = (lessonEl ? lessonEl.value : '').trim();
      const lengthVal = lengthEl ? lengthEl.value : "3";
      const learning = getLearningSelection();

      saveUserSession();
      updateBgmGenrePreview(genreKey);

      const config = lengthConfig[lengthVal] || { pages: 6 };
      const selectedGenre = genreGuides[genreKey] || genreGuides["custom"];

      if (btn) btn.disabled = true;
      if (controlPanel) controlPanel.style.display = 'none';
      if (bookContainer) bookContainer.style.display = 'none';
      if (statusLog) statusLog.innerText = `✨ [${lengthVal}분 · ${config.pages}페이지] ${author} 작가님의 맞춤 동화를 만드는 중입니다...`;
      if (pagesWrapper) pagesWrapper.innerHTML = '';
      stopVoice();

      const promptText = `
너는 유명 성우들이 연기할 역동적이고 재미있는 '어린이 오디오 드라마' 극작가야.
신나는 부분은 와글와글 신나게, 긴장되는 부분은 손에 땀을 쥐게 생동감 넘치게 써줘!

[장르 연출]
- 장르: ${genreEl ? genreEl.selectedOptions[0].text : '환상 판타지'}
- 스타일: ${selectedGenre.storyGuide}

[이야기 설정]
- 작가 이름: ${author}
- 등장인물/주인공: ${char ? char : '장르에 맞는 매력적인 주인공 자동 창작'}
- 배경: ${bg ? bg : '장르에 맞는 아름다운 배경 자동 창작'}
- 주제/교훈: ${lesson ? lesson : '마음이 따뜻해지는 감동 교훈'}
${buildLearningPromptBlock()}
[작성 규칙]
0. 반드시 정확히 ${config.pages}페이지로 작성해줘. pages 배열의 항목 수는 정확히 ${config.pages}개여야 해.
1. 재미있고 통통 튀는 대사와 해설이 어우러진 대본 형태로 작성해줘.
2. 각 페이지의 dialogue_list 배열에 문장 단위로 role과 emotion을 반드시 부여해줘:
   - role: "narrator", "hero", "villain", "elder", "friend"
   - emotion: "excited", "happy", "urgent", "angry", "curious", "whisper", "calm"
3. full_text에는 전체 본문을 적어줘.
4. image_prompt에는 장르 화풍('${selectedGenre.artStyle}')을 반영한 영문 프롬프트를 작성해줘.
5. 배움동화가 선택되었다면 '설명하는 수업'처럼 쓰지 말고, 재미있는 사건 속에서 주인공이 관찰·비교·발견·해결하며 자연스럽게 배우게 해줘.
6. 성경·경전·실존 종교 인물이나 종교적 사건을 중심 소재로 한 동화는 만들지 마. 그런 입력이 있으면 종교와 무관한 창작 소재로 바꿔서 구성해줘.
7. 역사 배움동화에서는 실제 인물·시대·장소·핵심 사건과 알려진 역사적 사실을 임의로 바꾸거나 만들어내지 마. 시간여행·가상 주인공·상상 대화 같은 창작 장치는 사용할 수 있지만, 창작 장치와 역사적 사실이 혼동되지 않도록 분명하게 구성해줘.

[페이지 수 최종 확인]
- 선택된 동화 길이: ${lengthVal}분
- 반드시 생성할 페이지 수: ${config.pages}페이지
- pages 배열 길이가 ${config.pages}가 아니면 잘못된 출력이야.

[출력 규격: 순수 JSON만 출력]
{
  "title": "동화책 제목",
  "pages": [
    {
      "page_num": 1,
      "full_text": "전체 본문",
      "dialogue_list": [
        { "role": "narrator", "emotion": "excited", "text": "문장..." },
        { "role": "hero", "emotion": "happy", "text": "대사..." }
      ],
      "image_prompt": "1페이지 영문 프롬프트, ${selectedGenre.artStyle}"
    }
  ]
}
`;

      const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const geminiData = await geminiRes.json();
      if (geminiData.error) throw new Error(geminiData.error.message);

      const storyData = JSON.parse(geminiData.candidates[0].content.parts[0].text);
      
      
      // ✅ 선택 시간에 맞춰 페이지 수 고정
      if (!Array.isArray(storyData.pages)) storyData.pages = [];
      storyData.pages = storyData.pages.slice(0, config.pages);

      if (storyData.pages.length < config.pages) {
        throw new Error(`AI가 ${storyData.pages.length}페이지만 생성했습니다. 다시 만들기를 눌러주세요. (필요: ${config.pages}페이지)`);
      }

currentStoryBookObject = {
        userId: getUniqueUserIdentifier(),
        author: author,
        genre: genreKey,
        storyPurpose: learning.purpose,
        learningMode: learning.mode,
        learningTopic: learning.topic,
        title: storyData.title,
        createdAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
        pages: []
      };

      currentStoryLanguage = 'ko';
      showKoreanAlongsideEnglish = false;
      updateLanguageButtons();

      const titleEl = document.getElementById('story-main-title');
      if (titleEl) titleEl.innerText = `📖 ${storyData.title}`;
      if (bookContainer) bookContainer.style.display = 'block';

      for (let i = 0; i < storyData.pages.length; i++) {
        const page = storyData.pages[i];
        if (statusLog) statusLog.innerText = `🎨 ${i + 2}/${storyData.pages.length + 1}. ${page.page_num}페이지 삽화를 그리는 중... (${i + 1}/${storyData.pages.length})`;

        let imgBase64 = "";
        try {
          imgBase64 = await generateGeminiImage(apiKey, page.image_prompt, childPhotoBase64);
        } catch (imgErr) {
          console.error(`Page ${i+1} Image Error:`, imgErr);
        }

        currentStoryBookObject.pages.push({
          page_num: page.page_num,
          full_text: page.full_text || page.text,
          dialogue_list: page.dialogue_list || [{ role: 'narrator', emotion: 'calm', text: page.full_text || page.text }],
          imageBase64: imgBase64
        });
      }

      renderBookPages(currentStoryBookObject);
      showPage(0);

      if (statusLog) statusLog.innerText = `🎉 [${author}] 작가님의 동화책이 완성되었어요! 아래에서 바로 읽어보세요!`;
      if (controlPanel) controlPanel.style.display = 'flex';

      setTimeout(() => {
        const bookView = document.getElementById('book-container');
        if (bookView) {
          bookView.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 300);

    } catch (err) {
      const statusLog = document.getElementById('status-log');
      if (statusLog) statusLog.innerText = `⚠️ 오류: ${err.message}`;
      alert(`⚠️ 오류가 발생했습니다: ${err.message}`);
    } finally {
      const btn = document.getElementById('generateBtn');
      if (btn) btn.disabled = false;
    }
  }

  async function generateGeminiImage(apiKey, prompt, inputImageBase64 = null) {
    const parts = [];

    if (inputImageBase64) {
      parts.push({
        inlineData: {
          mimeType: childPhotoMime,
          data: inputImageBase64
        }
      });
      parts.push({
        text: `Create a children's book illustration where the main character has the exact facial appearance, hairstyle, and likeness of the child in the provided image. Scene description: ${prompt}`
      });
    } else {
      parts.push({
        text: `Children's storybook illustration: ${prompt}`
      });
    }

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: parts }] })
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const resParts = data.candidates?.[0]?.content?.parts || [];
    for (const part of resParts) {
      if (part.inlineData && part.inlineData.data) return part.inlineData.data;
    }
    throw new Error('이미지 없음');
  }

  function getLegacyUserIdentifier() {
    const key = (document.getElementById('apiKey')?.value || '').trim();
    const author = (document.getElementById('authorName')?.value || '').trim();
    if (key.length >= 8) return (author ? author + "_" : "user_") + key.slice(-8);
    return author ? author : "default_guest";
  }

  function getUniqueUserIdentifier() {
    const uid = window.EAIMCloud?.getUser?.()?.uid;
    return uid ? `firebase_${uid}` : getLegacyUserIdentifier();
  }

  function saveUserSession() {
    try {
      const key = (document.getElementById('apiKey')?.value || '').trim();
      const author = (document.getElementById('authorName')?.value || '').trim();
      localStorage.setItem("gemini_fairytale_api_key", key);
      localStorage.setItem("gemini_fairytale_author", author);
      const status = document.getElementById('apiStatus');
      if (status) {
        status.style.display = 'inline';
        setTimeout(() => { status.style.display = 'none'; }, 1500);
      }
    } catch(e) {}
    if (!window.EAIMCloud?.getUser?.()) loadLibraryList();
  }

  function clearUserSession() {
    try {
      localStorage.removeItem("gemini_fairytale_api_key");
      localStorage.removeItem("gemini_fairytale_author");
    } catch(e) {}
    const k = document.getElementById('apiKey');
    const a = document.getElementById('authorName');
    if (k) k.value = '';
    if (a) a.value = '';
    loadLibraryList();
    alert('사용자 정보가 초기화되었습니다.');
  }

  try {
    if (typeof indexedDB !== 'undefined') {
      const dbRequest = indexedDB.open("FairytaleAppDB_MultiUser", 3);
      dbRequest.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains("books")) {
          const store = db.createObjectStore("books", { keyPath: "id", autoIncrement: true });
          store.createIndex("userId", "userId", { unique: false });
        }
      };
      dbRequest.onsuccess = (e) => {
        db = e.target.result;
        try {
          const savedKey = localStorage.getItem("gemini_fairytale_api_key");
          const savedAuthor = localStorage.getItem("gemini_fairytale_author");
          if (savedKey && document.getElementById('apiKey')) document.getElementById('apiKey').value = savedKey;
          if (savedAuthor && document.getElementById('authorName')) document.getElementById('authorName').value = savedAuthor;
        } catch(e) {}
        loadLibraryList();
      };
    }
  } catch(e) {
    console.log("DB Init Notice:", e);
  }

  function handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    childPhotoMime = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 512;
        let w = img.width, h = img.height;
        if (w > h && w > maxDim) { h *= maxDim / w; w = maxDim; }
        else if (h > maxDim) { w *= maxDim / h; h = maxDim; }
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);

        const dataUrl = canvas.toDataURL(childPhotoMime, 0.85);
        childPhotoBase64 = dataUrl.split(',')[1];

        const preview = document.getElementById('photoPreview');
        if (preview) {
          preview.src = dataUrl;
          preview.style.display = 'block';
        }
        const clearBtn = document.getElementById('photoClearBtn');
        if (clearBtn) clearBtn.style.display = 'inline-block';
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function clearChildPhoto() {
    childPhotoBase64 = null;
    const input = document.getElementById('childPhotoInput');
    if (input) input.value = '';
    const preview = document.getElementById('photoPreview');
    if (preview) preview.style.display = 'none';
    const clearBtn = document.getElementById('photoClearBtn');
    if (clearBtn) clearBtn.style.display = 'none';
  }

  const lengthConfig = {
    "2": { pages: 4 },
    "3": { pages: 6 },
    "5": { pages: 8 },
    "10": { pages: 10 }
  };

  const genreGuides = {
    "fantasy": {
      storyGuide: "신비롭고 몽환적인 마법, 요정, 별빛, 환상적인 세계관을 중심으로 환상동화 스타일로 연출해줘.",
      artStyle: "magical soft watercolor fairy tale illustration, dreamlike fantasy lighting, glowing sparkles, pastel colors"
    },
    "heroic": {
      storyGuide: "웅장하고 감동적인 대결, 불굴의 용기와 신념, 박진감 넘치는 영웅 서사극 스타일로 연출해줘.",
      artStyle: "epic heroic children's storybook illustration, ancient biblical and historical atmosphere, dramatic lighting, warm colors"
    },
    "mystery": {
      storyGuide: "호기심을 자극하는 단서, 수수께끼, 지혜를 발휘해 비밀을 풀어나가는 흥미진진한 탐정/추리 스타일로 연출해줘.",
      artStyle: "charming mystery adventure book illustration, magnifying glass, secret paths, cozy warm lighting"
    },
    "scifi": {
      storyGuide: "신비로운 우주, 별자리 탐험, 귀여운 로봇, 상상력 넘치는 미래 과학 기술을 중심으로 연출해줘.",
      artStyle: "cute sci-fi space adventure illustration, glowing stars, futuristic cozy robots, galaxy nebula colors"
    },
    "animal": {
      storyGuide: "숲속 귀여운 동물 친구들의 따뜻한 우정, 서로 돕는 배려와 사랑스러운 일상 성장 이야기로 연출해줘.",
      artStyle: "cute fluffy animal characters, warm cozy forest background, soft watercolor picture book style"
    },
    "comic": {
      storyGuide: "엉뚱하고 기발한 사건, 유쾌한 소동, 아이들이 까르르 웃을 수 있는 재치 넘치는 대화로 연출해줘.",
      artStyle: "fun lively children's comic storybook illustration, expressive characters, bright cheerful vibrant colors"
    },
    "custom": {
      storyGuide: "입력된 주인공과 배경, 주제의 개성을 극대화하여 가장 매력적이고 독창적인 맞춤형 스토리로 자유롭게 연출해줘.",
      artStyle: "creative charming children's storybook illustration, expressive and heartwarming watercolor art style, vibrant pleasant colors"
    }
  };

  function renderBookPages(book) {
    const wrapper = document.getElementById('story-pages-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = '';

    const activePages = getActiveStoryPages(book);
    activePages.forEach((p, i) => {
      const originalPage = Array.isArray(book.pages) ? book.pages[i] : null;
      const pageDiv = document.createElement('div');
      pageDiv.className = `page-item ${i === 0 ? 'active' : ''}`;
      pageDiv.id = `book-page-${i}`;
      
      const imageBase64 = originalPage?.imageBase64 || p.imageBase64 || '';
      const imgHtml = imageBase64
        ? `<img src="data:image/png;base64,${imageBase64}" class="page-img" alt="삽화 ${p.page_num}">` 
        : `<div class="page-loading-text">🎨 (삽화 준비 중)</div>`;

      const formattedText = p.dialogue_list 
        ? p.dialogue_list.map(d => {
            let icon = '📖';
            let roleClass = '';
            if (d.role === 'hero' || d.role === 'child') { icon = '🧒'; roleClass = 'dialogue-hero'; }
            else if (d.role === 'villain' || d.role === 'monster') { icon = '👹'; roleClass = 'dialogue-villain'; }
            else if (d.role === 'elder') { icon = '🧙‍♂️'; roleClass = 'dialogue-elder'; }
            else if (d.role === 'friend') { icon = '🐾'; roleClass = 'dialogue-hero'; }

            let emotionBadge = '';
            if (d.emotion === 'excited') emotionBadge = '<span class="emotion-tag">✨ 신남</span>';
            else if (d.emotion === 'urgent') emotionBadge = '<span class="emotion-tag">🔥 긴박</span>';
            else if (d.emotion === 'angry') emotionBadge = '<span class="emotion-tag">💥 호통</span>';
            else if (d.emotion === 'whisper') emotionBadge = '<span class="emotion-tag">🤫 속삭임</span>';

            if (d.role === 'narrator') {
              return `${d.text}<br>`;
            } else {
              return `<span class="dialogue-char ${roleClass}">${icon}</span> "${d.text}" ${emotionBadge}<br>`;
            }
          }).join('')
        : p.full_text;

      let koreanTranslationHtml = '';
      if (isEnglishStoryMode() && showKoreanAlongsideEnglish && originalPage) {
        const originalText = originalPage.dialogue_list
          ? originalPage.dialogue_list.map(d => d.text || '').join(' ')
          : (originalPage.full_text || '');
        koreanTranslationHtml = `<div class="korean-translation"><strong>🇰🇷 한국어 해석</strong><br>${originalText}</div>`;
      }

      pageDiv.innerHTML = `
        ${imgHtml}
        <div class="page-overlay-box">
          <div class="page-num-badge">${p.page_num}페이지</div>
          <p class="page-text">${formattedText}${koreanTranslationHtml}</p>
        </div>
      `;
      wrapper.appendChild(pageDiv);
    });

    const titleEl = document.getElementById('story-main-title');
    if (titleEl) titleEl.innerText = `📖 ${getActiveStoryTitle(book)}`;
    updateLanguageButtons();
    const bookContainer = document.getElementById('book-container');
    if (bookContainer) bookContainer.style.display = 'block';
    const controlPanel = document.getElementById('controlPanel');
    if (controlPanel) controlPanel.style.display = 'flex';
  }

  function showPage(index) {
    if (!currentStoryBookObject || !currentStoryBookObject.pages.length) return;
    const total = currentStoryBookObject.pages.length;
    if (index < 0) index = 0;
    if (index >= total) index = total - 1;
    currentPageIndex = index;

    document.querySelectorAll('.page-item').forEach((el, i) => {
      if (i === currentPageIndex) el.classList.add('active');
      else el.classList.remove('active');
    });

    const ind = document.getElementById('pageIndicator');
    if (ind) ind.innerText = `${currentPageIndex + 1} / ${total}`;
    const prev = document.getElementById('prevPageBtn');
    if (prev) prev.disabled = (currentPageIndex === 0);
    const next = document.getElementById('nextPageBtn');
    if (next) next.disabled = (currentPageIndex === total - 1);
  }

  function goToPrevPage() { 
    if (isPlaying) stopVoice();
    showPage(currentPageIndex - 1); 
  }
  function goToNextPage() { 
    if (isPlaying) stopVoice();
    showPage(currentPageIndex + 1); 
  }

  // 💡 [모바일 안정형 연속 낭독 루프]
  async function startContinuousReading(onCompleteCallback = null, startPageIndex = 0) {
    if (!currentStoryBookObject) return;

    // 🎵 모바일 핵심:
    // '낭독 시작/이어듣기' 버튼을 누른 바로 그 순간 BGM을 재생합니다.
    // await나 음성 onstart 뒤에 play()를 호출하면 모바일 브라우저가 자동재생으로 막을 수 있습니다.
    if (isBgmEnabled) {
      playBgmForCurrentStory();
    }

    if (typeof window.speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
      alert('이 브라우저는 음성 낭독 기능을 지원하지 않습니다. Safari 또는 Chrome 최신 버전으로 열어주세요.');
      return;
    }

    // 중요: 예전 코드는 unlockMobileAudio() 직후 stopVoice()가 speak()를 cancel하여
    // 모바일에서 첫 낭독이 사라질 수 있었습니다. 이제 기존 음성을 먼저 정리합니다.
    speechSessionId += 1;
    const mySession = speechSessionId;
    safeCancelSpeech();
    initVoices();

    isPlaying = true;
    isSpeechPaused = false;
    wasStoppedByUser = false;

    const safeStartPage = Math.max(0, Math.min(
      Number(startPageIndex) || 0,
      Math.max(0, currentStoryBookObject.pages.length - 1)
    ));
    showPage(safeStartPage);

    // 처음부터 들을 때만 제목을 읽습니다.
    if (safeStartPage === 0) {
      const firstOk = await speakDynamicLine(
        'narrator',
        'excited',
        `${isEnglishStoryMode() ? 'Title' : '제목'}: ${getActiveStoryTitle(currentStoryBookObject)}`,
        { sessionId: mySession, startBgmOnStart: false }
      );
      if (!firstOk || !isPlaying || mySession !== speechSessionId) return;
    } else if (isBgmEnabled) {
      playBgmForCurrentStory();
    }

    const readingPages = getActiveStoryPages(currentStoryBookObject);
    for (let i = safeStartPage; i < readingPages.length; i++) {
      if (!isPlaying || mySession !== speechSessionId) break;
      showPage(i);

      const pageData = readingPages[i];

      if (pageData.dialogue_list && pageData.dialogue_list.length > 0) {
        for (const line of pageData.dialogue_list) {
          if (!isPlaying || mySession !== speechSessionId) break;
          const ok = await speakDynamicLine(
            line.role || 'narrator',
            line.emotion || 'calm',
            line.text,
            { sessionId: mySession }
          );
          if (!ok || !isPlaying || mySession !== speechSessionId) break;
          const delay = line.emotion === 'urgent' ? 100 : 160;
          await new Promise(r => setTimeout(r, delay));
        }
      } else {
        const ok = await speakDynamicLine(
          'narrator',
          'calm',
          pageData.full_text,
          { sessionId: mySession }
        );
        if (!ok || !isPlaying || mySession !== speechSessionId) break;
      }
    }

    if (isPlaying && mySession === speechSessionId) {
      if (onCompleteCallback && typeof onCompleteCallback === 'function') {
        onCompleteCallback();
      } else if (isRepeatMode) {
        setTimeout(() => {
          if (isPlaying && isRepeatMode && mySession === speechSessionId) {
            startContinuousReading();
          }
        }, 700);
      } else {
        isPlaying = false;
        clearSpeechWatchdog();
        stopBgm();
      }
    }
  }

  // 💡 [모바일 안정형 단일 발화 함수]
  
  function getKoreanVoices() {
    const all = Array.isArray(availableVoices) ? availableVoices : [];
    const ko = all.filter(v => v.lang && String(v.lang).toLowerCase().startsWith('ko'));
    const unique = [];
    const seen = new Set();
    for (const v of ko) {
      const key = v.voiceURI || `${v.name}|${v.lang}`;
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(v);
      }
    }
    return unique;
  }

  function getEnglishVoices() {
    const all = Array.isArray(availableVoices) ? availableVoices : [];
    const en = all.filter(v => v.lang && String(v.lang).toLowerCase().startsWith('en'));
    const unique = [];
    const seen = new Set();
    for (const v of en) {
      const key = v.voiceURI || `${v.name}|${v.lang}`;
      if (!seen.has(key)) { seen.add(key); unique.push(v); }
    }
    return unique;
  }

  function updateVoiceStatus() {
    const el = document.getElementById('voiceStatus');
    if (!el) return;
    const isEnglish = isEnglishStoryMode();
    const voices = isEnglish ? getEnglishVoices() : getKoreanVoices();
    const langName = isEnglish ? '영어' : '한국어';
    if (voices.length >= 3) {
      el.innerHTML = `🎙️ ${langName} 음성 <b>${voices.length}개</b>를 찾았어요. 역할별로 다른 음성을 우선 사용합니다.`;
    } else if (voices.length === 2) {
      el.innerHTML = `🎙️ ${langName} 음성 <b>2개</b>를 찾았어요. 음성 2개와 음높이·속도 연기로 역할을 나눕니다.`;
    } else if (voices.length === 1) {
      el.innerHTML = `🎙️ ${langName} 음성이 <b>1개</b>라서 음높이·속도를 달리해 역할을 구분합니다.`;
    } else {
      el.innerHTML = `🎙️ ${langName} 음성을 불러오는 중이에요. 낭독 버튼을 누르면 다시 확인합니다.`;
    }
  }

  function getRoleVoiceProfile(role, emotion, styleMode, languageCode = 'ko-KR') {
    const voices = String(languageCode).toLowerCase().startsWith('en') ? getEnglishVoices() : getKoreanVoices();
    const r = String(role || '').toLowerCase();
    const em = String(emotion || '').toLowerCase();

    let idx = 0; // narrator
    if (r.includes('hero') || r.includes('child')) idx = 1;
    else if (r.includes('friend')) idx = 2;
    else if (r.includes('villain') || r.includes('monster') || r.includes('giant')) idx = 3;
    else if (r.includes('elder') || r.includes('king')) idx = 4;

    const voice = voices.length ? voices[idx % voices.length] : null;

    let rate = 1.0, pitch = 1.0;
    if (styleMode === 'bedtime_calm') {
      if (r.includes('villain') || r.includes('elder') || r.includes('king')) { rate = 0.82; pitch = 0.72; }
      else if (r.includes('friend')) { rate = 0.92; pitch = 1.18; }
      else if (r.includes('hero') || r.includes('child')) { rate = 0.90; pitch = 1.10; }
      else { rate = 0.86; pitch = 0.94; }
    } else {
      if (r.includes('villain') || r.includes('monster') || r.includes('giant')) { rate = 0.88; pitch = 0.62; }
      else if (r.includes('elder') || r.includes('king')) { rate = 0.82; pitch = 0.78; }
      else if (r.includes('friend')) { rate = 1.12; pitch = 1.32; }
      else if (r.includes('hero') || r.includes('child')) { rate = 1.05; pitch = 1.18; }
      else { rate = 0.96; pitch = 0.98; }

      if (em === 'excited' || em === 'happy') { rate += 0.08; pitch += 0.08; }
      else if (em === 'urgent') { rate += 0.13; pitch += 0.03; }
      else if (em === 'angry') { rate += 0.04; pitch -= 0.08; }
      else if (em === 'whisper') { rate -= 0.12; pitch -= 0.06; }
      else if (em === 'curious') { pitch += 0.10; }
    }

    // 영어 난이도별 낭독 속도: 유아 영어는 더 천천히, 어린이 영어는 자연스럽지만 여유 있게.
    if (String(languageCode).toLowerCase().startsWith('en')) {
      rate *= currentStoryLanguage === 'en-preschool' ? 0.70 : 0.84;
    }

    rate = Math.max(0.52, Math.min(1.35, rate));
    pitch = Math.max(0.5, Math.min(1.6, pitch));
    return { voice, rate, pitch };
  }

function speakDynamicLine(role, emotion, rawText, options = {}) {
    return new Promise((resolve) => {
      if (typeof window.speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') {
        resolve(false);
        return;
      }

      const cleanText = String(rawText || '').replace(/[*#"]/g, '').trim();
      if (!cleanText) { resolve(true); return; }

      const sessionId = options.sessionId ?? speechSessionId;
      if (!isPlaying || sessionId !== speechSessionId) { resolve(false); return; }

      initVoices();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      currentUtterance = utterance;
      const speechLang = getSpeechLanguageCode();
      utterance.lang = speechLang;
      utterance.volume = 1;

      const styleEl = document.getElementById('actingStyle');
      const styleMode = styleEl ? styleEl.value : 'dynamic_theater';
      const profile = getRoleVoiceProfile(role, emotion, styleMode, speechLang);

      if (profile.voice) utterance.voice = profile.voice;
      utterance.rate = profile.rate;
      utterance.pitch = profile.pitch;

      let finished = false;
      let hardTimeout = null;

      const finish = (ok = true) => {
        if (finished) return;
        finished = true;
        if (hardTimeout) clearTimeout(hardTimeout);
        clearSpeechWatchdog();
        if (currentUtterance === utterance) currentUtterance = null;
        if (isBgmEnabled && bgmAudio && !bgmAudio.paused) {
          bgmAudio.volume = getCurrentBgmSelection().volume;
        }
        resolve(ok);
      };

      utterance.onstart = () => {
        if (options.startBgmOnStart && isBgmEnabled) playBgmForCurrentStory();
        if (isBgmEnabled && bgmAudio && !bgmAudio.paused) {
          bgmAudio.volume = getCurrentBgmSelection().volume * 0.68;
        }
        clearSpeechWatchdog();
        speechWatchdog = setInterval(() => {
          if (!isPlaying || sessionId !== speechSessionId || isSpeechPaused) return;
          try { window.speechSynthesis.resume(); } catch (e) {}
        }, 4000);
      };

      utterance.onend = () => finish(true);
      utterance.onerror = () => finish(false);

      const estimatedMs = Math.max(18000, Math.min(90000, cleanText.length * 430));
      hardTimeout = setTimeout(() => {
        if (!finished) {
          try { window.speechSynthesis.cancel(); } catch (e) {}
          finish(false);
        }
      }, estimatedMs);

      try {
        window.speechSynthesis.resume();
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        finish(false);
      }
    });
  }

  function toggleRepeatMode() {
    isRepeatMode = !isRepeatMode;
    const loopBtn = document.getElementById('loopBtn');
    if (loopBtn) {
      if (isRepeatMode) {
        loopBtn.classList.add('active');
        loopBtn.innerText = '🔁 반복 재생: ON';
      } else {
        loopBtn.classList.remove('active');
        loopBtn.innerText = '🔁 반복 재생: OFF';
      }
    }
  }

  async function playAllBooksSequentially() {
    if (myLibraryBooks.length === 0) {
      alert('내 서재에 저장된 동화책이 없습니다.');
      return;
    }
    isLibraryPlayingMode = true;
    currentLibraryIndex = 0;
    playNextBookInLibrary();
  }

  function playNextBookInLibrary() {
    if (!isPlaying && currentLibraryIndex > 0) return;

    if (currentLibraryIndex >= myLibraryBooks.length) {
      if (isRepeatMode) {
        currentLibraryIndex = 0;
      } else {
        alert('📚 내 서재의 모든 동화책 연속 재생이 완료되었습니다!');
        isLibraryPlayingMode = false;
        isPlaying = false;
        stopBgm();
        return;
      }
    }

    const nextBook = myLibraryBooks[currentLibraryIndex];
    currentStoryBookObject = nextBook;
    currentStoryLanguage = 'ko';
    showKoreanAlongsideEnglish = false;
    renderBookPages(nextBook);
    showPage(0);
    switchTab('create');

    // 첫 책은 사용자의 '연속 재생' 터치 흐름을 유지한 채 바로 낭독을 시작합니다.
    // iOS Safari는 setTimeout 뒤의 최초 speak()를 사용자 제스처로 인정하지 않을 수 있습니다.
    startContinuousReading(() => {
      currentLibraryIndex++;
      playNextBookInLibrary();
    });
  }

  async function saveCurrentStoryToDB(options = {}) {
    if (!currentStoryBookObject || !db) return;

    const cloudUser = window.EAIMCloud?.getUser?.() || null;
    currentStoryBookObject.userId = getUniqueUserIdentifier();
    currentStoryBookObject.author = (document.getElementById('authorName')?.value || '').trim() || "꼬마 작가";
    currentStoryBookObject.genre = document.getElementById('storyGenre')?.value || "fantasy";
    const currentLearning = getLearningSelection();
    currentStoryBookObject.storyPurpose = currentLearning.purpose;
    currentStoryBookObject.learningMode = currentLearning.mode;
    currentStoryBookObject.learningTopic = currentLearning.topic;
    currentStoryBookObject.updatedAt = new Date().toISOString();

    try {
      await new Promise((resolve, reject) => {
        const tx = db.transaction("books", "readwrite");
        const store = tx.objectStore("books");
        const req = currentStoryBookObject.id ? store.put(currentStoryBookObject) : store.add(currentStoryBookObject);
        req.onsuccess = () => { if (!currentStoryBookObject.id) currentStoryBookObject.id = req.result; };
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || new Error('IndexedDB save failed'));
      });

      let cloudSaved = false;
      if (cloudUser && window.EAIMCloud?.saveStory) {
        try {
          const result = await window.EAIMCloud.saveStory(currentStoryBookObject);
          if (result?.cloudId) {
            currentStoryBookObject.cloudId = result.cloudId;
            currentStoryBookObject.userId = `firebase_${cloudUser.uid}`;
            await new Promise((resolve) => {
              const tx = db.transaction("books", "readwrite");
              tx.objectStore("books").put(currentStoryBookObject);
              tx.oncomplete = resolve; tx.onerror = resolve;
            });
          }
          cloudSaved = true;
        } catch (e) {
          console.error('Cloud save:', e);
          setCloudStatus('⚠️ 기기에는 저장됐지만 클라우드 저장에 실패했어요: ' + (e.message || e));
        }
      }

      if (!options.silent) {
        alert(cloudSaved
          ? `[${currentStoryBookObject.title}]이(가) 기기와 EAIM Kids 클라우드 서재에 저장되었습니다!`
          : `[${currentStoryBookObject.title}]이(가) 이 기기의 서재에 저장되었습니다.${cloudUser ? '\n클라우드 저장 상태를 확인해 주세요.' : '\nGoogle 로그인하면 다른 기기와 동기화할 수 있어요.'}`);
      }
      await loadLibraryList();
    } catch(e) {
      console.error(e);
      if (!options.silent) alert('서재 저장 중 오류가 발생했습니다.');
    }
  }

  function getLocalBooks() {
    return new Promise((resolve) => {
      if (!db) return resolve([]);
      try {
        const tx = db.transaction("books", "readonly");
        const req = tx.objectStore("books").getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      } catch(e) { resolve([]); }
    });
  }

  async function loadLibraryList() {
    if (!db) return;
    const currentUserId = getUniqueUserIdentifier();
    const legacyUserId = getLegacyUserIdentifier();
    const authorName = (document.getElementById('authorName')?.value || '').trim() || "나";
    const cloudUser = window.EAIMCloud?.getUser?.() || null;
    const titleEl = document.getElementById('libraryTitleLabel');
    if (titleEl) titleEl.innerText = cloudUser ? `📚 ${cloudUser.displayName || authorName}님의 클라우드 서재` : `📚 [${authorName}] 작가님의 기기 서재`;

    const localAll = await getLocalBooks();
    let localBooks = localAll.filter(book => !book.userId || book.userId === currentUserId || book.userId === legacyUserId);
    let cloudBooks = [];
    if (cloudUser && window.EAIMCloud?.loadStories) {
      try { cloudBooks = await window.EAIMCloud.loadStories(); }
      catch(e) { console.error('Cloud load:', e); setCloudStatus('⚠️ 클라우드 서재를 불러오지 못했어요: ' + (e.message || e)); }
    }

    const merged = [];
    const byCloudId = new Map();
    for (const b of localBooks) {
      merged.push(b);
      if (b.cloudId) byCloudId.set(b.cloudId, merged.length - 1);
    }
    for (const cb of cloudBooks) {
      if (cb.cloudId && byCloudId.has(cb.cloudId)) {
        const idx = byCloudId.get(cb.cloudId);
        // 클라우드 데이터가 새 기기에서도 완전한 책을 제공하도록 우선합니다.
        merged[idx] = { ...merged[idx], ...cb, id: merged[idx].id };
      } else merged.push(cb);
    }
    myLibraryBooks = merged.sort((a,b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));

    const listEl = document.getElementById("library-list");
    if (!listEl) return;
    if (myLibraryBooks.length === 0) {
      listEl.innerHTML = `<p style="text-align:center;color:#94a3b8;padding:20px">${cloudUser ? '클라우드 서재' : `[${authorName}] 님의 서재`}에 보관된 동화책이 없습니다.</p>`;
      return;
    }

    listEl.innerHTML = myLibraryBooks.map((book, index) => `
      <div class="library-item">
        <div class="library-info">
          <h4>📖 ${book.title}</h4>
          <p>작가: <b>${book.author || '익명'}</b> | 저장일: ${book.createdAt || '-'} (총 ${(book.pages || []).length}p)
            <span class="library-tag">${storyPurposeLabel(book.storyPurpose, book.learningMode)}</span>
            ${book.cloudId ? '<span class="library-tag">☁️ Cloud</span>' : '<span class="library-tag">📱 기기</span>'}
            ${(book.preschoolEnglishPages?.length || book.englishPages?.length) ? '<span class="library-tag">🐣 유아 EN</span>' : ''}
            ${book.childEnglishPages?.length ? '<span class="library-tag">🌱 어린이 EN</span>' : ''}
          </p>
        </div>
        <div class="library-actions">
          <button type="button" class="btn-load" onclick="loadSingleBook(${index})">열기</button>
          <button type="button" class="btn-delete" onclick="deleteSavedBook(${index})">삭제</button>
        </div>
      </div>`).join('');
  }

  async function persistCloudBookLocally(book) {
    if (!db || !book) return book;
    const existing = (await getLocalBooks()).find(b => b.cloudId && b.cloudId === book.cloudId);
    const localBook = { ...book, id: existing?.id };
    await new Promise((resolve) => {
      try {
        const tx = db.transaction('books','readwrite');
        const req = localBook.id ? tx.objectStore('books').put(localBook) : tx.objectStore('books').add(localBook);
        req.onsuccess = () => { if (!localBook.id) localBook.id = req.result; };
        tx.oncomplete = resolve; tx.onerror = resolve;
      } catch(e) { resolve(); }
    });
    return localBook;
  }

  async function loadSingleBook(index) {
    let book = myLibraryBooks[index];
    if (!book) return;
    if (book.cloudId && !book.id) book = await persistCloudBookLocally(book);
    currentStoryBookObject = book;
    const genreEl = document.getElementById('storyGenre');
    const learningEl = document.getElementById('learningMode');
    const learningTopicEl = document.getElementById('learningTopic');
    if (genreEl) genreEl.value = book.genre || 'fantasy';
    const legacyLearningMode = book.learningMode || 'general';
    const savedPurpose = book.storyPurpose || (legacyLearningMode && legacyLearningMode !== 'general' ? 'learning' : 'story');
    setStoryPurpose(savedPurpose, { silent: true });
    if (learningEl && legacyLearningMode !== 'general') learningEl.value = legacyLearningMode;
    if (typeof setLearningTopicFromSaved === 'function' && savedPurpose === 'learning') setLearningTopicFromSaved(book.learningTopic || '', legacyLearningMode || 'science');
    else if (learningTopicEl) learningTopicEl.value = book.learningTopic || '';
    handleLearningModeChange();
    currentStoryLanguage = 'ko'; showKoreanAlongsideEnglish = false;
    renderBookPages(book); showPage(0); switchTab('create'); updateBgmGenrePreview(book.genre || 'fantasy');
    setTimeout(() => document.getElementById('book-container')?.scrollIntoView({ behavior:'smooth', block:'start' }), 200);
  }

  async function deleteSavedBook(index) {
    const book = myLibraryBooks[index];
    if (!book || !confirm('이 동화책을 내 서재에서 삭제하시겠습니까?')) return;
    if (book.id && db) {
      await new Promise((resolve) => {
        try { const tx=db.transaction('books','readwrite'); tx.objectStore('books').delete(book.id); tx.oncomplete=resolve; tx.onerror=resolve; }
        catch(e){ resolve(); }
      });
    }
    if (book.cloudId && window.EAIMCloud?.getUser?.() && window.EAIMCloud?.deleteStory) {
      try { await window.EAIMCloud.deleteStory(book.cloudId); }
      catch(e) { alert('기기에서는 삭제했지만 클라우드 삭제에 실패했어요: ' + (e.message || e)); }
    }
    await loadLibraryList();
  }

  function setCloudStatus(message) {
    const el = document.getElementById('cloudAuthStatus');
    if (el) el.textContent = message;
  }

  async function loginEAIMKids() {
    if (!window.EAIMCloud?.login) return alert('Firebase 연결을 준비하는 중이에요. 잠시 후 다시 눌러 주세요.');
    try { setCloudStatus('Google 로그인 중...'); await window.EAIMCloud.login(); }
    catch(e) { console.error(e); setCloudStatus('로그인 실패: ' + (e.message || e)); }
  }

  async function logoutEAIMKids() {
    if (!window.EAIMCloud?.logout) return;
    try { await window.EAIMCloud.logout(); }
    catch(e) { console.error(e); }
  }

  function updateCloudAuthUI(user) {
    const login=document.getElementById('googleLoginBtn'), logout=document.getElementById('googleLogoutBtn');
    const sync=document.getElementById('cloudSyncBtn'), box=document.getElementById('cloudUserBox');
    const name=document.getElementById('cloudUserName'), photo=document.getElementById('cloudUserPhoto');
    if (user) {
      if(login) login.style.display='none'; if(logout) logout.style.display='inline-block'; if(sync) sync.style.display='inline-block'; if(box) box.style.display='flex';
      if(name) name.textContent=user.displayName || user.email || 'Google 사용자';
      if(photo){ if(user.photoURL){photo.src=user.photoURL;photo.style.display='block';}else photo.style.display='none'; }
      setCloudStatus('✅ EAIM Kids에 로그인되었습니다. 새로 저장하는 동화는 자동으로 클라우드에도 저장됩니다.');
    } else {
      if(login) login.style.display='inline-block'; if(logout) logout.style.display='none'; if(sync) sync.style.display='none'; if(box) box.style.display='none';
      setCloudStatus('로그인하지 않아도 이 기기에는 저장됩니다. Google 로그인하면 여러 기기에서 같은 서재를 사용할 수 있어요.');
    }
    loadLibraryList();
  }

  async function syncLocalLibraryToCloud() {
    const user = window.EAIMCloud?.getUser?.();
    if (!user) return alert('먼저 Google로 로그인해 주세요.');
    const legacyId = getLegacyUserIdentifier();
    const currentId = `firebase_${user.uid}`;
    const books = (await getLocalBooks()).filter(b => !b.userId || b.userId===legacyId || b.userId===currentId);
    if (!books.length) return alert('이 기기에 동기화할 동화책이 없습니다.');
    if (!confirm(`이 기기의 동화책 ${books.length}권을 EAIM Kids 클라우드 서재와 동기화할까요?`)) return;
    let ok=0, fail=0;
    setCloudStatus(`☁️ ${books.length}권 동기화 중...`);
    for (const book of books) {
      try {
        book.userId=currentId; book.updatedAt=book.updatedAt || new Date().toISOString();
        const r=await window.EAIMCloud.saveStory(book);
        if(r?.cloudId) book.cloudId=r.cloudId;
        await new Promise((resolve)=>{try{const tx=db.transaction('books','readwrite');tx.objectStore('books').put(book);tx.oncomplete=resolve;tx.onerror=resolve;}catch(e){resolve();}});
        ok++;
      } catch(e) { console.error(e); fail++; }
    }
    setCloudStatus(`✅ 동기화 완료: ${ok}권${fail ? ` / 실패 ${fail}권` : ''}`);
    await loadLibraryList();
    alert(`클라우드 동기화가 끝났어요. 성공 ${ok}권${fail ? `, 실패 ${fail}권` : ''}`);
  }

  window.addEventListener('eaim-auth-changed', (event) => updateCloudAuthUI(event.detail || null));
  function exportToPDF() {
    if (!currentStoryBookObject) return;
    
    const printContainer = document.createElement('div');
    printContainer.innerHTML = `
      <h1 style="text-align:center; font-size:24px; margin-bottom:6px; color:#1e293b;">📖 ${getActiveStoryTitle(currentStoryBookObject)}</h1>
      <p style="text-align:center; font-size:14px; color:#64748b; margin-bottom:24px;">글/그림: ${currentStoryBookObject.author || '어린이 작가'}</p>
    `;
    
    getActiveStoryPages(currentStoryBookObject).forEach((p, i) => {
      const originalPage = currentStoryBookObject.pages[i];
      const pDiv = document.createElement('div');
      pDiv.style.cssText = "page-break-inside: avoid; position: relative; width: 100%; max-width: 520px; aspect-ratio: 1/1; margin: 0 auto 30px auto; border-radius: 12px; overflow: hidden;";
      const pdfImage = originalPage?.imageBase64 || p.imageBase64 || '';
      const imgTag = pdfImage ? `<img src="data:image/png;base64,${pdfImage}" style="width: 100%; height: 100%; object-fit: cover;">` : '';
      pDiv.innerHTML = `
        ${imgTag}
        <div style="position: absolute; bottom: 0; left: 0; width: 100%; box-sizing: border-box; background: rgba(0,0,0,0.65); padding: 20px 16px; color: #fff;">
          <b style="color: #fbbf24;">[${p.page_num}페이지]</b>
          <p style="font-size: 14px; line-height: 1.6; margin: 4px 0 0 0; color: #fff;">${p.full_text || p.text}</p>
        </div>
      `;
      printContainer.appendChild(pDiv);
    });

    const opt = {
      margin: 10,
      filename: `${getActiveStoryTitle(currentStoryBookObject)}_${currentStoryBookObject.author || '동화'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(printContainer).save();
  }

  function switchTab(tab) {
    const cv = document.getElementById('create-view');
    const lv = document.getElementById('library-view');
    const tbC = document.getElementById('tabCreateBtn');
    const tbL = document.getElementById('tabLibraryBtn');

    if (cv) cv.style.display = tab === 'create' ? 'block' : 'none';
    if (lv) lv.style.display = tab === 'library' ? 'block' : 'none';
    if (tbC) tbC.className = `tab-btn ${tab === 'create' ? 'active' : ''}`;
    if (tbL) tbL.className = `tab-btn ${tab === 'library' ? 'active' : ''}`;
    if (tab === 'library') loadLibraryList();
  }

  function pauseVoice() {
    isSpeechPaused = true;
    if (typeof window.speechSynthesis !== 'undefined') {
      try { window.speechSynthesis.pause(); } catch (e) {}
    }
    if (bgmAudio) bgmAudio.pause();
  }

  function resumeVoice() {
    if (!currentStoryBookObject) return;

    if (isPlaying && isSpeechPaused) {
      isSpeechPaused = false;
      if (typeof window.speechSynthesis !== 'undefined') {
        try { window.speechSynthesis.resume(); } catch (e) {}
      }
      if (isBgmEnabled && bgmAudio) {
        bgmAudio.volume = currentUtterance ? targetBgmVolume * 0.35 : targetBgmVolume;
        const p = bgmAudio.play();
        if (p && typeof p.catch === 'function') p.catch(() => {});
      }
      return;
    }

    if (!isPlaying && wasStoppedByUser) {
      const pageToResume = Math.max(0, Math.min(
        lastStoppedPageIndex,
        Math.max(0, currentStoryBookObject.pages.length - 1)
      ));
      startContinuousReading(null, pageToResume);
      return;
    }

    if (!isPlaying) {
      startContinuousReading(null, currentPageIndex || 0);
    }
  }

  function stopVoice() {
    lastStoppedPageIndex = currentPageIndex || 0;
    wasStoppedByUser = true;

    isPlaying = false;
    isLibraryPlayingMode = false;
    isSpeechPaused = false;
    speechSessionId += 1;
    safeCancelSpeech();
    stopBgm();
  }
