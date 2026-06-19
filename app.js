
    const YAHOO_APP_ID = 'dmVyPTIwMjUwNyZpZD1QMDdkaFFITFh1Jmhhc2g9TVRKaE0yVXhNVGhsWVdFMlpqQXhPUQ';
    const GEOJSON_FILES = [
  './routes_from_geojson5_100m.geojson',
  './routes_chiba_geojson5_100m.geojson'
];
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbyQDfeKj_P9jjszJYyY7EBnq_VbetBGcnDPiyuKvaPPLRpJ2Hw2J5dOzkn-aKNb841N/exec';
    

    let routeGeojson = null;
    let allLayer = null;
    let hitLayer = null;
    let pointLayer = null;
    let currentEmail = '';
    let locationInfo = null;
    let lastSearchLatLng = null;

    const routeColors = {
      polygon: '#e8891c',
      line: '#01696f'
    };

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
  showEmailCard: document.getElementById('showEmailCard')
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
  } catch (e) {
    console.warn('location skipped', e);
    saveGeoPermissionState('failed');
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

  saveEmailLocally(email);
  els.eventTypeField.value = 'email_capture';
  setEmailStatus(`登録しました: ${email}`, true);
  els.leadText.textContent = '判定結果は参考情報です。必ず地図を確認のうえ、ご自身で判断してください。';
  els.appBody.classList.remove('hidden');
  els.emailCard.classList.add('hidden');
  updateCurrentLocationButtonUI();
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
  await postEmailLog(payload);
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

    async function loadGeojson() {
  if (routeGeojson) return routeGeojson;

  const collections = await Promise.all(
    GEOJSON_FILES.map(async (file) => {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`GeoJSON読込失敗: ${file}`);
      return await res.json();
    })
  );

  routeGeojson = {
    type: 'FeatureCollection',
    features: collections.flatMap(c => Array.isArray(c.features) ? c.features : [])
  };

  return routeGeojson;
}

