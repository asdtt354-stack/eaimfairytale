// EAIM Kids Firebase cloud library module - v20
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js';
import {
  getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, getDocs, collection, deleteDoc, writeBatch
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyAwSabP_h6tgda5BXiMsnhJ3ntByvEIIm0',
  authDomain: 'eaim-kids.firebaseapp.com',
  projectId: 'eaim-kids',
  storageBucket: 'eaim-kids.firebasestorage.app',
  messagingSenderId: '656562937142',
  appId: '1:656562937142:web:11052353276cefe7446797',
  measurementId: 'G-EKLB29CBVW'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });
let currentUser = null;

const IMAGE_CHUNK_SIZE = 650000; // Firestore 문서 1MiB 제한보다 여유 있게 분할

function cleanForFirestore(value) {
  if (value === undefined) return null;
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map(cleanForFirestore);
  if (typeof value === 'object') {
    const out = {};
    for (const [k,v] of Object.entries(value)) {
      if (v !== undefined && k !== 'id' && k !== 'pages') out[k] = cleanForFirestore(v);
    }
    return out;
  }
  return String(value);
}

function makeCloudId(book) {
  if (book?.cloudId) return String(book.cloudId);
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `story_${Date.now()}_${Math.random().toString(36).slice(2,10)}`;
}

function splitChunks(text='') {
  const chunks=[];
  for(let i=0;i<text.length;i+=IMAGE_CHUNK_SIZE) chunks.push(text.slice(i,i+IMAGE_CHUNK_SIZE));
  return chunks;
}

async function clearCollection(pathParts) {
  const ref = collection(firestore, ...pathParts);
  const snap = await getDocs(ref);
  let batch = writeBatch(firestore), count=0;
  for (const d of snap.docs) {
    batch.delete(d.ref); count++;
    if (count >= 400) { await batch.commit(); batch=writeBatch(firestore); count=0; }
  }
  if (count) await batch.commit();
}


async function clearStoryPages(uid, cloudId) {
  const pageRef = collection(firestore,'users',uid,'stories',cloudId,'pages');
  const pageSnap = await getDocs(pageRef);
  for (const pd of pageSnap.docs) {
    await clearCollection(['users',uid,'stories',cloudId,'pages',pd.id,'imageChunks']);
    await deleteDoc(pd.ref);
  }
}

// 🏡 뮤니마을 — 계정 기준 동화 수 (2026-09-24 변경: "내 서재 = 우리 마을")
// 지금 클라우드 서재에 있는 4페이지 이상 동화만 셉니다. 서재에서 지우면 마을에서도 빠져요.
// (다시 만들기·연습용으로 만들었다 지운 동화가 쌓이지 않게)
// 계산 결과는 users/{uid}/village/progress 에도 적어 둡니다(나중 마을 화면용).
const VILLAGE_MIN_PAGES = 4;
const GENRE_PLACES = {
  fantasy:{name:'마법의 숲',emoji:'🌳',type:'forest'}, heroic:{name:'용기의 성',emoji:'🏰',type:'castle'},
  mystery:{name:'비밀의 골목',emoji:'🔍',type:'town'}, scifi:{name:'별빛 우주정거장',emoji:'🚀',type:'space'},
  animal:{name:'동물 친구 들판',emoji:'🐰',type:'farm'}, comic:{name:'웃음 광장',emoji:'🎪',type:'town'},
  custom:{name:'이야기 언덕',emoji:'📖',type:'town'}
};
function fallbackPlace(genre){ return GENRE_PLACES[genre] || GENRE_PLACES.custom; }
window.villageFallbackPlace = fallbackPlace;

function placeEntry(cloudId, meta){
  const vp = meta.villagePlace || fallbackPlace(meta.genre);
  return { storyId:cloudId, title:String(meta.title||'').slice(0,40), name:vp.name, emoji:vp.emoji, type:vp.type, madeAt:String(meta.updatedAt || meta.createdAt || '') };
}

async function computeVillageProgress(uid){
  const stories=await getDocs(collection(firestore,'users',uid,'stories'));
  const places=[];
  for (const d of stories.docs){
    const m=d.data()||{};
    if ((m.pageCount||0) >= VILLAGE_MIN_PAGES) places.push(placeEntry(d.id, m));
  }
  places.sort((a,b)=>String(a.madeAt).localeCompare(String(b.madeAt)));
  const data={ storyCount:places.length, places, updatedAt:new Date().toISOString(), rule:'library-only' };
  try { await setDoc(doc(firestore,'users',uid,'village','progress'), data); } catch(e){ console.log('village cache notice:', e); }
  return data;
}

async function getVillageProgress(){
  if (!currentUser) return { storyCount:0, places:[] };
  return computeVillageProgress(currentUser.uid);
}

