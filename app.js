
    const YAHOO_APP_ID = 'dmVyPTIwMjUwNyZpZD1QMDdkaFFITFh1Jmhhc2g9TVRKaE0yVXhNVGhsWVdFMlpqQXhPUQ';
   
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyQDfeKj_P9jjszJYyY7EBnq_VbetBGcnDPiyuKvaPPLRpJ2Hw2J5dOzkn-aKNb841N/exec';
    
    let hitLayer = null;
    let pointLayer = null;
    let currentEmail = '';
    let locationInfo = null;
    let lastSearchLatLng = null;

    const routeLineColor = '#01696f';

    const map = L.map('map');
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    map.setView([35.68, 139.76], 11);

    const els = {
  emailForm: document.getElementById('emailForm'),
  emailStatus: document.getElementById('emailStatus'),
  submitEmail: document.getElementById('submitEmail'),
  userEmail: document.getElementById('userEmail'),
  emailCard: document.getElementById('emailCard'),
  appBody: document.getElementById('appBody'),

  eventTypeField: document.getElementById('eventTypeField'),
  pageField: document.getElementById('pageField'),
  userAgentField: document.getElementById('userAgentField'),
  userLatField: document.getElementById('userLatField'),
  userLngField: document.getElementById('userLngField'),
  userAccuracyField: document.getElementById('userAccuracyField'),
  userAddressRawField: document.getElementById('userAddressRawField'),
  userAreaLabelField: document.getElementById('userAreaLabelField'),
  searchTypeField: document.getElementById('searchTypeField'),
  keywordField: document.getElementById('keywordField'),
  searchedLatField: document.getElementById('searchedLatField'),
  searchedLngField: document.getElementById('searchedLngField'),
  resultLabelField: document.getElementById('resultLabelField'),
  hitCountField: document.getElementById('hitCountField'),

  leadText: document.getElementById('leadText'),
  address: document.getElementById('address'),
  status: document.getElementById('status'),
  summary: document.getElementById('summary'),
  searchByAddress: document.getElementById('searchByAddress'),
  searchByCurrent: document.getElementById('searchByCurrent'),
  showAll: document.getElementById('showAll'),
  clearMap: document.getElementById('clearMap'),

  contactForm: document.getElementById('contactForm'),
  contactType: document.getElementById('contactType'),
  contactName: document.getElementById('contactName'),
  contactEmail: document.getElementById('contactEmail'),
  contactMessage: document.getElementById('contactMessage'),
    contactSubmit: document.getElementById('contactSubmit'),
  contactStatus: document.getElementById('contactStatus'),
  contactPage: document.getElementById('contactPage'),
  contactUserAgent: document.getElementById('contactUserAgent'),
  showEmailCard: document.getElementById('showEmailCard'),
  prefectureLinks: document.getElementById('prefectureLinks')
};

function updateCurrentLocationButtonUI() {
  const state = getGeoPermissionState();

  if (!els.searchByCurrent) return;

  if (state === 'granted') {
    els.searchByCurrent.textContent = '現在地で判定';
    els.searchByCurrent.title = '前回の位置情報許可が使える可能性があります';
  } else {
    els.searchByCurrent.textContent = '現在地で判定（位置情報許可）';
    els.searchByCurrent.title = '初回は位置情報の許可が必要です';
  }
}

function setEmailStatus(msg, ok = false) {
  els.emailStatus.className = ok ? 'result ok' : 'status';
  els.emailStatus.textContent = msg;
  els.emailStatus.classList.remove('hidden');
}

function saveLocationInfoLocally(info) {
  try {
    localStorage.setItem('savedLocationInfo', JSON.stringify(info || {}));
  } catch (e) {}
}

