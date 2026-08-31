// EAIM Muni Story Village - Bilingual story module
// English is a language/view mode, not a story genre.

let currentStoryLanguage = 'ko';
let showKoreanAlongsideEnglish = false;
let isTranslatingStory = false;

function getActiveStoryTitle(book = currentStoryBookObject) {
  if (!book) return '';
  if (currentStoryLanguage === 'en' && book.englishTitle) return book.englishTitle;
  return book.title || '';
}

function getActiveStoryPages(book = currentStoryBookObject) {
  if (!book) return [];
  if (currentStoryLanguage === 'en' && Array.isArray(book.englishPages) && book.englishPages.length) {
    return book.englishPages;
  }
  return Array.isArray(book.pages) ? book.pages : [];
}

function getSpeechLanguageCode() {
  return currentStoryLanguage === 'en' ? 'en-US' : 'ko-KR';
}

function resetStoryLanguageToKorean(render = true) {
  currentStoryLanguage = 'ko';
  showKoreanAlongsideEnglish = false;
  updateLanguageButtons();
  if (render && currentStoryBookObject) {
    renderBookPages(currentStoryBookObject);
    showPage(Math.min(currentPageIndex, Math.max(0, currentStoryBookObject.pages.length - 1)));
  }
}

function updateLanguageButtons() {
  const koBtn = document.getElementById('langKoBtn');
  const enBtn = document.getElementById('langEnBtn');
  const transBtn = document.getElementById('showTranslationBtn');
  const status = document.getElementById('translationStatus');

  if (koBtn) koBtn.classList.toggle('active', currentStoryLanguage === 'ko');
  if (enBtn) enBtn.classList.toggle('active', currentStoryLanguage === 'en');
  if (transBtn) {
    transBtn.style.display = currentStoryLanguage === 'en' ? 'inline-flex' : 'none';
    transBtn.classList.toggle('active', showKoreanAlongsideEnglish);
    transBtn.textContent = showKoreanAlongsideEnglish ? '🇰🇷 해석 숨기기' : '🇰🇷 해석 함께 보기';
  }
  if (status && currentStoryBookObject) {
    if (currentStoryLanguage === 'en') {
      status.textContent = currentStoryBookObject.englishPages?.length
        ? '영어 버전이 저장되어 있어 다시 번역하지 않아요.'
        : '영어 버전을 준비할 수 있어요.';
    } else {
      status.textContent = '한국어 원문';
    }
  }
  try { updateVoiceStatus(); } catch (e) {}
}

async function switchStoryLanguage(lang) {
  if (!currentStoryBookObject) {
    alert('먼저 동화를 만들어 주세요.');
    return;
  }
  if (lang === 'ko') {
    stopVoice();
    currentStoryLanguage = 'ko';
    showKoreanAlongsideEnglish = false;
    updateLanguageButtons();
    renderBookPages(currentStoryBookObject);
    showPage(Math.min(currentPageIndex, currentStoryBookObject.pages.length - 1));
    return;
  }

  if (lang === 'en') {
    stopVoice();
    if (!Array.isArray(currentStoryBookObject.englishPages) || currentStoryBookObject.englishPages.length !== currentStoryBookObject.pages.length) {
      const ok = await translateCurrentStoryToEnglish();
      if (!ok) return;
    }
    currentStoryLanguage = 'en';
    updateLanguageButtons();
    renderBookPages(currentStoryBookObject);
    showPage(Math.min(currentPageIndex, currentStoryBookObject.pages.length - 1));
  }
}

function toggleKoreanTranslationView() {
  if (currentStoryLanguage !== 'en' || !currentStoryBookObject) return;
  showKoreanAlongsideEnglish = !showKoreanAlongsideEnglish;
  updateLanguageButtons();
  renderBookPages(currentStoryBookObject);
  showPage(Math.min(currentPageIndex, currentStoryBookObject.pages.length - 1));
}

function showEnglishTranslationOverlay() {
  const overlay = document.getElementById('englishTranslationOverlay');
  if (overlay) overlay.classList.add('show');
}

