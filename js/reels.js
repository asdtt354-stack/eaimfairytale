// 📱 세로 릴스 만들기 — AI 성우 목소리가 있는 동화를 인스타 릴스·유튜브 쇼츠용 세로(9:16) 영상으로
// 화면 공유 없이 앱이 직접 그림·자막·목소리·배경음악을 섞어 영상을 만듭니다(js/eaim-auto-recorder.js).
// 동화 전체 또는 "명장면만"(원하는 페이지 범위)을 골라 30~60초 맛보기 영상을 만들 수 있어요.
(function () {
  const esc = (s) => String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function b64ImageUrl(b64) {
    const bin = atob(b64); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([u], { type: 'image/png' }));
  }

  window.openReelsMaker = function () {
    const book = currentStoryBookObject;
    if (!book || !book.pages?.length) { alert('먼저 동화를 열어주세요.'); return; }
    if (typeof isEnglishStoryMode === 'function' && isEnglishStoryMode()) { alert('세로 릴스는 지금 한국어(AI 성우 목소리)로만 만들 수 있어요. 한국어로 바꾼 뒤 눌러 주세요.'); return; }
    const voiced = book.pages.map((p, i) => ({ i, ok: !!p.aiVoice?.blob }));
    if (!voiced.some(v => v.ok)) { alert('🎙️ AI 성우 목소리가 있는 동화만 릴스로 만들 수 있어요.\n먼저 "AI 성우 목소리 입히기"를 해 주세요.'); return; }
    try { stopVoice(); } catch (e) {}

    const n = book.pages.length;
    const opts = book.pages.map((p, i) => `<option value="${i}">${i + 1}페이지</option>`).join('');
    const isCreator = document.body.classList.contains('is-creator');
    const m = document.createElement('div');
    m.className = 'cm-overlay'; m.style.display = 'grid';
    m.innerHTML = `
      <div class="cm-box">
        <div class="cm-head"><b>📱 세로 릴스 만들기</b><button type="button" class="cm-close">✕</button></div>
        <p class="cm-current">인스타 릴스·유튜브 쇼츠용 <b>세로(9:16)</b> 영상을 앱이 직접 만들어요. 화면 공유가 필요 없어요.</p>
        <div class="ml-form">
          <label>어디부터 어디까지?
            <div class="cm-row"><select class="rl-from">${opts}</select><select class="rl-to">${opts}</select></div>
          </label>
          <label class="rl-hint">💡 릴스는 <b>30~60초</b>가 좋아요. 명장면 1~2페이지만 고르면 딱 맞아요.</label>
          <label>끝 화면 문구<input class="rl-end" maxlength="40" value="전체 동화는 프로필 링크에서 📚"></label>
        </div>
        <button type="button" class="cm-make rl-go">🎬 릴스 만들기</button>
        <p class="cm-lyria-status rl-status"></p>
        <div class="rl-preview"></div>
        <p class="cm-note">만드는 동안 이 화면을 켜 둔 채 기다려 주세요(다른 탭으로 가면 영상이 끊겨요). 영상 길이만큼 시간이 걸려요.</p>
      </div>`;
    document.body.appendChild(m);
    const from = m.querySelector('.rl-from'), to = m.querySelector('.rl-to');
    const first = voiced.find(v => v.ok).i;
    from.value = String(first); to.value = String(Math.min(n - 1, first + 1));
    m.querySelector('.cm-close').onclick = () => { if (rec) rec.stop(); m.remove(); };
    let rec = null;

    m.querySelector('.rl-go').onclick = async (e) => {
      const btn = e.currentTarget, st = m.querySelector('.rl-status');
      let a = +from.value, b = +to.value; if (a > b) [a, b] = [b, a];
      const picked = [];
      for (let i = a; i <= b; i++) if (book.pages[i]?.aiVoice?.blob) picked.push(i);
      if (!picked.length) { st.textContent = '⚠️ 고른 페이지에 AI 성우 목소리가 없어요.'; return; }
      btn.disabled = true;
      const urls = [];
      try {
        const scenes = picked.map(i => {
          const p = book.pages[i];
          const img = p.imageBase64 ? b64ImageUrl(p.imageBase64) : null; if (img) urls.push(img);
          const voice = URL.createObjectURL(p.aiVoice.blob); urls.push(voice);
          const lines = (p.aiVoice.lines || []).filter(l => !/^(제목|Title)\s*:/.test(l.text));
          return {
            title: '', images: img ? [img] : [],
            number: { src: voice, volume: 1 },
            captions: lines.map(l => l.text),
            captionWeights: lines.map(l => l.text.length + 6)
          };
        });
        const sel = typeof getCurrentBgmSelection === 'function' ? getCurrentBgmSelection() : null;
        const title = typeof getActiveStoryTitle === 'function' ? getActiveStoryTitle(book) : book.title;
        rec = EAIMAutoRecorder.create({
          vertical: true,
          title, subtitle: isCreator || book.isLibraryBook ? '뮤니 명작동화' : '뮤니의 동화마을',
          bandText: isCreator || book.isLibraryBook ? '♪ 뮤니 명작동화' : '♪ 뮤니의 동화마을',
          logoSrc: './assets/mutoniz-logo.png',
          endText: m.querySelector('.rl-end').value.trim() || '전체 동화는 프로필 링크에서 📚',
          endSub: '뮤니의 동화마을 · MUTONIZ',
          globalBgm: sel && isBgmEnabled ? { src: sel.data.url, volume: 0.2 } : null,
          scenes,
          fileName: `${String(title).replace(/[\\/:*?"<>|]/g, '').slice(0, 30)}_릴스`,
          onProgress: (pr) => { st.textContent = pr.label === '녹화 중' ? `🎬 만드는 중... ${Math.round(pr.ratio * 100)}%` : `⏳ ${pr.label}`; }
        });
        const info = await rec.prepare();
        st.textContent = `🎬 만드는 중... (약 ${Math.round(info.seconds)}초 걸려요)`;
        const r = await rec.start();
        st.textContent = `✅ 완성! ${r.seconds}초짜리 세로 영상이에요.`;
        m.querySelector('.rl-preview').innerHTML = `<video src="${r.url}" controls playsinline></video><button type="button" class="cm-make rl-down">⬇️ 영상 저장하기</button>`;
        m.querySelector('.rl-down').onclick = () => rec.download(r);
      } catch (err) {
        console.error(err); st.textContent = `⚠️ ${err.message || err}`;
      } finally {
        btn.disabled = false;
        setTimeout(() => urls.forEach(u => URL.revokeObjectURL(u)), 60000);
      }
    };
  };
})();