function getSavedLocationInfo() {
  try {
    const raw = localStorage.getItem('savedLocationInfo');
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function getCurrentPositionAsync() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('このブラウザでは現在地取得に対応していません。'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve(pos),
      () => reject(new Error('現在地を取得できませんでした。')),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

function saveGeoPermissionState(state) {
  try {
    localStorage.setItem('geoPermissionState', state);
  } catch (e) {}
}

function getGeoPermissionState() {
  try {
    return localStorage.getItem('geoPermissionState') || '';
  } catch (e) {
    return '';
  }
}

function getSavedEmail() {
  try {
    return localStorage.getItem('savedEmail') || '';
  } catch (e) {
    return '';
  }
}

function saveEmailLocally(email) {
  try {
    localStorage.setItem('savedEmail', email);
  } catch (e) {}
}

function saveLastMode(mode) {
  try {
    localStorage.setItem('lastJudgeMode', mode);
  } catch (e) {}
}

function getLastMode() {
  try {
    return localStorage.getItem('lastJudgeMode') || '';
  } catch (e) {
    return '';
  }
}

function isIphoneSafari() {
  const ua = navigator.userAgent || '';
  const isiPhone = /iPhone/.test(ua);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
  return isiPhone && isSafari;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const supportedPrefectures = ['東京都', '千葉県', '埼玉県', '群馬県', '神奈川県', '京都府'];

function isSupportedPrefecture(prefName) {
  return supportedPrefectures.includes(String(prefName || '').trim());
}

const prefectureGroups = [
  {
    label: '北海道・東北',
    items: ['北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県']
  },
  {
    label: '関東',
    items: ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県']
  },
  {
    label: '中部',
    items: ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県']
  },
  {
    label: '近畿',
    items: ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県']
  },
  {
    label: '中国・四国',
    items: ['鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県']
  },
  {
    label: '九州・沖縄',
    items: ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県']
  }
];

const prefectureOfficialLinks = {
  '栃木県': 'https://www.pref.tochigi.lg.jp/keisatu/n13/documents/20231129143357.pdf',
  '群馬県': 'https://www.pref.gunma.jp/uploaded/attachment/674320.pdf',
  '埼玉県': 'https://www.police.pref.saitama.lg.jp/documents/3506/r7koutuuyuudoukeibigyoumurosen.pdf',
  '千葉県': 'https://www.police.pref.chiba.jp/content/common/000012860.pdf',
  '東京都': 'https://www.keishicho.metro.tokyo.lg.jp/tetsuzuki/keibi/k_keibi/board.files/kotsu_keibi.pdf',
  '神奈川県': 'https://www.police.pref.kanagawa.jp/tetsuzuki/eigyokankei/keibi/mesd0094.html',
  '茨城県': 'https://www.pref.ibaraki.jp/kenkei/a06_shinsei/guard/work1704/documents/koujibunn.pdf',
  '京都府': 'https://www.pref.kyoto.jp/fukei/site/seiki_b/osirase/index.html'
};

function escapeHtml(text = '') {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getPrefButtonLabel(pref = '') {
  return String(pref).replace(/都|道|府|県$/, '');
}

function renderPrefectureLinks() {
  if (!els.prefectureLinks) return;

  const html = prefectureGroups.map(group => {
    const buttons = group.items.map(pref => {
      const supported = isSupportedPrefecture(pref);
      const url = prefectureOfficialLinks[pref] || '';
      const className = supported
        ? 'pref-btn pref-btn-supported'
        : 'pref-btn pref-btn-unsupported';

      if (url) {
        return `
          <a
            class="${className}"
            href="${escapeHtml(url)}"
            target="_blank"
            rel="noopener noreferrer"
            title="${escapeHtml(pref)} の案内ページを開く"
          >
            ${escapeHtml(getPrefButtonLabel(pref))}
          </a>
        `;
      }

      return `
        <button
          type="button"
          class="${className}"
          disabled
          title="${escapeHtml(pref)} はリンク未設定です"
        >
          ${escapeHtml(getPrefButtonLabel(pref))}
        </button>
      `;
    }).join('');

    return `
      <div class="pref-group">
        <div class="pref-group-label">${escapeHtml(group.label)}</div>
        <div class="pref-group-buttons">${buttons}</div>
      </div>
    `;
  }).join('');

  els.prefectureLinks.innerHTML = html;
}

function extractPrefectureFromText(text = '') {
  const m = String(text).match(/(東京都|北海道|京都府|大阪府|.{2,3}県)/);
  return m ? m[1] : '';
}

function extractPrefectureFromAddressElements(elements = []) {
  for (const el of elements) {
    const level = String(el.Level || '').trim().toLowerCase();
    const name = String(el.Name || '').trim();
    if (level === 'prefecture' && name) {
      return name;
    }
  }
  return '';
}

function extractPrefectureFromYahooFeature(feature) {
  const property = feature && feature.Property ? feature.Property : {};
  const elements = Array.isArray(property.AddressElement) ? property.AddressElement : [];
  const fromElements = extractPrefectureFromAddressElements(elements);
  if (fromElements) return fromElements;

  const address = property.Address || feature.Name || '';
  return extractPrefectureFromText(address);
}

async function getUserLocationInfo() {
  const pos = await getCurrentPositionAsync();
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracy = pos.coords.accuracy;
  let userAddressRaw = '';
  let userAreaLabel = '';

  try {
    const gsiData = await reverseGeocodeGsi(lat, lng);
    userAddressRaw = [gsiData.prefecture, gsiData.city, gsiData.townName]
      .filter(Boolean)
      .join('');
    userAreaLabel = gsiData.areaLabel || userAddressRaw;
  } catch (e) {}

  return {
    userLat: lat,
    userLng: lng,
    userAccuracy: accuracy,
    userAddressRaw,
    userAreaLabel
  };
}

async function postEmailLog(payload) {
  await fetch(WEB_APP_URL, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });
}

async function captureEmailWithLocation() {
  const email = els.userEmail.value.trim();
  if (!validateEmail(email)) throw new Error('メールアドレスを入力してください。');

  currentEmail = email;
  saveEmailLocally(email);

  setEmailStatus(`登録しています: ${email}`);
  els.leadText.textContent = '位置情報を取得しています。しばらくお待ちください。';
  els.appBody.classList.remove('hidden');
  els.emailCard.classList.add('hidden');
  updateCurrentLocationButtonUI();

  locationInfo = null;

  try {
    const info = await getUserLocationInfo();
    locationInfo = {
      lat: String(info.userLat ?? ''),
      lng: String(info.userLng ?? ''),
      accuracy: String(info.userAccuracy ?? ''),
      addressRaw: info.userAddressRaw ?? '',
      areaLabel: info.userAreaLabel ?? ''
    };
    saveLocationInfoLocally(locationInfo);
    saveGeoPermissionState('granted');
    setStatus('初期位置情報を取得しました。');
  } catch (e) {
    console.warn('location skipped', e);
    saveGeoPermissionState('failed');
    setStatus('位置情報の取得に時間がかかっています。');
  }

  try {
    await postEmailLog({
      eventType: 'email_capture',
      email,
      page: location.href,
      userAgent: navigator.userAgent,
      userLat: locationInfo?.lat || '',
      userLng: locationInfo?.lng || '',
      userAccuracy: locationInfo?.accuracy || '',
      userAddressRaw: locationInfo?.addressRaw || '',
      userAreaLabel: locationInfo?.areaLabel || '',
      searchType: '',
      keyword: '',
      searchedLat: '',
      searchedLng: '',
      resultLabel: '',
      hitCount: ''
    });
  } catch (e) {
    console.error('email log send failed', e);
  }

  setEmailStatus(`登録しました: ${email}`, true);
  els.leadText.textContent = '判定結果は参考情報です。必ず地図を確認のうえ、ご自身で判断してください。';
}

els.emailForm.addEventListener('submit', async function (e) {
  e.preventDefault();

  try {
    els.submitEmail.disabled = true;
    setEmailStatus('登録しています…');

    await captureEmailWithLocation();
  } catch (err) {
    setEmailStatus(err.message || 'メール登録に失敗しました。', false);
  } finally {
    els.submitEmail.disabled = false;
  }
});

async function logSearchAction({
  keyword = '',
  searchType = '',
  searchedLat = '',
  searchedLng = '',
  hitCount = '',
  resultLabel = ''
}) {
  const email = currentEmail || els.userEmail.value.trim();
  if (!validateEmail(email)) return;

  const payload = {
    eventType: 'search',
    email,
    page: location.href,
    keyword,
    searchType,
    searchedLat: String(searchedLat ?? ''),
    searchedLng: String(searchedLng ?? ''),
    hitCount: String(hitCount ?? ''),
    resultLabel,
    userAgent: navigator.userAgent,
    userLat: locationInfo?.lat || '',
    userLng: locationInfo?.lng || '',
    userAccuracy: locationInfo?.accuracy || '',
    userAddressRaw: locationInfo?.addressRaw || '',
    userAreaLabel: locationInfo?.areaLabel || ''
  };

  console.log('search payload =', payload);

  try {
    await postEmailLog(payload);
  } catch (e) {
    console.warn('search log send failed', e);
  }
}

function setStatus(msg) {
  els.status.textContent = msg;
}

    function setSummary(msg, ok) {
      els.summary.className = `result ${ok ? 'ok' : 'ng'}`;
      els.summary.textContent = msg;
    }

    function setContactStatus(msg, ok) {
      els.contactStatus.className = `result ${ok ? 'ok' : 'ng'}`;
      els.contactStatus.textContent = msg;
    }

    function validateContactForm() {
      const type = els.contactType.value.trim();
      const name = els.contactName.value.trim();
      const email = els.contactEmail.value.trim();
      const message = els.contactMessage.value.trim();

      if (!type) throw new Error('問い合わせ種別を選択してください。');
      if (!name) throw new Error('氏名を入力してください。');
      if (!email) throw new Error('メールアドレスを入力してください。');
      if (!message) throw new Error('内容を入力してください。');
    }

function pick(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return v;
    }
  }
  return '';
}

function getMatchedRouteLabel(matched = {}) {
  const commonName = String(matched.common_name || '').trim();
  const displayName = String(matched.display_name || '').trim();
  const officialRouteName = String(matched.official_route_name || '').trim();
  const routeType = String(matched.route_type || '').trim();
  const routeNo = String(matched.route_no || '').trim();

  if (commonName) return commonName;
  if (displayName) return displayName;
  if (officialRouteName) return officialRouteName;
  if (routeType && routeNo) return `${routeType}${routeNo}号`;
  if (routeNo) return `路線 ${routeNo}`;
  return '路線名不明';
}

function applyJudgeResult(data, displayLabel) {
  if (data.hit) {
    const name = getMatchedRouteLabel(data.matched);
    setSummary(`${displayLabel}\n路線: ${name}`, true);
    setStatus('判定完了：一致');
    renderMatchedFeature(data.matched_feature || null);
  } else if (data.nearest) {
    const nearName = getMatchedRouteLabel(data.nearest);
    setSummary(
      `${displayLabel}\n路線: 該当なし\n参考路線: ${nearName}（約${data.nearest.distance_m}m）`,
      false
    );
    setStatus('判定完了：一致なし');
    renderMatchedFeature(data.nearest_feature || null);
  } else {
    setSummary(`${displayLabel}\n路線: 該当なし`, false);
    setStatus('判定完了：一致なし');
    renderMatchedFeature(null);
  }
}

function normalizeProps(src = {}) {
  const masterId = pick(
    src.masterid,
    src.masterId,
    src.master_id,
    src.MASTERID
  );

  const routeMatch = masterId ? String(masterId).match(/-(\d+)-/) : null;

  const routeNo = pick(
    src.routeno,
    src.routeNo,
    src.route_no,
    src.ROUTENO,
    routeMatch ? routeMatch[1] : ''
  );

  const displayName = pick(
    src.official_route_name,
    src.officialroutename,
    src.officialRouteName,
    src.display_name,
    src.displayname,
    src.displayName,
    src.common_name,
    src.commonname,
    src.commonName,
    routeNo ? `路線 ${routeNo}` : '',
    masterId
  );

  const geometryType = String(
    pick(
      src.geometrytype,
      src.geometryType,
      src.geometry_type
    )
  ).toUpperCase();

  const bufferM = pick(
    src.bufferm,
    src.bufferM,
    src.buffer_m
  );

  return {
    masterId: masterId || (routeNo ? `ROUTE-${routeNo}` : ''),
    routeNo,
    displayName: displayName || '路線名未設定',
    geometryType,
    bufferM
  };
}

function getGeometryBoundsSummary(feature) {
  try {
    if (!feature || !feature.geometry || !feature.geometry.coordinates) return null;

    const coords = [];
    const walk = arr => {
      if (!Array.isArray(arr)) return;
      if (
        arr.length >= 2 &&
        typeof arr[0] === 'number' &&
        typeof arr[1] === 'number'
      ) {
        coords.push(arr);
        return;
      }
      for (const x of arr) walk(x);
    };
    walk(feature.geometry.coordinates);

    if (!coords.length) return { count: 0 };

    let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;

    for (const pair of coords) {
      const lng = Number(pair[0]);
      const lat = Number(pair[1]);
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) continue;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }

    return {
      count: coords.length,
      minLng,
      maxLng,
      minLat,
      maxLat,
      sample: coords.slice(0, 5)
    };
  } catch (e) {
    return { error: e.message };
  }
}

    function styleForFeature(feature, hit = false) {
  const p = normalizeProps(feature && feature.properties ? feature.properties : {});
  const gt = String(
    ((feature && feature.geometry && feature.geometry.type) || p.geometryType || '')
  ).toUpperCase();

  const bufferM = String(p.bufferM || '').trim();
  const is100mBuffer = bufferM === '100';

  if (gt.includes('POLYGON')) {
    if (!is100mBuffer) {
      return {
        stroke: false,
        fill: false,
        opacity: 0,
        fillOpacity: 0
      };
    }

    return {
      stroke: true,
      color: routeLineColor,
      weight: hit ? 3 : 2,
      opacity: hit ? 0.9 : 0.6,
      fill: true,
      fillColor: '#2563eb',
      fillOpacity: hit ? 0.18 : 0.10
    };
  }

  if (gt.includes('LINE')) {
    return {
      color: routeLineColor,
      weight: hit ? 4 : 2,
      opacity: hit ? 0.95 : 0.45
    };
  }

  return {
    stroke: false,
    fill: false,
    opacity: 0,
    fillOpacity: 0
  };
}

function renderMatchedFeature(feature) {
  if (hitLayer) {
    map.removeLayer(hitLayer);
    hitLayer = null;
  }

  if (!feature || !feature.geometry) return;

  const normalized = normalizeProps(feature.properties || {});
  const geometryType = String(
    ((feature.geometry && feature.geometry.type) || normalized.geometryType || '')
  ).toUpperCase();

  const isPolygon = geometryType.includes('POLYGON');
  const isLine = geometryType.includes('LINE');
  const is100mBuffer = String(normalized.bufferM || '').trim() === '100';

  console.log('render geometryType =', geometryType);
console.log('render bufferM =', normalized.bufferM);
console.log('render feature props =', feature.properties);
console.log('geometry coordinates sample =', feature?.geometry?.coordinates);
console.log('boundsInfo =', getGeometryBoundsSummary(feature));

  if (isPolygon && !is100mBuffer) {
    console.warn('skip polygon because not 100m buffer', feature);
    return;
  }

  if (!isPolygon && !isLine) {
    console.warn('skip drawing unsupported geometry type', geometryType, feature);
    return;
  }

  hitLayer = L.geoJSON(feature, {
    interactive: false,
    style: f => styleForFeature(f, true)
  }).addTo(map);

  if (hitLayer && hitLayer.eachLayer) {
    hitLayer.eachLayer(layer => {
      if (layer.bringToBack) {
        layer.bringToBack();
      }
    });
  }

  if (pointLayer && pointLayer.bringToFront) {
    pointLayer.bringToFront();
  }
}

function clearHitLayers() {
  if (hitLayer) {
    map.removeLayer(hitLayer);
    hitLayer = null;
  }

  if (pointLayer) {
    map.removeLayer(pointLayer);
    pointLayer = null;
  }
}


    function geocodeAddressYahoo(address) {
      return new Promise((resolve, reject) => {
        const cb = 'yahooGeoCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
        const script = document.createElement('script');

        window[cb] = data => {
          cleanup();
          const info = data && data.ResultInfo ? data.ResultInfo : null;
const feature = data && data.Feature && data.Feature[0] ? data.Feature[0] : null;
          if (!info || info.Status !== 200 || !feature) {
            return reject(new Error('住所を特定できませんでした。'));
          }
          resolve(feature);
        };

        function cleanup() {
          if (script.parentNode) script.parentNode.removeChild(script);
          delete window[cb];
        }

        script.onerror = () => {
          cleanup();
          reject(new Error('Yahoo!ジオコーダの取得に失敗しました。'));
        };

        script.src = `https://map.yahooapis.jp/geocode/V1/geoCoder?appid=${encodeURIComponent(YAHOO_APP_ID)}&query=${encodeURIComponent(address)}&output=json&callback=${encodeURIComponent(cb)}`;
        document.body.appendChild(script);
      });
    }

    function parseYahooCoordinates(feature) {
      const coordinates = feature && feature.Geometry ? feature.Geometry.Coordinates : '';
      if (!coordinates) throw new Error('座標が取得できませんでした。');
      const parts = coordinates.split(',');
      if (parts.length !== 2) throw new Error('座標形式が不正です。');
      const lng = Number(parts[0]);
      const lat = Number(parts[1]);
      if (Number.isNaN(lat) || Number.isNaN(lng)) throw new Error('座標変換に失敗しました。');
      return { lat, lng };
    }

function normalizeSearchText(s = '') {
  return String(s)
    .trim()
    .replace(/\s+/g, '')
    .replace(/[　]/g, '')
    .replace(/（.*?）/g, '')
    .replace(/\(.*?\)/g, '')
    .toLowerCase();
}

function pickBestPlaceFeature(features, keyword) {
  if (!Array.isArray(features) || !features.length) return null;

  const q = normalizeSearchText(keyword);

  const scored = features.map((f, index) => {
    const name = normalizeSearchText(f?.Name || '');
    const address = normalizeSearchText(f?.Property?.Address || '');
    const station = normalizeSearchText(f?.Property?.Station || '');
    let score = 0;

    if (name === q) score += 100;
    if (name.startsWith(q)) score += 80;
    if (name.includes(q)) score += 60;
    if (address.includes(q)) score += 30;
    if (station.includes(q)) score += 20;

    if (q.endsWith('駅') && name.endsWith('駅')) score += 25;
    if (q.includes('中学校') && name.includes('中学校')) score += 25;
    if (q.includes('小学校') && name.includes('小学校')) score += 25;
    if (q.includes('高校') && name.includes('高校')) score += 25;
    if (q.includes('大学') && name.includes('大学')) score += 25;
    if (q.includes('川') && (name.includes('川') || address.includes('川'))) score += 20;
    if (q.includes('橋') && (name.includes('橋') || address.includes('橋'))) score += 20;

    if (!name) score -= 20;

    return {
      feature: f,
      score,
      index,
      debug: {
        name: f?.Name || '',
        address: f?.Property?.Address || ''
      }
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.index - b.index;
  });

  console.log('local search scored candidates =', scored);

  return scored[0]?.feature || null;
}

   function searchPlaceYahoo(keyword) {
  return new Promise((resolve, reject) => {
    const cb = 'yahooLocalSearchCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const script = document.createElement('script');

    window[cb] = data => {
      cleanup();

      const features = Array.isArray(data?.Feature) ? data.Feature : [];
      console.log('local search raw features =', features);

      if (!features.length) {
        return reject(new Error('駅名・施設名・キーワードから場所を特定できませんでした。'));
      }

      const picked = pickBestPlaceFeature(features, keyword);

      if (!picked) {
        return reject(new Error('候補から場所を特定できませんでした。'));
      }

      console.log('local search picked feature =', picked);
      resolve(picked);
    };

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[cb];
    }

    script.onerror = () => {
      cleanup();
      reject(new Error('キーワード検索の取得に失敗しました。'));
    };

    script.src =
      `https://map.yahooapis.jp/search/local/V1/localSearch?appid=${encodeURIComponent(YAHOO_APP_ID)}&query=${encodeURIComponent(keyword)}&results=10&output=json&callback=${encodeURIComponent(cb)}`;

    document.body.appendChild(script);
  });
}

function parseYahooPlaceCoordinates(feature) {
  const coordinates = feature && feature.Geometry ? feature.Geometry.Coordinates : '';
  if (!coordinates) throw new Error('場所の座標が取得できませんでした。');

  const parts = coordinates.split(',');
  if (parts.length !== 2) throw new Error('場所の座標形式が不正です。');

  const lng = Number(parts[0]);
  const lat = Number(parts[1]);

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error('場所の座標変換に失敗しました。');
  }

  return { lat, lng };
}