function hideEnglishTranslationOverlay() {
  const overlay = document.getElementById('englishTranslationOverlay');
  if (overlay) overlay.classList.remove('show');
}

async function translateCurrentStoryToEnglish() {
  if (!currentStoryBookObject || isTranslatingStory) return false;
  const apiKey = (document.getElementById('apiKey')?.value || '').trim();
  if (!apiKey) {
    alert('영어 번역을 위해 Google AI Studio API Key가 필요합니다.');
    return false;
  }

  const status = document.getElementById('translationStatus');
  const enBtn = document.getElementById('langEnBtn');
  isTranslatingStory = true;
  showEnglishTranslationOverlay();
  if (enBtn) enBtn.disabled = true;
  if (status) status.textContent = '🌐 어린이가 읽기 좋은 영어로 바꾸는 중...';

  const compactPages = currentStoryBookObject.pages.map((p, i) => ({
    page_num: p.page_num || i + 1,
    full_text: p.full_text || '',
    dialogue_list: (p.dialogue_list || []).map(d => ({
      role: d.role || 'narrator',
      emotion: d.emotion || 'calm',
      text: d.text || ''
    }))
  }));

  const prompt = `다음 한국어 어린이 동화를 자연스럽고 쉬운 영어 동화로 바꿔줘.

[중요 원칙]
- 직역보다 어린이가 듣고 이해하기 쉬운 자연스러운 영어를 사용해.
- 짧고 명확한 문장을 사용하고, 원문의 사건·의미·감정·대화 순서는 바꾸지 마.
- 새로운 사건, 인물, 지식, 교훈을 추가하지 마.
- 과학·수학·음악 내용이 있다면 원문의 의미를 정확하게 보존해.
- role과 emotion 값은 절대 번역하거나 바꾸지 마.
- 페이지 수와 각 페이지의 대화 항목 수를 원문과 동일하게 유지해.
- JSON 이외의 설명은 출력하지 마.

[원문]
${JSON.stringify({ title: currentStoryBookObject.title, pages: compactPages })}

[출력 JSON]
{
  "title": "English title",
  "pages": [
    {
      "page_num": 1,
      "full_text": "English full text",
      "dialogue_list": [
        {"role":"narrator","emotion":"calm","text":"English sentence"}
      ]
    }
  ]
}`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json', temperature: 0.25 }
      })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    const translated = JSON.parse(data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
    if (!translated.title || !Array.isArray(translated.pages) || translated.pages.length !== currentStoryBookObject.pages.length) {
      throw new Error('영어 페이지 수가 원문과 맞지 않습니다.');
    }

    currentStoryBookObject.englishTitle = translated.title;
    currentStoryBookObject.englishPages = translated.pages.map((p, i) => ({
      page_num: currentStoryBookObject.pages[i]?.page_num || p.page_num || i + 1,
      full_text: p.full_text || '',
      dialogue_list: Array.isArray(p.dialogue_list) ? p.dialogue_list : [{ role:'narrator', emotion:'calm', text:p.full_text || '' }]
    }));
    currentStoryBookObject.englishCreatedAt = new Date().toISOString();

    // 이미 서재에 저장된 책이면 같은 책에 영어 버전을 업데이트합니다.
    if (currentStoryBookObject.id && db) {
      try {
        const tx = db.transaction('books', 'readwrite');
        tx.objectStore('books').put(currentStoryBookObject);
      } catch (e) { console.warn('영어 버전 DB 업데이트:', e); }
    }

    if (status) status.textContent = '✅ 영어 버전 완성! 이 책에 함께 저장됩니다.';
    return true;
  } catch (e) {
    console.error(e);
    if (status) status.textContent = '❌ 영어 번역에 실패했어요. 다시 눌러 주세요.';
    alert('영어 번역 중 오류가 발생했습니다: ' + (e.message || e));
    return false;
  } finally {
    hideEnglishTranslationOverlay();
    isTranslatingStory = false;
    if (enBtn) enBtn.disabled = false;
  }
}