function pick(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      return v;
    }
  }
  return '';
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

    function styleForFeature(feature, hit = false) {
      const p = normalizeProps(feature.properties);
      const gt = (((feature.geometry && feature.geometry.type) || p.geometryType || '') + '').toUpperCase();

      if (gt.includes('POLYGON')) {
        return {
          color: '#1d4ed8',
          weight: hit ? 2.5 : 1.4,
          fillColor: '#2563eb',
          fillOpacity: hit ? 0.32 : 0.10,
          opacity: hit ? 1 : 0.55
        };
      }

      return {
        color: routeColors.line,
        weight: hit ? 4 : 1.2,
        opacity: hit ? 0.95 : 0.22
      };
    }

    function popupText(feature) {
      const p = normalizeProps(feature.properties);
      const gt = (feature.geometry && feature.geometry.type) || p.geometryType || 'UNKNOWN';
      const bufferText = p.bufferM ? `<br>Buffer: ${p.bufferM}m` : '';
      return `<strong>${p.masterId || 'NO-ID'}</strong><br>${p.displayName || '-'}<br>Geometry: ${gt}${bufferText}`;
    }

    function renderAllRoutes() {
  if (allLayer) map.removeLayer(allLayer);
  allLayer = L.geoJSON(routeGeojson, {
    interactive: false,
    style: f => styleForFeature(f, false)
  }).addTo(map);
}

    function clearHitLayers() {
      if (hitLayer) map.removeLayer(hitLayer);
      if (pointLayer) map.removeLayer(pointLayer);
    }

    function renderHits(hits, lat, lng) {
  clearHitLayers();

  pointLayer = L.circleMarker([lat, lng], {
    radius: 18,
    color: '#ffffff',
    weight: 2,
    fillColor: '#b42318',
    fillOpacity: 1
  }).bindPopup(`入力地点<br>${lat}, ${lng}`).addTo(map);

  if (hits.length) {
    hitLayer = L.geoJSON({
      type: 'FeatureCollection',
      features: hits
    }, {
      interactive: false,
      style: f => styleForFeature(f, true)
    }).addTo(map);

    map.setView([lat, lng], 19);
  } else {
    map.setView([lat, lng], 16);
  }
}

    function featureMatches(point, feature) {
      return turf.booleanPointInPolygon(point, feature);
    }

    function judge(lat, lng) {
      const point = turf.point([lng, lat]);
      return routeGeojson.features.filter(f => {
        try {
          return featureMatches(point, f);
        } catch (e) {
          return false;
        }
      });
    }

    function renderResults(hits) {
  // 簡略版では一覧カードを表示しないので何もしない
}

    function updateSummary(hits, sourceLabel) {
  if (hits.length) {
    const first = normalizeProps(hits[0].properties || {});
    setSummary(
      `${sourceLabel}\n一致件数: ${hits.length}件\n路線: ${first.displayName}`,
      true
    );
  } else {
    setSummary(
      `${sourceLabel}\n一致件数: 0件\n路線: 該当なし`,
      false
    );
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

   function searchPlaceYahoo(keyword) {
  return new Promise((resolve, reject) => {
    const cb = 'yahooLocalSearchCallback_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const script = document.createElement('script');

    window[cb] = data => {
      cleanup();

      const features = data && data.Feature ? data.Feature : [];
      const first = Array.isArray(features) ? features[0] : null;

      if (!first) {
        return reject(new Error('駅名・施設名から場所を特定できませんでした。'));
      }

      resolve(first);
    };

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      delete window[cb];
    }

    script.onerror = () => {
      cleanup();
      reject(new Error('駅名・施設名検索の取得に失敗しました。'));
    };

    script.src =
      `https://map.yahooapis.jp/search/local/V1/localSearch?appid=${encodeURIComponent(YAHOO_APP_ID)}&query=${encodeURIComponent(keyword)}&results=1&output=json&callback=${encodeURIComponent(cb)}`;

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

async function runByCurrentLocation(options = {}) {
  const forceRefresh = !!options.forceRefresh;
  saveLastMode('current');

  let lat = null;
  let lng = null;
  let accuracy = null;
  let areaLabel = '現在地付近';
  let usedSavedLocation = false;

  const savedLocationInfo = getSavedLocationInfo();

  if (
    !forceRefresh &&
    savedLocationInfo &&
    savedLocationInfo.lat &&
    savedLocationInfo.lng
  ) {
    lat = Number(savedLocationInfo.lat);
    lng = Number(savedLocationInfo.lng);
    accuracy = Number(savedLocationInfo.accuracy || 0);
    areaLabel = savedLocationInfo.areaLabel || savedLocationInfo.addressRaw || '前回保存した位置';
    usedSavedLocation = true;
    locationInfo = {
      lat: String(savedLocationInfo.lat || ''),
      lng: String(savedLocationInfo.lng || ''),
      accuracy: String(savedLocationInfo.accuracy || ''),
      addressRaw: savedLocationInfo.addressRaw || '',
      areaLabel: savedLocationInfo.areaLabel || ''
    };
    setStatus('前回保存した位置で判定しています...');
  } else {
    setStatus('現在地を取得しています...');

    const currentPos = await getCurrentPositionAsync();
    lat = currentPos.coords.latitude;
    lng = currentPos.coords.longitude;
    accuracy = currentPos.coords.accuracy;

    areaLabel = `現在地付近（精度 約${Math.round(accuracy)}m）`;

    try {
      const rev = await reverseGeocodeGsi(lat, lng);
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
  }

  setStatus('GeoJSONを読み込んで判定しています...');
  await loadGeojson();
  renderAllRoutes();

  const hits = judge(lat, lng);
  lastSearchLatLng = [lat, lng];
  renderHits(hits, lat, lng);
  renderResults(hits);
  updateSummary(
    hits,
    usedSavedLocation ? `${areaLabel}（前回保存位置）` : areaLabel
  );

  if (hits.length) {
    setStatus(`判定完了：${hits.length}件ヒットしました。`);
  } else {
    setStatus('判定完了：該当ルートは見つかりませんでした。');
  }

  await logSearchAction({
    searchType: usedSavedLocation ? 'current_saved' : 'current',
    keyword: usedSavedLocation ? 'SAVED_LOCATION' : 'CURRENT_LOCATION',
    searchedLat: lat,
    searchedLng: lng,
    resultLabel: usedSavedLocation ? `${areaLabel}（前回保存位置）` : areaLabel,
    hitCount: hits.length
  });
}

    async function runByAddress() {
  const keyword = els.address.value.trim();
  if (!keyword) throw new Error('住所・駅名・施設名を入力してください。');

  saveLastMode('address');
  setStatus('GeoJSON 読み込み中…');
  await loadGeojson();
  renderAllRoutes();

  let lat, lng, display;

  try {
    const feature = await geocodeAddressYahoo(keyword);
    ({ lat, lng } = parseYahooCoordinates(feature));
    display =
      (feature && feature.Property ? feature.Property.Address : '') ||
      (feature ? feature.Name : '') ||
      keyword;
  } catch (addressErr) {
    const placeFeature = await searchPlaceYahoo(keyword);
    ({ lat, lng } = parseYahooPlaceCoordinates(placeFeature));
    display = (placeFeature ? placeFeature.Name : '') || keyword;
  }

  const hits = judge(lat, lng);
  lastSearchLatLng = [lat, lng];
  renderHits(hits, lat, lng);
  renderResults(hits);
  updateSummary(hits, display);
  setStatus('');

  await logSearchAction({
    searchType: 'address',
    keyword,
    searchedLat: String(lat),
    searchedLng: String(lng),
    resultLabel: display,
    hitCount: String(hits.length)
  });
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

    els.showAll.addEventListener('click', async () => {
  try {
    await loadGeojson();
    renderAllRoutes();

    if (lastSearchLatLng) {
      map.setView(lastSearchLatLng, 14);
      setStatus('検索地点を中心に広く表示しました。');
    } else if (allLayer) {
      map.fitBounds(allLayer.getBounds().pad(0.02));
      setStatus('広く表示しました。');
    }
  } catch (e) {
    setSummary(e.message, false);
  }
});

    els.clearMap.addEventListener('click', () => {
  clearHitLayers();
  // この行は削除:
  // els.resultsList.innerHTML = '<div class="mini">まだ結果はありません。</div>';
  setSummary('まだ判定していません。', false);
  setStatus('クリアしました。');
  if (allLayer) map.fitBounds(allLayer.getBounds().pad(0.05));
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
  const lastMode = getLastMode();
  if (lastMode !== 'current') return;
  if (!currentEmail) return;
  if (els.appBody.classList.contains('hidden')) return;

  setStatus('前回と同じく現在地で判定を試しています...');

  try {
    await runByCurrentLocation();
  } catch (e) {
    setStatus('現在地の自動判定はできませんでした。');

    if (isIphoneSafari()) {
      setSummary(
        '現在地の自動判定に失敗しました。\nSafariで aA → Webサイトの設定 → 位置情報 を「許可」にしてから、もう一度「現在地で判定」を押してください。',
        false
      );
    } else {
      setSummary(
        '現在地の自動判定に失敗しました。\nもう一度「現在地で判定」を押してください。',
        false
      );
    }
  }
}

updateCurrentLocationButtonUI();

async function init() {
  try {
    await loadGeojson();
    renderAllRoutes();
    map.fitBounds(allLayer.getBounds().pad(0.05));

    if (!els.appBody.classList.contains('hidden')) {
      setStatus('住所または現在地から判定してください。');
      setSummary('まだ判定していません。', false);
    }
  } catch (e) {
    if (!els.appBody.classList.contains('hidden')) {
      setSummary(e.message || '初期化に失敗しました。', false);
      setStatus('エラー');
    } else {
      setEmailStatus('最初にメールアドレスを登録してください。', false);
    }
  }
}

if (hasSavedUser) {
  init().then(() => {
    tryAutoRunCurrentAfterReload();
  });
} else {
  loadGeojson()
    .then(() => {
      renderAllRoutes();
      if (allLayer) map.fitBounds(allLayer.getBounds().pad(0.05));
    })
    .catch((e) => {
      console.error('initial geojson load failed', e);
    });
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