async function reverseGeocodeGsi(lat, lng) {
  const url = `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('現在地の住所情報を取得できませんでした。');
  }

  const data = await res.json();
  const results = data && data.results;
  if (!results) {
    throw new Error('現在地の住所情報が見つかりませんでした。');
  }

  const townName = (results.lv01Nm || '').trim();
  const muniCd = String(results.muniCd || '');
  const muniKey = String(Number(muniCd));
  const muniRaw =
  window.GSI &&
  (window.GSI.MUNI_ARRAY || window.GSI.MUNIARRAY) &&
  (window.GSI.MUNI_ARRAY || window.GSI.MUNIARRAY)[muniKey]
    ? (window.GSI.MUNI_ARRAY || window.GSI.MUNIARRAY)[muniKey]
    : '';

  let prefecture = '';
  let city = '';

  if (muniRaw) {
    const parts = muniRaw.split(',');
    prefecture = (parts[1] || '').trim();
    city = (parts[3] || '').replace(/\s+/g, '');
  }

  const baseLabel = [prefecture, city, townName].filter(Boolean).join('') || '現在地';
const areaLabel = baseLabel;  // ← ここを変更（もともとは `${baseLabel}付近`）

  return {
    raw: results,
    prefecture,
    city,
    townName,
    areaLabel
  };
}

function reverseGeocodeYahoo(lat, lng) {
  return new Promise((resolve, reject) => {
    const cb = 'yahooReverseGeoCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const script = document.createElement('script');

    window[cb] = data => {
      cleanup();

      const feature = data && data.Feature && data.Feature[0] ? data.Feature[0] : null;
      if (!feature) {
        return reject(new Error('現在地の住所を取得できませんでした。'));
      }

      const property = feature.Property || {};
      const elements = Array.isArray(property.AddressElement) ? property.AddressElement : [];

      let prefecture = '';
let city = '';
let town = '';
let chome = '';

for (let i = 0; i < elements.length; i++) {
  const el = elements[i] || {};
  const name = (el.Name || '').trim();
  const level = String(el.Level || '').trim().toLowerCase();

  if (!name) continue;

  if (level === 'prefecture' && !prefecture) {
    prefecture = name;
  } else if (level === 'city' && !city) {
    city = name;
  } else if ((level === 'oaza' || level === 'aza') && !town) {
    town = name;
  } else if (
  (level === 'detail1' || level === 'chome' || level === 'block' || level === 'go' || level === 'kyoten') &&
  !chome
) {
  chome = name;
}
}

      const builtAddress = [prefecture, city, town, chome].filter(Boolean).join('');
// ここを少し変える
const fallback = property.Address || feature.Name || '';
const address = builtAddress || fallback;

if (!address) {
  return reject(new Error('現在地の住所文字列を取得できませんでした。'));
}

      resolve({
        raw: feature,
        address: address
      });
    };

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[cb];
    }

    script.onerror = () => {
      cleanup();
      reject(new Error('Yahoo!リバースジオコーダの取得に失敗しました。'));
    };

    script.src =
      'https://map.yahooapis.jp/geoapi/V1/reverseGeoCoder'
      + '?appid=' + encodeURIComponent(YAHOO_APP_ID)
      + '&lat=' + encodeURIComponent(lat)
      + '&lon=' + encodeURIComponent(lng)
      + '&output=json'
      + '&callback=' + encodeURIComponent(cb);

    document.body.appendChild(script);
  });
}

function searchNearbyYahoo(lat, lng, dist = 50) {
  return new Promise((resolve, reject) => {
    const cb = 'yahooNearbyCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const script = document.createElement('script');

    window[cb] = data => {
      cleanup();
      const features = data && data.Feature ? data.Feature : [];
      resolve(Array.isArray(features) ? features : []);
    };

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[cb];
    }

    script.onerror = () => {
      cleanup();
      reject(new Error('周辺施設検索の取得に失敗しました。'));
    };

    script.src =
      `https://map.yahooapis.jp/search/local/V1/localSearch?appid=${encodeURIComponent(YAHOO_APP_ID)}&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&dist=${encodeURIComponent(dist)}&results=5&output=json&callback=${encodeURIComponent(cb)}`;

    document.body.appendChild(script);
  });
}

