// 🏗️ 뮤니마을 이미지 스튜디오 (제작자 전용)
// - 쿼터뷰(아이소메트릭 2:1) 마을 그림을 한 세트로 만듭니다. 땅(잔디·길·물)은 마을 화면에서 코드로 그리고,
//   여기서는 그 위에 올릴 건물·시설·꾸미기·캐릭터만 만듭니다.
// - 모든 그림에 뮤니 그림을 스타일 기준으로 함께 보내고, "⭐ 기준 그림"으로 정한 건물도 함께 보내 각도·크기를 맞춥니다.
// - 자홍색(#FF00FF) 단색 배경으로 만든 뒤 투명하게 바꿉니다(초록 나무가 지워지지 않도록 초록 대신 자홍).
// - 만든 그림은 이 기기에 보관되고(다시 열어도 유지), 압축파일로 내려받아 저장소 assets/village/ 에 올립니다.
// - 선생님 API 키로만 동작합니다(무료체험 사용 안 함).
(function () {
  const DB_NAME = 'muni_village_studio';
  const STORE = 'assets';
  const KEY_RGB = [255, 0, 255];

  const STYLE = [
    'Cute isometric 2.5D mobile village game asset for a children\'s app (ages 3-8).',
    'Camera: classic 2:1 isometric angle, viewed from the front-left and above, exactly the same angle for every asset.',
    'Art style must match the reference character: thick rounded dark-purple outlines, soft pastel colors, round friendly shapes, picture-book warmth.',
    'Single object only, centered, fully visible with generous margin, no cropping.',
    'Background: perfectly flat solid pure magenta (#FF00FF) filling the whole image. No gradient, no floor, no cast shadow on the background.',
    'No text, no letters, no numbers, no signs with writing.'
  ].join(' ');

  const BASE = 'standing on its own small diamond-shaped isometric grass base tile';

  const ASSETS = [
    // 장소 종류 13
    { id: 'building-forest', group: '장소', label: '숲', prompt: `a cozy mushroom-roof treehouse among a few round trees, ${BASE}` },
    { id: 'building-sea', group: '장소', label: '바다', prompt: `a small striped lighthouse with a tiny wooden pier and gentle blue water edge, ${BASE}` },
    { id: 'building-sky', group: '장소', label: '하늘', prompt: `a cute hot-air balloon station with a fluffy cloud platform, ${BASE}` },
    { id: 'building-space', group: '장소', label: '우주', prompt: `a small round observatory dome with a friendly little rocket beside it, ${BASE}` },
    { id: 'building-castle', group: '장소', label: '성', prompt: `a small fairy-tale castle with two round towers and pastel flags without symbols, ${BASE}` },
    { id: 'building-town', group: '장소', label: '마을', prompt: `a charming two-story village house with a round window and flower boxes, ${BASE}` },
    { id: 'building-school', group: '장소', label: '학교', prompt: `a tiny friendly schoolhouse with a bell tower and a small playground slide, ${BASE}` },
    { id: 'building-farm', group: '장소', label: '농장', prompt: `a red barn with a small windmill and a haystack, ${BASE}` },
    { id: 'building-mountain', group: '장소', label: '산', prompt: `a small snow-capped mountain with a winding path and a tiny cabin, ${BASE}` },
    { id: 'building-cave', group: '장소', label: '동굴', prompt: `a round rocky cave entrance glowing softly with crystals, ${BASE}` },
    { id: 'building-shop', group: '장소', label: '가게', prompt: `a small bakery-style shop with a striped awning and a display window, ${BASE}` },
    { id: 'building-home', group: '장소', label: '집', prompt: `a small cottage with a chimney and a round door, ${BASE}` },
    { id: 'building-other', group: '장소', label: '기타', prompt: `a magical little rainbow gate arch with sparkles, ${BASE}` },
    // 고정 시설
    { id: 'facility-muni-house', group: '시설', label: '뮤니의 집', prompt: `Muni's house: a round pastel purple cottage whose roof looks like a pair of headphones, music note decorations, ${BASE}` },
    { id: 'facility-music-plaza', group: '시설', label: '음악 광장', prompt: `a small round music plaza with a tiny outdoor stage and a music-note shaped fountain, on a round stone-paved isometric base` },
    { id: 'plant-1-seed', group: '텃밭', label: '텃밭 1 씨앗', prompt: `a small square garden plot of brown soil with a tiny seed mound, isometric diamond soil tile` },
    { id: 'plant-2-sprout', group: '텃밭', label: '텃밭 2 새싹', prompt: `a small square garden plot of brown soil with a tiny green sprout with two leaves, isometric diamond soil tile` },
    { id: 'plant-3-bud', group: '텃밭', label: '텃밭 3 꽃봉오리', prompt: `a small square garden plot of brown soil with a leafy plant and a closed pink flower bud, isometric diamond soil tile` },
    { id: 'plant-4-flower', group: '텃밭', label: '텃밭 4 꽃', prompt: `a small square garden plot of brown soil with a big happy blooming flower with a smiling face, isometric diamond soil tile` },
    // 꾸미기
    { id: 'deco-tree-round', group: '꾸미기', label: '둥근 나무', prompt: 'a single round fluffy tree' },
    { id: 'deco-tree-pine', group: '꾸미기', label: '뾰족 나무', prompt: 'a single cute pine tree' },
    { id: 'deco-flowerbed', group: '꾸미기', label: '꽃밭', prompt: 'a small patch of colorful flowers' },
    { id: 'deco-lamp', group: '꾸미기', label: '가로등', prompt: 'a cute street lamp with a warm glowing round light' },
    { id: 'deco-bench', group: '꾸미기', label: '벤치', prompt: 'a small wooden park bench' },
    { id: 'deco-signpost', group: '꾸미기', label: '빈 푯말', prompt: 'a blank wooden signpost board with no writing on it' },
    // 캐릭터
    { id: 'char-muni-idle', group: '캐릭터', label: '뮤니 서 있기', char: 'muni', prompt: 'the reference character Muni, full body, standing happily, 3/4 view facing front-right, no base tile' },
    { id: 'char-muni-wave', group: '캐릭터', label: '뮤니 손 흔들기', char: 'muni', prompt: 'the reference character Muni, full body, waving one hand hello, 3/4 view facing front-right, no base tile' },
    { id: 'char-muni-happy', group: '캐릭터', label: '뮤니 기뻐하기', char: 'muni', prompt: 'the reference character Muni, full body, jumping with joy, 3/4 view facing front-right, no base tile' },
    { id: 'char-muto-idle', group: '캐릭터', label: '뮤토 서 있기', char: 'muto', prompt: 'the second reference character Muto, full body, standing happily, 3/4 view facing front-right, no base tile' },
    { id: 'char-muto-wave', group: '캐릭터', label: '뮤토 손 흔들기', char: 'muto', prompt: 'the second reference character Muto, full body, waving one hand hello, 3/4 view facing front-right, no base tile' },
    { id: 'char-muto-happy', group: '캐릭터', label: '뮤토 기뻐하기', char: 'muto', prompt: 'the second reference character Muto, full body, jumping with joy, 3/4 view facing front-right, no base tile' }
  ];

  let dbp = null;
  let overlay = null;
  let busy = false;
  let stopAll = false;
  const state = {}; // id -> { blob, url, isRef }
  let mutoRef = null; // { mime, data }
  let styleRefId = null;

  // ---------- 기기 보관 (IndexedDB) ----------
  function openDB() {
    if (dbp) return dbp;
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbp;
  }
  async function dbPut(key, val) {
    const db = await openDB();
    return new Promise((res) => { const tx = db.transaction(STORE, 'readwrite'); tx.objectStore(STORE).put(val, key); tx.oncomplete = res; tx.onerror = res; });
  }
  async function dbGet(key) {
    const db = await openDB();
    return new Promise((res) => { const tx = db.transaction(STORE, 'readonly'); const r = tx.objectStore(STORE).get(key); r.onsuccess = () => res(r.result); r.onerror = () => res(null); });
  }

  // ---------- 이미지 도우미 ----------
  function blobToBase64(blob) {
    return new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(String(fr.result).split(',')[1]); fr.onerror = rej; fr.readAsDataURL(blob); });
  }
  function loadImg(src) {
    return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  }
  async function imageToRef(src, maxDim = 512) {
    const img = await loadImg(src);
    const s = Math.min(1, maxDim / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return { mime: 'image/jpeg', data: c.toDataURL('image/jpeg', 0.88).split(',')[1] };
  }

  // 자홍 배경 → 투명, 가장자리 자홍 번짐 줄이기, 여백 자르기, 최대 512px
  async function keyOutMagenta(base64) {
    const img = await loadImg(`data:image/png;base64,${base64}`);
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const px = d.data;
    let minX = c.width, minY = c.height, maxX = -1, maxY = -1;
    for (let i = 0; i < px.length; i += 4) {
      const r = px[i], g = px[i + 1], b = px[i + 2];
      // 자홍다움: 빨강·파랑은 높고 초록은 낮음
      const mag = Math.min(r, b) - g;
      const dist = Math.hypot(r - KEY_RGB[0], g - KEY_RGB[1], b - KEY_RGB[2]);
      let a = 255;
      if (dist < 90 || mag > 150) a = 0;
      else if (dist < 170 && mag > 60) {
        a = Math.round(255 * Math.min(1, (dist - 90) / 80));
        // 번짐 제거: 초록 수준으로 빨강·파랑 낮추기
        px[i] = Math.min(r, g + 40); px[i + 2] = Math.min(b, g + 40);
      }
      px[i + 3] = a;
      if (a > 20) {
        const p = i / 4, x = p % c.width, y = (p / c.width) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    ctx.putImageData(d, 0, 0);
    if (maxX < 0) throw new Error('그림이 비어 있어요.');
    const pad = 6;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    maxX = Math.min(c.width - 1, maxX + pad); maxY = Math.min(c.height - 1, maxY + pad);
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const s = Math.min(1, 512 / Math.max(w, h));
    const out = document.createElement('canvas');
    out.width = Math.round(w * s); out.height = Math.round(h * s);
    out.getContext('2d').drawImage(c, minX, minY, w, h, 0, 0, out.width, out.height);
    const type = out.toDataURL('image/webp').startsWith('data:image/webp') ? 'image/webp' : 'image/png';
    return new Promise(res => out.toBlob(b => res(b), type, 0.92));
  }

  // ---------- 만들기 ----------
  async function generateOne(asset) {
    const apiKey = (document.getElementById('apiKey')?.value || '').trim();
    if (apiKey.length < 5) throw new Error('API 키 칸에 선생님 키를 넣어주세요.');
    const promptEl = overlay?.querySelector(`textarea[data-id="${asset.id}"]`);
    const subject = (promptEl?.value || asset.prompt).trim();

    const parts = [];
    const muniSrc = document.querySelector('.muni-hero img')?.src;
    if (muniSrc) {
      const muni = await imageToRef(muniSrc);
      parts.push({ text: 'Reference image 1: the character Muni. Use this for the art style (and for Muni\'s look when Muni is requested).' });
      parts.push({ inlineData: { mimeType: muni.mime, data: muni.data } });
    }
    if (asset.char === 'muto') {
      if (!mutoRef) throw new Error('뮤토 캐릭터는 뮤토 기준 그림을 먼저 올려주세요.');
      parts.push({ text: 'Reference image 2: the character Muto. Draw Muto exactly like this.' });
      parts.push({ inlineData: { mimeType: mutoRef.mime, data: mutoRef.data } });
    }
    if (styleRefId && styleRefId !== asset.id && state[styleRefId]?.blob && !asset.char) {
      parts.push({ text: 'Reference asset: an already-approved asset from the same set. Match its isometric angle, outline thickness, scale and base tile size exactly.' });
      parts.push({ inlineData: { mimeType: state[styleRefId].blob.type || 'image/png', data: await blobToBase64(state[styleRefId].blob) } });
    }
    parts.push({ text: `${STYLE}\nSubject: ${subject}` });

    const data = await callImageModel({ mode: 'key', apiKey }, parts);
    if (data?.error) throw new Error(data.error.message || '그림을 만들지 못했어요.');
    const part = (data?.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.data);
    if (!part) throw new Error('그림이 오지 않았어요. 다시 만들어 주세요.');
    const blob = await keyOutMagenta(part.inlineData.data);
    setAsset(asset.id, blob);
    await dbPut(`asset:${asset.id}`, blob);
  }

  function setAsset(id, blob) {
    if (state[id]?.url) URL.revokeObjectURL(state[id].url);
    state[id] = { ...(state[id] || {}), blob, url: URL.createObjectURL(blob) };
    renderCard(id);
    updateSummary();
  }

  async function runOne(id) {
    if (busy) return;
    const asset = ASSETS.find(a => a.id === id);
    busy = true; setCardBusy(id, true);
    try { await generateOne(asset); }
    catch (e) { alert(`⚠️ ${asset.label}: ${e.message}`); }
    finally { busy = false; setCardBusy(id, false); }
  }

  async function runAllMissing(btn) {
    if (busy) return;
    const todo = ASSETS.filter(a => !state[a.id]?.blob && !(a.char === 'muto' && !mutoRef));
    if (!todo.length) { alert('만들 그림이 없어요. (뮤토는 기준 그림을 올려야 만들 수 있어요)'); return; }
    if (!confirm(`아직 없는 그림 ${todo.length}장을 차례로 만들까요?\n선생님 API 키로 결제돼요 (한 장에 수십 원 수준).`)) return;
    busy = true; stopAll = false;
    btn.textContent = '⏹ 멈추기';
    btn.onclick = () => { stopAll = true; };
    let fail = 0;
    for (const a of todo) {
      if (stopAll) break;
      setCardBusy(a.id, true);
      try { await generateOne(a); } catch (e) { fail++; console.error(a.id, e); }
      setCardBusy(a.id, false);
    }
    busy = false;
    btn.textContent = '✨ 없는 그림 모두 만들기';
    btn.onclick = () => runAllMissing(btn);
    if (fail) alert(`${fail}장은 실패했어요. 그 카드에서 [다시 만들기]를 눌러주세요.`);
  }

  async function setStyleRef(id) {
    if (!state[id]?.blob) return;
    styleRefId = styleRefId === id ? null : id;
    await dbPut('meta:styleRef', styleRefId);
    ASSETS.forEach(a => renderCard(a.id));
  }

  async function onMutoUpload(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    try {
      mutoRef = await imageToRef(url);
      await dbPut('meta:mutoRef', mutoRef);
      const img = overlay.querySelector('.vs-muto-preview');
      if (img) { img.src = `data:${mutoRef.mime};base64,${mutoRef.data}`; img.style.display = 'block'; }
    } finally { URL.revokeObjectURL(url); }
  }

  // ---------- 내려받기 ----------
  async function downloadAll(btn) {
    const ready = ASSETS.filter(a => state[a.id]?.blob);
    if (!ready.length) { alert('아직 만든 그림이 없어요.'); return; }
    const old = btn.textContent; btn.disabled = true; btn.textContent = '📦 묶는 중...';
    try {
      const JSZip = window.JSZip || await new Promise((res, rej) => {
        const s = document.createElement('script'); s.src = './js/vendor/jszip.min.js';
        s.onload = () => res(window.JSZip); s.onerror = () => rej(new Error('압축 도구를 불러오지 못했어요.'));
        document.head.appendChild(s);
      });
      const zip = new JSZip();
      const folder = zip.folder('village');
      const manifest = { version: 1, view: 'isometric-2:1', anchor: 'bottom-center', createdAt: new Date().toISOString(), assets: [] };
      for (const a of ready) {
        const blob = state[a.id].blob;
        const ext = (blob.type || '').includes('webp') ? 'webp' : 'png';
        const file = `${a.id}.${ext}`;
        folder.file(file, blob);
        const img = await loadImg(state[a.id].url);
        manifest.assets.push({ id: a.id, group: a.group, label: a.label, file, width: img.width, height: img.height, type: a.id.startsWith('building-') ? a.id.replace('building-', '') : undefined });
      }
      folder.file('village-manifest.json', JSON.stringify(manifest, null, 2));
      folder.file('사용법.txt', '\ufeff' + [
        '🏗️ 뮤니마을 그림 세트',
        '',
        '1. 이 압축을 풀면 village 폴더가 나와요.',
        '2. GitHub 저장소의 assets 폴더 안에 village 폴더째 올려주세요 → assets/village/...',
        '3. village-manifest.json 은 마을 화면이 그림 목록을 읽는 파일이에요. 함께 올려주세요.',
        '',
        '※ 그림은 아래 가운데(발 밑)를 기준점으로 땅 칸 위에 놓여요.',
        '※ 땅(잔디·길·물)은 마을 화면이 코드로 그려요.'
      ].join('\r\n'));
      const zblob = await zip.generateAsync({ type: 'blob' });
      const aEl = document.createElement('a');
      aEl.href = URL.createObjectURL(zblob); aEl.download = `muni-village-assets_${ready.length}.zip`;
      document.body.appendChild(aEl); aEl.click(); aEl.remove();
      setTimeout(() => URL.revokeObjectURL(aEl.href), 5000);
    } catch (e) { alert(`⚠️ ${e.message}`); }
    finally { btn.disabled = false; btn.textContent = old; }
  }

  // ---------- 화면 ----------
  function esc(s) { return String(s || '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function cardHtml(a) {
    const st = state[a.id] || {};
    const isRef = styleRefId === a.id;
    return `
      <div class="vs-thumb ${isRef ? 'is-ref' : ''}">${st.url ? `<img src="${st.url}" alt="${esc(a.label)}">` : '<span>아직 없음</span>'}</div>
      <div class="vs-title">${esc(a.label)} ${isRef ? '<b class="vs-ref-tag">⭐ 기준</b>' : ''}</div>
      <textarea data-id="${a.id}" rows="3">${esc(a.prompt)}</textarea>
      <div class="vs-actions">
        <button type="button" class="vs-make" data-act="make" data-id="${a.id}">${st.blob ? '🔁 다시 만들기' : '🎨 만들기'}</button>
        ${st.blob && !a.char ? `<button type="button" class="vs-ref" data-act="ref" data-id="${a.id}">${isRef ? '기준 해제' : '⭐ 기준 그림'}</button>` : ''}
      </div>`;
  }

  function renderCard(id) {
    const el = overlay?.querySelector(`.vs-card[data-card="${id}"]`);
    if (!el) return;
    const keepPrompt = el.querySelector('textarea')?.value;
    el.innerHTML = cardHtml(ASSETS.find(a => a.id === id));
    if (keepPrompt) el.querySelector('textarea').value = keepPrompt;
  }

  function setCardBusy(id, on) {
    const el = overlay?.querySelector(`.vs-card[data-card="${id}"]`);
    if (!el) return;
    el.classList.toggle('busy', on);
    const b = el.querySelector('.vs-make');
    if (b) { b.disabled = on; if (on) b.textContent = '⏳ 그리는 중...'; }
    if (!on) renderCard(id);
  }

  function updateSummary() {
    const s = overlay?.querySelector('.vs-summary');
    if (s) s.textContent = `${ASSETS.filter(a => state[a.id]?.blob).length} / ${ASSETS.length}장 완성`;
  }

  async function openStudio() {
    if (!document.body.classList.contains('is-creator')) return;
    if (overlay) { overlay.style.display = 'block'; return; }
    for (const a of ASSETS) {
      const b = await dbGet(`asset:${a.id}`);
      if (b) state[a.id] = { blob: b, url: URL.createObjectURL(b) };
    }
    styleRefId = await dbGet('meta:styleRef');
    mutoRef = await dbGet('meta:mutoRef');

    overlay = document.createElement('div');
    overlay.className = 'vs-overlay';
    const groups = [...new Set(ASSETS.map(a => a.group))];
    overlay.innerHTML = `
      <div class="vs-panel">
        <div class="vs-head">
          <div>
            <h2>🏗️ 뮤니마을 이미지 스튜디오 <small>제작자 전용 · 쿼터뷰</small></h2>
            <p>땅(잔디·길·물)은 마을 화면이 그려요. 여기서는 그 위에 올릴 그림을 만들어요. <b>첫 건물이 마음에 들면 ⭐ 기준 그림</b>으로 정하세요 — 다음 그림들이 그 각도와 크기를 따라가요.</p>
          </div>
          <button type="button" class="vs-close">✕ 닫기</button>
        </div>
        <div class="vs-toolbar">
          <span class="vs-summary"></span>
          <label class="vs-muto">🤖 뮤토 기준 그림 올리기 <input type="file" accept="image/*"></label>
          <img class="vs-muto-preview" alt="뮤토" style="display:${mutoRef ? 'block' : 'none'}" ${mutoRef ? `src="data:${mutoRef.mime};base64,${mutoRef.data}"` : ''}>
          <button type="button" class="vs-all">✨ 없는 그림 모두 만들기</button>
          <button type="button" class="vs-zip">⬇️ 그림 세트 내려받기</button>
        </div>
        ${groups.map(g => `
          <h3 class="vs-group">${esc(g)}</h3>
          <div class="vs-grid">${ASSETS.filter(a => a.group === g).map(a => `<div class="vs-card" data-card="${a.id}">${cardHtml(a)}</div>`).join('')}</div>
        `).join('')}
      </div>`;
    document.body.appendChild(overlay);
    updateSummary();

    overlay.querySelector('.vs-close').onclick = () => { overlay.style.display = 'none'; };
    overlay.querySelector('.vs-muto input').onchange = (e) => onMutoUpload(e.target.files[0]);
    const allBtn = overlay.querySelector('.vs-all');
    allBtn.onclick = () => runAllMissing(allBtn);
    const zipBtn = overlay.querySelector('.vs-zip');
    zipBtn.onclick = () => downloadAll(zipBtn);
    overlay.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      if (b.dataset.act === 'make') runOne(b.dataset.id);
      if (b.dataset.act === 'ref') setStyleRef(b.dataset.id);
    });
  }

  window.openVillageStudio = openStudio;
  window.__villageStudio = { ASSETS, keyOutMagenta };
})();
