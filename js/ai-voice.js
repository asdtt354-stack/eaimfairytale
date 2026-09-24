// 🎙️ 뮤니의 동화마을 — AI 성우 목소리 (Gemini TTS)
// - 동화를 만들 때 페이지마다 한 번만 목소리를 만들고, 서재(이 기기)에 함께 저장합니다.
// - 다시 듣기·반복·녹화는 저장된 소리를 재생하므로 추가 비용이 없습니다.
// - 내 키가 있으면 내 키로(보호자 결제), 없으면 무료체험 서버로 만듭니다.
// - 한 페이지 = 요청 1번. 해설자(Narrator)와 등장인물(Character) 두 목소리로 읽습니다.

const AI_TTS_MODEL = 'gemini-2.5-flash-preview-tts'; // 공통규칙 6-2 (서버 api/fairytale-trial.js 와 같게)
const AI_VOICES = {
  dynamic_theater: { narrator: 'Sulafat', character: 'Leda' },     // 따뜻한 해설 + 앳된 등장인물
  bedtime_calm:    { narrator: 'Achernar', character: 'Leda' }      // 부드러운 해설
};
const AI_VOICE_WON_PER_MINUTE = 21; // 오디오 1분 ≈ 1,500토큰 × $10/1M ≈ $0.015 ≈ 21원 (대략)

let aiVoicePlayer = null;
let aiVoiceUrl = '';
let aiVoiceStopper = null;

function aiVoiceEnabledByUser() {
  return !!document.getElementById('aiVoiceToggle')?.checked;
}

function estimateVoiceWon(minutes) {
  return Math.max(10, Math.round((Number(minutes) || 3) * AI_VOICE_WON_PER_MINUTE / 10) * 10);
}

function updateAiVoiceCostLabel() {
  const el = document.getElementById('aiVoiceCost');
  if (!el) return;
  const minutes = document.getElementById('storyLength')?.value || '3';
  el.textContent = `약 ${estimateVoiceWon(minutes)}원`;
}
document.addEventListener('change', (e) => { if (e.target && e.target.id === 'storyLength') updateAiVoiceCostLabel(); });
document.addEventListener('DOMContentLoaded', updateAiVoiceCostLabel);