async function judgeByApi(lat, lng) {
  const res = await fetch(
    'https://secure02.blue.shared-server.net/www.sesim.co.jp/judge.php',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ lat, lng })
    }
  );

  let data = null;

  try {
    data = await res.json();
  } catch (e) {
    throw new Error('APIの応答がJSONではありません。');
  }

  if (!res.ok) {
    throw new Error(data?.message || 'API判定に失敗しました。');
  }

  return data;
}

async function runByCurrentLocation(options = {}) {
  const forceRefresh = !!options.forceRefresh;
  saveLastMode('current');

  setStatus('現在地を取得しています...');

  const currentPos = await getCurrentPositionAsync();
  const lat = currentPos.coords.latitude;
  const lng = currentPos.coords.longitude;
  const accuracy = currentPos.coords.accuracy;

    let areaLabel = `現在地付近（精度 約${Math.round(accuracy)}m）`;
  let prefecture = '';

  try {
    const rev = await reverseGeocodeGsi(lat, lng);
    prefecture = rev.prefecture || '';
    if (rev.areaLabel) {
      areaLabel = `${rev.areaLabel}付近（現在地判定／精度 約${Math.round(accuracy)}m）`;
    }
  } catch (gsiErr) {
    console.warn('GSI reverse geocode failed', gsiErr);
  }

  locationInfo = {
    lat: String(lat ?? ''),
    lng: String(lng ?? ''),
    accuracy: String(accuracy ?? ''),
    addressRaw: '',
    areaLabel: areaLabel
  };

    saveLocationInfoLocally(locationInfo);
  saveGeoPermissionState('granted');

  clearHitLayers();

  pointLayer = L.circleMarker([lat, lng], {
    radius: 18,
    color: '#ffffff',
    weight: 2,
    fillColor: '#b42318',
    fillOpacity: 1
  }).bindPopup(`現在地<br>${areaLabel}`).addTo(map);

  map.setView([lat, lng], 11);
  lastSearchLatLng = [lat, lng];

  if (prefecture && !isSupportedPrefecture(prefecture)) {
    setSummary(`${prefecture}はまだ判定対象外です。`, false);
    setStatus('判定対象外');

    logSearchAction({
      searchType: forceRefresh ? 'current_refresh_unsupported' : 'current_unsupported',
      keyword: 'CURRENT_LOCATION',
      searchedLat: lat,
      searchedLng: lng,
      resultLabel: prefecture,
      hitCount: 0
    }).catch(err => console.warn('logSearchAction failed', err));

    return;
  }

  setStatus('APIで判定しています...');

  const data = await judgeByApi(lat, lng);

console.log('matched feature full =', JSON.stringify(data?.matched_feature, null, 2));
console.log('matched feature bounds check =', getGeometryBoundsSummary(data?.matched_feature));

console.log('judge response =', data);
console.log('matched geometry type =', data?.debug_matched_geometry_type);
console.log('matched buffer =', data?.debug_matched_buffer_m);
console.log('matched feature =', data?.matched_feature);
console.log('nearest feature =', data?.nearest_feature);

const zoom = data.hit ? 19 : data.nearest ? 17 : 16;
map.setView([lat, lng], zoom);

applyJudgeResult(data, areaLabel);

logSearchAction({
  searchType: forceRefresh ? 'current_refresh' : 'current',
  keyword: 'CURRENT_LOCATION',
  searchedLat: lat,
  searchedLng: lng,
  resultLabel: areaLabel,
  hitCount: data.hit ? 1 : 0
}).catch(err => console.warn('logSearchAction failed', err));
}