async function saveStory(book) {
  if (!currentUser) throw new Error('Google 로그인이 필요합니다.');
  const uid=currentUser.uid;
  const isNewStory=!book?.cloudId;
  const cloudId=makeCloudId(book);
  const storyRef=doc(firestore,'users',uid,'stories',cloudId);

  const meta=cleanForFirestore({ ...book, customBgm: undefined }); // 🎵 제작자 음악 파일은 이 기기에만
  delete meta.pages;
  meta.cloudId=cloudId;
  meta.ownerUid=uid;
  meta.updatedAt=new Date().toISOString();
  meta.pageCount=Array.isArray(book.pages)?book.pages.length:0;
  await setDoc(storyRef, meta, { merge:true });

  // 페이지와 이미지 조각은 별도 문서로 저장해 Firestore 1MiB 문서 제한을 피합니다.
  await clearStoryPages(uid, cloudId);
  const pages=Array.isArray(book.pages)?book.pages:[];
  for(let i=0;i<pages.length;i++){
    const p=pages[i] || {};
    const pageId=String(i+1).padStart(3,'0');
    const image=String(p.imageBase64 || '');
    const imageChunks=splitChunks(image);
    const pageData=cleanForFirestore({...p, imageBase64:undefined, aiVoice:undefined}); // 🎙️ 목소리는 용량이 커서 이 기기에만 저장
    pageData.pageIndex=i;
    pageData.imageChunkCount=imageChunks.length;
    await setDoc(doc(firestore,'users',uid,'stories',cloudId,'pages',pageId),pageData);

    // 이전 저장의 이미지 조각을 정리 후 새로 저장
    await clearCollection(['users',uid,'stories',cloudId,'pages',pageId,'imageChunks']);
    for(let c=0;c<imageChunks.length;c++){
      await setDoc(doc(firestore,'users',uid,'stories',cloudId,'pages',pageId,'imageChunks',String(c).padStart(3,'0')),{
        index:c, data:imageChunks[c]
      });
    }
  }
  book.cloudId=cloudId;

  // 🏡 마을 수는 getVillageProgress()가 서재를 보고 다시 셉니다.
  return { cloudId };
}

async function loadOneStory(storyDoc) {
  const uid=currentUser.uid;
  const cloudId=storyDoc.id;
  const meta=storyDoc.data() || {};
  const pageSnap=await getDocs(collection(firestore,'users',uid,'stories',cloudId,'pages'));
  const pageDocs=[...pageSnap.docs].sort((a,b)=>a.id.localeCompare(b.id));
  const pages=[];
  for(const pd of pageDocs){
    const p={...pd.data()};
    const chunksSnap=await getDocs(collection(firestore,'users',uid,'stories',cloudId,'pages',pd.id,'imageChunks'));
    const chunks=[...chunksSnap.docs].sort((a,b)=>a.id.localeCompare(b.id)).map(d=>d.data()?.data || '');
    p.imageBase64=chunks.join('');
    delete p.imageChunkCount; delete p.pageIndex;
    pages.push(p);
  }
  return {...meta, cloudId, userId:`firebase_${uid}`, pages};
}

async function loadStories() {
  if (!currentUser) return [];
  const snap=await getDocs(collection(firestore,'users',currentUser.uid,'stories'));
  const stories=[];
  for(const d of snap.docs) stories.push(await loadOneStory(d));
  return stories;
}

async function deleteStory(cloudId) {
  if (!currentUser || !cloudId) return;
  const uid=currentUser.uid;
  const pageSnap=await getDocs(collection(firestore,'users',uid,'stories',cloudId,'pages'));
  for(const pd of pageSnap.docs){
    await clearCollection(['users',uid,'stories',cloudId,'pages',pd.id,'imageChunks']);
    await deleteDoc(pd.ref);
  }
  await deleteDoc(doc(firestore,'users',uid,'stories',cloudId));
}

async function login(){
  return signInWithPopup(auth,provider);
}
async function logout(){ return signOut(auth); }
function getUser(){ return currentUser; }
async function getIdToken(){ return currentUser ? currentUser.getIdToken() : ''; }

// 🎁 무료체험 이용권 상태: 'available' | 'active' | 'used' | 'login'
async function getTrialStatus(){
  if (!currentUser) return { state:'login' };
  try {
    const snap = await getDoc(doc(firestore,'trials',currentUser.uid));
    if (!snap.exists()) return { state:'available' };
    const d = snap.data() || {};
    const created = d.createdAt?.toMillis ? d.createdAt.toMillis() : 0;
    const inWindow = Date.now() - created < 29 * 60 * 1000;
    const left = (d.textUsed || 0) < 3;
    return { state: inWindow && left ? 'active' : 'used', textUsed:d.textUsed||0, imagesUsed:d.imagesUsed||0 };
  } catch (e) {
    console.log('trial status notice:', e);
    return { state:'unknown' };
  }
}

window.EAIMCloud={login,logout,getUser,getIdToken,getTrialStatus,getVillageProgress,saveStory,loadStories,deleteStory};
onAuthStateChanged(auth,(user)=>{
  currentUser=user || null;
  window.dispatchEvent(new CustomEvent('eaim-auth-changed',{detail: currentUser ? {
    uid:currentUser.uid, displayName:currentUser.displayName, email:currentUser.email, photoURL:currentUser.photoURL
  } : null}));
});