// ---------- 대본 만들기 ----------
function buildPageVoiceScript(page, titleText) {
  const lines = [];
  if (titleText) lines.push({ role: 'narrator', text: `제목: ${titleText}` });
  const src = Array.isArray(page.dialogue_list) && page.dialogue_list.length
    ? page.dialogue_list
    : [{ role: 'narrator', text: page.full_text || '' }];
  for (const d of src) {
    const text = String(d.text || '').replace(/[*#"]/g, '').trim();
    if (text) lines.push({ role: d.role || 'narrator', text });
  }
  const speakerOf = (role) => (role === 'narrator' ? 'Narrator' : 'Character');
  const speakers = new Set(lines.map(l => speakerOf(l.role)));
  const script = lines.map(l => `${speakerOf(l.role)}: ${l.text}`).join('\n');
  return { lines, speakers, script };
}

function buildTtsPrompt(script, styleMode) {
  const style = styleMode === 'bedtime_calm'
    ? '잠들기 전 듣는 동화처럼 아주 부드럽고 느긋하게, 속삭이듯 따뜻하게 읽어 주세요.'
    : '생동감 있는 오디오 드라마처럼, 신나는 장면은 신나게 긴장되는 장면은 긴장감 있게 표현해 주세요.';
  return `3~8세 어린이를 위한 한국어 오디오 동화를 읽어 주세요. Narrator는 다정한 이야기꾼, Character는 동화 속 등장인물들(아이, 동물, 친구, 어른, 악당)이에요. 등장인물의 성격에 맞게 목소리 톤을 바꿔 주세요. ${style} 또박또박 조금 천천히 읽어 주세요.\n\n${script}`;
}

// ---------- 요청 ----------
async function requestPageVoice(aiRoute, prompt, speakers, voiceSet) {
  const voices = [];
  if (speakers.has('Narrator')) voices.push({ speaker: 'Narrator', voiceName: voiceSet.narrator });
  if (speakers.has('Character')) voices.push({ speaker: 'Character', voiceName: voiceSet.character });

  let data;
  if (aiRoute.mode === 'trial') {
    data = await callTrialServer({ action: 'tts', text: prompt, voices });
  } else {
    const speechConfig = voices.length > 1
      ? { multiSpeakerVoiceConfig: { speakerVoiceConfigs: voices.map(v => ({ speaker: v.speaker, voiceConfig: { prebuiltVoiceConfig: { voiceName: v.voiceName } } })) } }
      : { voiceConfig: { prebuiltVoiceConfig: { voiceName: voices[0].voiceName } } };
    const res = await fetchWithRetry(`https://generativelanguage.googleapis.com/v1beta/models/${AI_TTS_MODEL}:generateContent?key=${encodeURIComponent(aiRoute.apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['AUDIO'], speechConfig }
      })
    });
    data = await res.json();
  }
  if (data?.error) throw new Error(data.error.message || '목소리를 만들지 못했어요.');
  const part = (data?.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
  if (!part) throw new Error('목소리 데이터가 없어요.');
  const rate = Number(/rate=(\d+)/.exec(part.inlineData.mimeType || '')?.[1] || 24000);
  return pcmBase64ToWavBlob(part.inlineData.data, rate);
}

function pcmBase64ToWavBlob(b64, sampleRate) {
  const bin = atob(b64);
  const pcm = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) pcm[i] = bin.charCodeAt(i);
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, 'RIFF'); v.setUint32(4, 36 + pcm.length, true); writeStr(8, 'WAVE');
  writeStr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  writeStr(36, 'data'); v.setUint32(40, pcm.length, true);
  return new Blob([header, pcm], { type: 'audio/wav' });
}

// ---------- 동화 전체에 목소리 입히기 ----------
async function generateVoiceForStory(aiRoute, book, onProgress) {
  if (!book || !Array.isArray(book.pages)) return { done: 0, failed: 0 };
  const styleMode = document.getElementById('actingStyle')?.value || 'dynamic_theater';
  const voiceSet = AI_VOICES[styleMode] || AI_VOICES.dynamic_theater;
  let done = 0, failed = 0;
  for (let i = 0; i < book.pages.length; i++) {
    const page = book.pages[i];
    if (onProgress) onProgress(i, book.pages.length);
    const { lines, speakers, script } = buildPageVoiceScript(page, i === 0 ? book.title : '');
    if (!lines.length) continue;
    try {
      const blob = await requestPageVoice(aiRoute, buildTtsPrompt(script, styleMode), speakers, voiceSet);
      page.aiVoice = { blob, lines, lang: 'ko', style: styleMode, voices: voiceSet, model: AI_TTS_MODEL };
      done++;
    } catch (e) {
      console.error(`Page ${i + 1} voice error:`, e);
      failed++;
      if (aiRoute.mode === 'trial' && /사용|모두/.test(e.message)) break;
    }
  }
  book.hasAiVoice = book.pages.some(p => p.aiVoice?.blob);
  return { done, failed };
}

// 이미 만든 동화(서재에서 연 동화 포함)에 목소리 입히기 버튼
async function addAiVoiceToCurrentStory(btn) {
  if (!currentStoryBookObject?.pages?.length) { alert('먼저 동화를 만들거나 서재에서 열어주세요.'); return; }
  if (!isGuardianConfirmed()) { showGuardianGate(); return; }
  const apiKey = (document.getElementById('apiKey')?.value || '').trim();
  let aiRoute;
  if (apiKey.length >= 5) aiRoute = { mode: 'key', apiKey };
  else {
    const trial = await checkTrialReady();
    if (!trial.ok) { alert('AI 성우 목소리를 만들려면 API 키가 필요해요.'); return; }
    aiRoute = { mode: 'trial' };
  }
  const minutes = Math.max(1, Math.round(currentStoryBookObject.pages.length / 2));
  if (aiRoute.mode === 'key' && !confirm(`🎙️ AI 성우 목소리를 만들까요?\n내 API 키로 결제돼요 (약 ${estimateVoiceWon(minutes)}원).\n한 번 만들면 다시 들을 때는 비용이 들지 않아요.`)) return;

  stopVoice();
  const old = btn ? btn.textContent : '';
  if (btn) btn.disabled = true;
  const r = await generateVoiceForStory(aiRoute, currentStoryBookObject, (i, n) => { if (btn) btn.textContent = `🎙️ 목소리 녹음 중... ${i + 1}/${n}`; });
  if (btn) { btn.disabled = false; btn.textContent = old; }
  updateAiVoiceButton();
  if (aiRoute.mode === 'trial') refreshTrialStatus();
  if (r.done && currentStoryBookObject.id) saveCurrentStoryToDB({ silent: true });
  alert(r.done ? `🎉 ${r.done}페이지에 AI 성우 목소리를 입혔어요!${r.failed ? `\n(${r.failed}페이지는 실패해서 기본 음성으로 읽어요)` : ''}${currentStoryBookObject.id ? '' : '\n💾 서재에 저장하면 목소리도 함께 보관돼요.'}` : '⚠️ 목소리를 만들지 못했어요. 잠시 후 다시 시도해 주세요.');
}

function updateAiVoiceButton() {
  const btn = document.getElementById('aiVoiceAddBtn');
  if (!btn) return;
  const has = !!currentStoryBookObject?.pages?.some(p => p.aiVoice?.blob);
  btn.style.display = currentStoryBookObject && !has ? '' : 'none';
  const badge = document.getElementById('aiVoiceBadge');
  if (badge) badge.style.display = has ? '' : 'none';
}

// ---------- 재생 ----------
function hasAiVoice(pageIndex) {
  if (typeof isEnglishStoryMode === 'function' && isEnglishStoryMode()) return false;
  return !!currentStoryBookObject?.pages?.[pageIndex]?.aiVoice?.blob;
}

function getAiVoicePlayer() {
  if (!aiVoicePlayer) {
    aiVoicePlayer = new Audio();
    aiVoicePlayer.preload = 'auto';
    aiVoicePlayer.playsInline = true;
  }
  return aiVoicePlayer;
}

// 버튼을 누른 순간 한 번 재생 권한을 열어둡니다(모바일 자동재생 제한 대비).
function unlockAiVoicePlayer() {
  const p = getAiVoicePlayer();
  try {
    p.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
    const r = p.play();
    if (r && r.catch) r.catch(() => {});
  } catch (e) {}
}

function playPageAiVoice(pageIndex, sessionId) {
  return new Promise((resolve) => {
    const voice = currentStoryBookObject?.pages?.[pageIndex]?.aiVoice;
    if (!voice?.blob) { resolve(false); return; }
    const player = getAiVoicePlayer();
    if (aiVoiceUrl) URL.revokeObjectURL(aiVoiceUrl);
    aiVoiceUrl = URL.createObjectURL(voice.blob);

    // 자막: 글자 수 비율로 줄마다 시간을 나눕니다.
    const weights = voice.lines.map(l => l.text.length + 6);
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    let shownLine = -1;
    const showLine = (i) => {
      if (i === shownLine || !voice.lines[i]) return;
      shownLine = i;
      if (typeof window.onStoryLine === 'function') window.onStoryLine(voice.lines[i].role, voice.lines[i].text);
    };

    let finished = false;
    const finish = (ok) => {
      if (finished) return;
      finished = true;
      clearInterval(watch);
      player.ontimeupdate = null; player.onended = null; player.onerror = null;
      aiVoiceStopper = null;
      if (isBgmEnabled && bgmAudio && !bgmAudio.paused) bgmAudio.volume = getCurrentBgmSelection().volume;
      resolve(ok);
    };
    aiVoiceStopper = () => { try { player.pause(); } catch (e) {} finish(false); };

    player.ontimeupdate = () => {
      if (!player.duration || !isFinite(player.duration)) return;
      const t = player.currentTime / player.duration * total;
      let acc = 0;
      for (let i = 0; i < weights.length; i++) { acc += weights[i]; if (t < acc) { showLine(i); break; } }
    };
    player.onended = () => finish(true);
    player.onerror = () => finish(false);
    const watch = setInterval(() => {
      if (!isPlaying || sessionId !== speechSessionId) { try { player.pause(); } catch (e) {} finish(false); }
    }, 300);

    if (isBgmEnabled && bgmAudio && !bgmAudio.paused) bgmAudio.volume = getCurrentBgmSelection().volume * 0.55;
    player.src = aiVoiceUrl;
    showLine(0);
    const p = player.play();
    if (p && p.catch) p.catch(() => finish(false));
  });
}

function pauseAiVoice() { if (aiVoicePlayer && !aiVoicePlayer.paused) aiVoicePlayer.pause(); }
function resumeAiVoice() { if (aiVoicePlayer && aiVoiceStopper && aiVoicePlayer.paused) { const p = aiVoicePlayer.play(); if (p && p.catch) p.catch(() => {}); } }
function stopAiVoice() { if (aiVoiceStopper) aiVoiceStopper(); }