async function runBySavedLocation(savedLocationInfo = null) {
  saveLastMode('current');

  const saved = savedLocationInfo || getSavedLocationInfo();
  if (!saved || !saved.lat || !saved.lng) {
    throw new Error('保存済み位置情報がありません。');
  }

  const lat = Number(saved.lat);
  const lng = Number(saved.lng);

  let displayLabel = saved.areaLabel || saved.addressRaw || '現在地';
  let prefecture = '';

  try {
    const rev = await reverseGeocodeGsi(lat, lng);
    prefecture = rev.prefecture || '';
    if (rev.areaLabel) {
      displayLabel = rev.areaLabel;
    }
  } catch (gsiErr) {
    console.warn('GSI reverse geocode failed (saved)', gsiErr);
  }

  locationInfo = {
    lat: String(saved.lat || ''),
    lng: String(saved.lng || ''),
    accuracy: String(saved.accuracy || ''),
    addressRaw: saved.addressRaw || '',
    areaLabel: displayLabel || ''
  };

  lastSearchLatLng = [lat, lng];

  clearHitLayers();

  pointLayer = L.circleMarker([lat, lng], {
    radius: 18,
    color: '#ffffff',
    weight: 2,
    fillColor: '#b42318',
    fillOpacity: 1
  }).bindPopup(`現在地<br>${displayLabel}`).addTo(map);

  map.setView([lat, lng], 11);

  if (prefecture && !isSupportedPrefecture(prefecture)) {
    setSummary(`${prefecture}はまだ判定対象外です。`, false);
    setStatus('判定対象外');

    logSearchAction({
      searchType: 'current_saved_unsupported',
      keyword: 'SAVED_LOCATION',
      searchedLat: lat,
      searchedLng: lng,
      resultLabel: prefecture,
      hitCount: 0
    }).catch(err => console.warn('logSearchAction failed', err));

    return;
  }

  setStatus('APIで判定しています...');

  const data = await judgeByApi(lat, lng);

console.log('judge response =', data);
console.log('matched geometry type =', data?.debug_matched_geometry_type);
console.log('matched buffer =', data?.debug_matched_buffer_m);
console.log('matched feature =', data?.matched_feature);
console.log('nearest feature =', data?.nearest_feature);

  const zoom = data.hit ? 19 : data.nearest ? 17 : 16;
  map.setView([lat, lng], zoom);

  applyJudgeResult(data, displayLabel);

  logSearchAction({
    searchType: 'current_saved',
    keyword: 'SAVED_LOCATION',
    searchedLat: lat,
    searchedLng: lng,
    resultLabel: displayLabel,
    hitCount: data.hit ? 1 : 0
  }).catch(err => console.warn('logSearchAction failed', err));
}

    async function runByAddress() {
  const keyword = els.address.value.trim();
  if (!keyword) throw new Error('住所・駅名・施設名・学校名・川などのキーワードを入力してください。');

  saveLastMode('address');
  setStatus('場所を検索しています...');

  let lat, lng, display, prefecture = '';
  let foundFeature = null;
  let resolvedBy = '';

  try {
    const feature = await geocodeAddressYahoo(keyword);
    foundFeature = feature;
    resolvedBy = 'geocoder';
    ({ lat, lng } = parseYahooCoordinates(feature));
    display =
      (feature && feature.Property ? feature.Property.Address : '') ||
      (feature ? feature.Name : '') ||
      keyword;
    prefecture = extractPrefectureFromYahooFeature(feature);
  } catch (addressErr) {
    console.warn('geocodeAddressYahoo failed, fallback to localSearch', addressErr);

    const placeFeature = await searchPlaceYahoo(keyword);
    foundFeature = placeFeature;
    resolvedBy = 'localSearch';
    ({ lat, lng } = parseYahooPlaceCoordinates(placeFeature));
    display =
      (placeFeature && placeFeature.Name ? placeFeature.Name : '') ||
      (placeFeature && placeFeature.Property ? placeFeature.Property.Address : '') ||
      keyword;
    prefecture = extractPrefectureFromYahooFeature(placeFeature);
  }

  console.log('runByAddress resolvedBy =', resolvedBy);
  console.log('runByAddress foundFeature =', foundFeature);

  lastSearchLatLng = [lat, lng];

  clearHitLayers();

  pointLayer = L.circleMarker([lat, lng], {
    radius: 18,
    color: '#ffffff',
    weight: 2,
    fillColor: '#b42318',
    fillOpacity: 1
  }).bindPopup(`検索地点<br>${display}`).addTo(map);

  map.setView([lat, lng], 11);

  if (prefecture && !isSupportedPrefecture(prefecture)) {
    setSummary(`${display}\n${prefecture}はまだ判定対象外です。`, false);
    setStatus('判定対象外');

    logSearchAction({
      searchType: resolvedBy === 'geocoder' ? 'address_unsupported' : 'keyword_unsupported',
      keyword,
      searchedLat: String(lat),
      searchedLng: String(lng),
      resultLabel: `${display} / ${prefecture}`,
      hitCount: 0
    }).catch(err => console.warn('logSearchAction failed', err));

    return;
  }

  setStatus('APIで判定しています...');

  const data = await judgeByApi(lat, lng);

  console.log('matched feature full =', JSON.stringify(data?.matched_feature, null, 2));
  console.log('matched feature bounds check =', getGeometryBoundsSummary(data?.matched_feature));
  console.log('judge response =', data);
  console.log('matched geometry type =', data?.debug_matched_geometry_type);
  console.log('matched buffer =', data?.debug_matched_buffer_m);
  console.log('matched feature =', data?.matched_feature);
  console.log('nearest feature =', data?.nearest_feature);

  const zoom = data.hit ? 19 : data.nearest ? 17 : 16;
  map.setView([lat, lng], zoom);

  applyJudgeResult(data, display);

  logSearchAction({
    searchType: resolvedBy === 'geocoder' ? 'address' : 'keyword',
    keyword,
    searchedLat: String(lat),
    searchedLng: String(lng),
    resultLabel: display,
    hitCount: data.hit ? 1 : 0
  }).catch(err => console.warn('logSearchAction failed', err));
}

let clickAddressMarker = null;

map.on('click', async function (e) {
  const lat = e.latlng.lat;
  const lng = e.latlng.lng;

  setStatus('クリック地点の住所を取得しています...');

  let addressText = '';

  try {
    try {
      const revYahoo = await reverseGeocodeYahoo(lat, lng);
      addressText = revYahoo.address || '';
    } catch (errYahoo) {
      console.warn('Yahoo reverse failed', errYahoo);
    }

    if (!addressText) {
      try {
        const revGsi = await reverseGeocodeGsi(lat, lng);
        addressText =
          [revGsi.prefecture, revGsi.city, revGsi.townName].filter(Boolean).join('') ||
          revGsi.areaLabel ||
          '';
      } catch (errGsi) {
        console.warn('GSI reverse failed', errGsi);
      }
    }

    if (!addressText) {
      addressText = '住所を取得できませんでした。';
    }

    if (clickAddressMarker) {
      map.removeLayer(clickAddressMarker);
    }

    clickAddressMarker = L.marker([lat, lng]).addTo(map);
clickAddressMarker.bindPopup(
  `<strong>クリック地点</strong><br>` +
  `<span style="font-size:12px;color:#666;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span><br><br>` +
  `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer">Googleマップで開く</a><br>` +
  `<a href="https://map.yahoo.co.jp/place?lat=${lat}&lon=${lng}" target="_blank" rel="noopener noreferrer">Yahoo!マップで開く</a>`
).openPopup();

    setStatus('クリック地点の住所を表示しました。');
  } catch (err) {
    console.error('click reverse failed', err);

    if (clickAddressMarker) {
      map.removeLayer(clickAddressMarker);
    }

    clickAddressMarker = L.marker([lat, lng]).addTo(map);
    clickAddressMarker.bindPopup(
      `<strong>クリック地点</strong><br>` +
      `住所を取得できませんでした。<br>` +
      `<span style="font-size:12px;color:#666;">${lat.toFixed(6)}, ${lng.toFixed(6)}</span><br><br>` +
      `<a href="https://www.google.com/maps?q=${lat},${lng}" target="_blank" rel="noopener noreferrer">Googleマップで開く</a><br>` +
      `<a href="https://map.yahoo.co.jp/place?lat=${lat}&lon=${lng}" target="_blank" rel="noopener noreferrer">Yahoo!マップで開く</a>`
    ).openPopup();

    setStatus('クリック地点の住所を取得できませんでした。');
  }
});

els.searchByAddress.addEventListener('click', async () => {
  try {
    await runByAddress();
  } catch (e) {
    setSummary(e.message, false);
    setStatus('エラー');
  }
});

    els.searchByCurrent.addEventListener('click', async () => {
  try {
    await runByCurrentLocation();
    updateCurrentLocationButtonUI();
  } catch (e) {
    saveGeoPermissionState('failed');
    updateCurrentLocationButtonUI();

    if (isIphoneSafari()) {
      setSummary(
        '現在地を取得できませんでした。\niPhone の「設定」アプリまたは Safari の「Webサイトの設定」で、このページの位置情報を許可してから、もう一度お試しください。',
        false
      );
    } else {
      setSummary(e.message || '現在地を取得できませんでした。', false);
    }

    setStatus('エラー');
  }
});

   els.clearMap.addEventListener('click', () => {
  clearHitLayers();
  els.address.value = '';
  setSummary('まだ判定していません。', false);
  setStatus('クリアしました。');
  map.setView([35.68, 139.76], 11);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

if (els.showEmailCard) {
  els.showEmailCard.addEventListener('click', () => {
    els.appBody.classList.add('hidden');
    els.emailCard.classList.remove('hidden');

    const sidebar = document.querySelector('.sidebar');
    if (sidebar && els.emailCard) {
      sidebar.prepend(els.emailCard);
      sidebar.scrollTop = 0;
    }

    setEmailStatus('メールアドレスを確認または再登録してください。', true);

    setTimeout(() => {
      if (els.userEmail) {
        els.userEmail.focus();
      }
    }, 100);
  });
}

function applyInitialView() {
console.log('applyInitialView savedEmail =', getSavedEmail());
console.log('applyInitialView savedLocationInfo =', getSavedLocationInfo());

  const savedEmail = getSavedEmail();
  const savedLocationInfo = getSavedLocationInfo();
  const hasSavedEmail = !!savedEmail;

  if (hasSavedEmail) {
    els.userEmail.value = savedEmail;
    currentEmail = savedEmail;

    if (savedLocationInfo) {
      locationInfo = {
        lat: String(savedLocationInfo.lat || ''),
        lng: String(savedLocationInfo.lng || ''),
        accuracy: String(savedLocationInfo.accuracy || ''),
        addressRaw: savedLocationInfo.addressRaw || '',
        areaLabel: savedLocationInfo.areaLabel || ''
      };
    } else {
      locationInfo = null;
    }

    setEmailStatus('保存済みメールアドレスを読み込みました。', true);
    els.leadText.textContent = '判定結果は参考情報です。必ず地図を確認のうえ、ご自身で判断してください。';
    els.appBody.classList.remove('hidden');
    els.emailCard.classList.add('hidden');

    console.log('emailCard class =', els.emailCard.className);
    console.log('appBody class =', els.appBody.className);
    return true;
  }

  locationInfo = null;
  currentEmail = '';
  els.appBody.classList.add('hidden');
  els.emailCard.classList.remove('hidden');
  setEmailStatus('最初にメールアドレスを登録してください。', false);
  return false;
}

const hasSavedUser = applyInitialView();

async function tryAutoRunCurrentAfterReload() {
  return; // ← いったん即returnさせる
  const lastMode = getLastMode();
  if (lastMode !== 'current') return;
  if (!currentEmail) return;
  if (els.appBody.classList.contains('hidden')) return;

  const savedLocationInfo = getSavedLocationInfo();
  if (!savedLocationInfo || !savedLocationInfo.lat || !savedLocationInfo.lng) {
    setStatus('保存済み位置情報がないため、自動判定は行いません。');
    return;
  }

  try {
    await runBySavedLocation(savedLocationInfo);
  } catch (e) {
    setStatus('保存済み位置での自動判定はできませんでした。');
    setSummary(
      '保存済み位置情報での自動判定に失敗しました。\n必要な場合だけ「現在地で判定」を押してください。',
      false
    );
  }
}

updateCurrentLocationButtonUI();

if (els.showAll) {
  els.showAll.addEventListener('click', () => {
    if (lastSearchLatLng) {
      map.setView(lastSearchLatLng, 14);
      setStatus('検索地点を中心に広く表示しました。');
    } else {
      map.setView([35.68, 139.76], 11);
      setStatus('広く表示する対象がないため、初期表示に戻しました。');
    }
  });
}

function init() {
  map.setView([35.68, 139.76], 11);

renderPrefectureLinks();

  if (!els.appBody.classList.contains('hidden')) {
    setStatus('住所または現在地から判定してください。');
    setSummary('まだ判定していません。', false);
  }
}

init();

if (hasSavedUser) {
  tryAutoRunCurrentAfterReload();
}

setTimeout(() => {
  map.invalidateSize();
}, 300);

window.addEventListener('load', () => {
  map.invalidateSize();
});

window.addEventListener('resize', () => {
  map.invalidateSize();
});

console.log('savedEmail =', getSavedEmail());
console.log('savedLocationInfo =', getSavedLocationInfo());
console.log('current href =', location.href);

