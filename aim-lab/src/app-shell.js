import {
  MAP_ORDER,
  RECOMMENDED_SCENARIOS,
  SCENARIO_MAPS,
  recommendedScenario,
  resolveScenarioSelection,
} from './scenarios.js';
import { historicalMapId, TASKS, MINI_GAME_GROUPS, miniGameEntries } from './training.js';
import { initSiteMenu } from './site-menu.js';
import {initPlaylists} from './playlists.js';

const icon = (name) => {
  const paths = {
    home: '<path d="M3 10.5 12 3l9 7.5v8a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
    map: '<path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2z"/><path d="M9 3v16m6-14v16"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>',
    chart: '<path d="M4 20V10m6 10V4m6 16v-7m6 7V7"/>',
    user: '<circle cx="12" cy="8" r="3.5"/><path d="M4 21c.6-4.1 3.4-6.2 8-6.2s7.4 2.1 8 6.2"/>',
    bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7z"/>',
    move: '<path d="M13 5a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z"/><path d="m10 9-3 4 3 2 1 5m-1-11 4 3 4-1m-5 1-2 5 5 2 2 4"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06-2.3 2.3-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V20.5h-3.25v-.11A1.7 1.7 0 0 0 10.28 18.8a1.7 1.7 0 0 0-1.87.34l-.06.06-2.3-2.3.06-.06A1.7 1.7 0 0 0 6.45 15a1.7 1.7 0 0 0-1.56-1.04h-.11v-3.25h.11a1.7 1.7 0 0 0 1.56-1.04 1.7 1.7 0 0 0-.34-1.87l-.06-.06 2.3-2.3.06.06a1.7 1.7 0 0 0 1.87.34 1.7 1.7 0 0 0 1.04-1.56v-.11h3.25v.11a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06 2.3 2.3-.06.06a1.7 1.7 0 0 0-.34 1.87 1.7 1.7 0 0 0 1.56 1.04h.11v3.25h-.11A1.7 1.7 0 0 0 19.4 15Z"/>',
    bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M9.5 21h5"/>',
    play: '<path d="m8 5 11 7-11 7z"/>',
    crosshair: '<circle cx="12" cy="12" r="4"/><path d="M12 1v5m0 12v5M1 12h5m12 0h5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  return `<svg class="va-icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths[name] ?? paths.target}</svg>`;
};

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
}[character]));

const scenarioTask = {
  'split-entry': 'precision', 'retake-lane': 'transfer', 'cross-court': 'wide',
  'waterline-hold': 'peek', 'elevation-clear': 'vertical', 'walkback-reset': 'counter',
  'hall-snap': 'reactive', 'hall-pressure': 'duel', 'shutter-swing': 'transfer',
  'bay-anchor': 'precision', 'core-track': 'tracking', 'lane-reversal': 'survival',
};

const skillNames = {
  'crosshair-placement': 'Đặt tâm', 'first-shot': 'Phát đầu', 'angle-isolation': 'Tách góc',
  'target-transfer': 'Chuyển tâm', pathing: 'Di chuyển', 'micro-correction': 'Chỉnh nhỏ',
  'wide-flick': 'Flick rộng', timing: 'Nhịp bắn', 'hold-discipline': 'Giữ góc',
  reaction: 'Phản ứng', 'burst-control': 'Burst', 'vertical-transfer': 'Góc dọc',
  'movement-stop': 'Dừng bắn', 'retreat-aim': 'Rút lui', '180-turn': 'Quay 180°',
  composure: 'Bình tĩnh', 'micro-flick': 'Flick nhỏ', tracking: 'Theo mục tiêu',
  recovery: 'Hồi tâm', 'angle-priority': 'Ưu tiên góc', 'smooth-tracking': 'Theo mượt',
  'stop-shot': 'Dừng tâm', 'distance-control': 'Cự ly', 'direction-change': 'Đổi hướng',
};

const behaviorOptions = [
  ['auto', 'Theo mode'], ['static', 'Tĩnh'], ['strafe', 'Strafe'], ['peek', 'Peek'], ['wide', 'Wide swing'], ['random', 'Ngẫu nhiên'],
];
const gameModeOptions = (selection, selected) => {
  const taskId = scenarioTask[selection.scenarioId] ?? 'precision';
  return `<option value="scenario"${selected==='scenario'?' selected':''}>Theo scenario · ${escapeHtml(TASKS[taskId]?.name ?? 'Precision')}</option>`+MINI_GAME_GROUPS.map(group=>`<optgroup label="${escapeHtml(group.name)}">${miniGameEntries(group.id).map(([id,task])=>`<option value="${id}"${selected===id?' selected':''}>${escapeHtml(task.name)}</option>`).join('')}</optgroup>`).join('');
};
const reactionOptions = [
  ['instant', 'Tức thì'], ['150', '150 ms'], ['250', '250 ms'], ['350', '350 ms'], ['random', 'Ngẫu nhiên'],
];
const distanceOptions = [
  ['close', 'Gần · 5–12 m'], ['medium', 'Trung · 10–25 m'], ['long', 'Xa · 24 m+'], ['mixed', 'Trộn cự ly'],
];
const headOptions = [
  ['fixed', 'Cố định'], ['realistic', 'Thực tế'], ['dynamic', 'Động'],
];

function optionMarkup(options, selected) {
  return options.map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
}

function directionPosition(direction, index) {
  const fallback = [[19, 70], [35, 32], [52, 54], [70, 25], [82, 70]][index % 5];
  const positions = {
    left: [20, 58], 'far-left': [11, 39], 'low-left': [25, 74], 'rear-left': [15, 26],
    right: [75, 55], 'far-right': [83, 35], 'high-right': [72, 20], 'near-right': [78, 70],
    'front-right': [67, 70], center: [50, 47], 'front-left': [32, 68], 'high-left': [29, 18],
  };
  return positions[direction] ?? fallback;
}

function zoneAngles(selection) {
  return selection.zone.scenarios.flatMap((scenario) => scenario.angles.map((angle) => ({ scenario, angle })));
}

function markerMarkup(selection, compact = false) {
  const entries = compact ? [selection] : zoneAngles(selection);
  return entries.map(({ scenario, angle }, index) => {
    const [x, y] = directionPosition(angle.direction, index);
    const active = angle.id === selection.angle.id && scenario.id === selection.scenario.id;
    return `<button class="viewport-marker${active ? ' active' : ''}" data-angle-scenario="${escapeHtml(scenario.id)}" data-angle="${escapeHtml(angle.id)}" style="--marker-x:${x}%;--marker-y:${y}%" aria-label="Chọn góc ${escapeHtml(angle.title)}"><i></i><span>${escapeHtml(angle.title)}</span></button>`;
  }).join('');
}

function previewMarkup(selection, options = {}) {
  const { compact = false, controls = true } = options;
  const mapClass = selection.mapId === 'lotus' ? 'is-lotus' : 'is-dark';
  const zoneClass = `is-zone-${escapeHtml(selection.zoneId)}`;
  return `<div class="scenario-viewport ${mapClass} ${zoneClass}${compact ? ' compact' : ''}" data-camera="overview">
    <div class="viewport-topline"><span>${icon('target')} Ảnh chụp phòng tập 3D</span></div>
    <div class="viewport-caption"><span>${escapeHtml(selection.map.name)} · ${escapeHtml(selection.zone.name)}</span><b>${escapeHtml(selection.scenario.title)}</b></div>
  </div>`;
}

function completedRecords(records) {
  return (Array.isArray(records) ? records : []).filter((record) => record?.status === 'completed' && record.summary);
}

function average(values) {
  const usable = values.filter(Number.isFinite);
  return usable.length ? usable.reduce((total, value) => total + value, 0) / usable.length : null;
}

function sessionStreak(records) {
  const days = new Set(completedRecords(records).map((record) => {
    const date = new Date(record.startedAt);
    return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }).filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (days.has(`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`)) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function trendSvg(values) {
  const usable = values.filter(Number.isFinite).slice(-8);
  if (usable.length < 2) return '<div class="empty-trend">CHƯA ĐỦ DỮ LIỆU</div>';
  const min = Math.min(...usable), max = Math.max(...usable), span = Math.max(.001, max - min);
  const points = usable.map((value, index) => `${8 + index * (132 / (usable.length - 1))},${47 - ((value - min) / span) * 37}`).join(' ');
  return `<svg viewBox="0 0 148 56" aria-hidden="true"><polyline points="${points}" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="${points.split(' ').at(-1).split(',')[0]}" cy="${points.split(' ').at(-1).split(',')[1]}" r="2.8" fill="currentColor"/></svg>`;
}

function metricCard(label, value, subtext, values, tone = '') {
  return `<article class="performance-card ${tone}"><span>${escapeHtml(label)}</span><strong>${value}</strong><small>${escapeHtml(subtext)}</small><div class="performance-chart">${trendSvg(values)}</div></article>`;
}

function routePage(id, title, copy) {
  const page = document.createElement('section');
  page.id = `${id}-view`;
  page.className = 'view coach-page';
  page.hidden = true;
  page.innerHTML = `<div class="coach-page-placeholder"><span class="coach-kicker">V-AIM / ${escapeHtml(id).toUpperCase()}</span><h1>${escapeHtml(title)}</h1><p>${escapeHtml(copy)}</p></div>`;
  return page;
}

function makeNavigationButton(label, route, iconName, active = false) {
  return `<button class="topnav-route${active ? ' active' : ''}" data-route="${route}" type="button" aria-label="${label}"${active ? ' aria-current="page"' : ''}>${icon(iconName)}<span>${label}</span></button>`;
}

function sidebarMarkup() {
  const items = [
    ['home', 'Trang chủ', 'Vào lộ trình hôm nay', 'bolt'],
    ['map', 'Luyện theo map', 'Học vị trí & góc', 'map'],
    ['tactics', 'Đấu tập 3D', 'FPS · Địch spawn liên tục', 'crosshair'],
    ['practice', 'Mini-games', 'Chính xác, phản xạ & tracking', 'target'],
    ['scenario', 'Bài tập theo góc', 'Chọn góc & cấu hình', 'move'],
    ['playlists', 'Lộ trình', 'Tập từng bước, có mục tiêu', 'list'],
    ['analytics', 'Tiến bộ', 'Theo dõi tiến bộ', 'chart'],
  ];
  return `<aside class="coach-sidebar" aria-label="Điều hướng huấn luyện">
    <div class="sidebar-rail"></div>
    <div class="sidebar-items">${items.map(([route, label, description, iconName], index) => `<button type="button" class="sidebar-route${index === 0 ? ' active' : ''}" data-route="${route}" aria-label="${label}"${index === 0 ? ' aria-current="page"' : ''}>${icon(iconName)}<span><b>${label}</b><small>${description}</small></span></button>`).join('')}</div>
    <div class="sidebar-utility"><button class="sidebar-route" data-route="profile" type="button">${icon('user')}<span><b>Hồ sơ & dữ liệu</b></span></button><button class="sidebar-route" data-route="preferences" type="button">${icon('settings')}<span><b>Cài đặt</b></span></button></div>
    <div class="sidebar-version"><i></i> Lưu trên máy của bạn</div>
  </aside>`;
}

export function initAppShell(context) {
  if (document.body.classList.contains('v-aim-shell-enabled')) return;
  document.body.classList.add('v-aim-shell-enabled');

  const header = document.querySelector('.site-header');
  const main = document.querySelector('main');
  if (!header || !main) return;

  const themeToggle = document.getElementById('theme-toggle');
  const headerActions = header.querySelector('.header-actions');
  const brand = header.querySelector('.brand');
  const navigation = header.querySelector('nav');
  const localBadge = header.querySelector('.local-badge');
  document.title = 'V-AIM COACH — Tactical Training';
  brand.setAttribute('aria-label', 'V-AIM COACH');
  brand.innerHTML = '<span class="v-aim-mark" aria-hidden="true"><i></i><i></i><i></i></span><span class="v-aim-wordmark">V-AIM <b>COACH</b><small>TACTICAL PERFORMANCE LAB</small></span>';
  navigation.innerHTML = '<span class="header-location">Phòng luyện tập <span>/</span> <b id="current-page-label">Trang chủ</b></span>';
  const menuToggle = document.createElement('button');
  menuToggle.className = 'navigation-toggle';
  menuToggle.type = 'button';
  menuToggle.setAttribute('aria-label', 'Mở menu điều hướng');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-controls', 'coach-navigation');
  menuToggle.innerHTML = `${icon('list')}<span>Menu</span>`;
  header.prepend(menuToggle);
  headerActions.classList.add('coach-header-actions');
  if (localBadge) localBadge.innerHTML = '<i></i><span>LOCAL READY</span>';
  const settingsButton = document.createElement('button');
  settingsButton.className = 'header-icon-button';
  settingsButton.type = 'button';
  settingsButton.dataset.route = 'preferences';
  settingsButton.setAttribute('aria-label', 'Cài đặt');
  settingsButton.innerHTML = icon('settings');
  const notification = document.createElement('button');
  notification.className = 'header-icon-button notification';
  notification.type = 'button';
  notification.dataset.route = 'profile';
  notification.setAttribute('aria-label', 'Thông báo');
  notification.innerHTML = `${icon('bell')}<i></i>`;
  if (themeToggle) headerActions.prepend(notification, settingsButton);
  const player = document.createElement('button');
  player.className = 'header-player';
  player.type = 'button';
  player.dataset.route = 'profile';
  player.setAttribute('aria-label', 'Hồ sơ người chơi');
  player.innerHTML = '<span class="player-emblem">V</span><span><b>NGƯỜI CHƠI</b><small>Tập trung. Chính xác. Tiến bộ.</small></span>';
  headerActions.append(player);

  const frame = document.createElement('div');
  frame.className = 'coach-application';
  header.insertAdjacentElement('afterend', frame);
  frame.insertAdjacentHTML('afterbegin', sidebarMarkup());
  frame.querySelector('.coach-sidebar').id = 'coach-navigation';
  const closeMenu = () => {
    if (matchMedia('(max-width: 1000px)').matches && frame.querySelector('.coach-sidebar').contains(document.activeElement)) menuToggle.focus();
    document.body.classList.remove('navigation-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Mở menu điều hướng');
  };
  menuToggle.addEventListener('click', () => {
    const open = document.body.classList.toggle('navigation-open');
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Đóng menu điều hướng' : 'Mở menu điều hướng');
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && document.body.classList.contains('navigation-open')) {
      closeMenu();
      menuToggle.focus();
    }
  });
  frame.append(main);
  main.classList.add('coach-main');

  const home = routePage('home', 'Sẵn sàng vào trận?', 'Kế hoạch được tạo từ dữ liệu phiên trên máy của bạn.');
  const mapPage = routePage('map', 'MAP TRAINING', 'Chọn map, micro-zone và tình huống chiến thuật.');
  const scenarioPage = routePage('scenario', 'SCENARIO DETAIL', 'Xem góc, đặt cấu hình và vào phòng tập.');
  const analyticsPage = routePage('analytics', 'ANALYTICS', 'Các chỉ số phiên và bước tập tiếp theo.');
  const playlistsPage = routePage('playlists', 'PLAYLISTS', 'Các chuỗi bài tập theo kỹ năng.');
  const profilePage = routePage('profile', 'PROFILE', 'Thiết lập cá nhân và lịch sử cục bộ.');
  main.prepend(profilePage, playlistsPage, analyticsPage, scenarioPage, mapPage, home);
  const tacticalPage=routePage('tactics','TACTICAL LAB','10 tình huống chiến thuật');
  main.append(tacticalPage);
  initSiteMenu(tacticalPage,context);

  let selection = resolveScenarioSelection(context.selection ?? {});
  let config = { gameMode: 'scenario', behavior: 'auto', reaction: 'instant', distance: 'medium', head: 'realistic', repetitions: '25', camera: 'overview' };
  const trainingSelection = () => ({
    mapId: selection.mapId,
    zoneId: selection.zoneId,
    scenarioId: selection.scenarioId,
    angleId: selection.angleId,
    taskId: config.gameMode !== 'scenario' ? config.gameMode : (scenarioTask[selection.scenarioId] ?? 'precision'),
    config,
  });

  const setRouteState = (route) => {
    const routeNames = { home: 'Trang chủ', map: 'Luyện theo map', tactics: 'Đấu tập 3D', practice: 'Mini-games', scenario: 'Bài tập theo góc', playlists: 'Lộ trình', analytics: 'Tiến bộ', profile: 'Hồ sơ & dữ liệu', preferences: 'Cài đặt', dpi: 'Hiệu chuẩn DPI', history: 'Lịch sử phiên tập' };
    document.getElementById('current-page-label').textContent = routeNames[route] ?? 'Phòng luyện tập';
    closeMenu();
    const topRoute = route === 'practice' || route === 'scenario' || route === 'map' || route === 'tactics' ? 'map' : route;
    document.querySelectorAll('.topnav-route').forEach((button) => {
      const active = button.dataset.route === topRoute;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    document.querySelectorAll('.sidebar-route').forEach((button) => {
      const active = button.dataset.route === (['tactics','practice','scenario'].includes(route)?route:topRoute);
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
  };
  const navigate = (route) => {
    const moved = context.navigate(route);
    if (moved === false) return false;
    // `navigate()` owns the session guard.  This local fallback keeps newly
    // rendered routes visible when a page redraw happened in the same click.
    const target = document.getElementById(`${route}-view`);
    if (target?.hidden) document.querySelectorAll('.view').forEach((page) => { page.hidden = page !== target; });
    setRouteState(route);
    if (route === 'home') renderHome();
    if (route === 'analytics') renderAnalytics();
    if (route === 'profile') renderProfile();
    if (route === 'practice') document.getElementById('mode-picker').open = true;
    return true;
  };
  const applySelection = (next) => {
    selection = resolveScenarioSelection(next);
    context.configureTraining?.(trainingSelection());
    renderHome();
    renderMapTraining();
    renderScenarioDetail();
    renderPlaylists();
  };
  const forceRoute = (route) => {
    const target = document.getElementById(`${route}-view`);
    if (!target) return false;
    document.querySelectorAll('.view').forEach((page) => { page.hidden = page !== target; });
    setRouteState(route);
    document.dispatchEvent(new CustomEvent('v-aim:navigate', { detail: { view: route } }));
    return true;
  };
  const openScenario = (next = selection) => {
    if (context.canNavigate && !context.canNavigate()) return false;
    applySelection(next);
    return forceRoute('scenario');
  };
  const launchTraining = () => {
    context.configureTraining?.(trainingSelection());
    context.launchTraining?.();
  };
  // Routes are delegated so buttons rendered after a selection redraw work in
  // exactly the same way as persistent top and side navigation.
  const attachRouteHandlers = () => {};
  document.addEventListener('click', (event) => {
    const trigger = event.target instanceof Element ? event.target.closest('button[data-route], a[data-route]') : null;
    if (!trigger || !document.contains(trigger)) return;
    event.preventDefault();
    navigate(trigger.dataset.route);
  });
  const attachAngleHandlers = (root) => {
    root.querySelectorAll('[data-angle-scenario][data-angle]').forEach((button) => {
      button.addEventListener('click', () => openScenario({ ...selection, scenarioId: button.dataset.angleScenario, angleId: button.dataset.angle }));
    });
    root.querySelectorAll('[data-camera-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        config.camera = config.camera === 'overview' ? 'free' : 'overview';
        const viewport = button.closest('.scenario-viewport');
        if (viewport) viewport.dataset.camera = config.camera;
        button.textContent = config.camera === 'overview' ? 'FREE CAMERA' : 'OVERVIEW';
      });
    });
  };
  const attachConfigHandlers = (root) => {
    root.querySelectorAll('[data-config]').forEach((field) => {
      field.addEventListener('change', () => {
        config = { ...config, [field.dataset.config]: field.value };
        context.configureTraining?.(trainingSelection());
        if(field.dataset.config==='gameMode') updateModeBrief(root);
        root.querySelectorAll(`[data-config-value="${field.dataset.config}"]`).forEach((value) => { value.textContent = field.options[field.selectedIndex].textContent; });
      });
    });
  };

  function renderHome() {
    const featured = recommendedScenario('crosshairPlacement');
    const records = completedRecords(context.history?.() ?? []);
    const accuracies = records.map((record) => Number(record.summary.accuracy) * 100).filter(Number.isFinite).reverse();
    const firstShot = records.map((record) => Number(record.summary.medianAcquireMs)).filter(Number.isFinite).reverse();
    const targetCount = records.map((record) => Number(record.summary.hits)).filter(Number.isFinite).reverse();
    const averageAccuracy = average(accuracies);
    const recentAcquire = average(firstShot.slice(-5));
    const targets = targetCount.reduce((total, value) => total + value, 0);
    home.innerHTML = `<div class="home-page-content">
      <header class="page-heading"><div><h1>Vào nhịp. Giữ tâm.</h1><p>Một mục tiêu rõ ràng cho mỗi lần luyện tập.</p></div><div class="date-stamp"><span>Lịch sử của bạn</span><b>${records.length} phiên đã hoàn tất</b></div></header>
      <section class="training-hero" aria-labelledby="training-hero-title"><div class="training-hero-copy"><span class="hero-status"><i></i> Đấu tập 3D · Solo</span><h2 id="training-hero-title">Làm chủ góc bắn.<br>Sẵn sàng giao tranh.</h2><p>Luyện giữ site, đọc chuyển động và tái chiếm trong không gian chiến thuật.</p><button type="button" class="coach-primary" data-route="tactics">${icon('play')} Chọn trận đấu</button><span class="hero-footnote">4 khu vực · 4 chế độ · Độ khó tùy chỉnh</span></div><div class="hero-map-caption"><span>Ảnh chụp từ map trong ứng dụng</span><b>Lotus / Đền cổ</b></div></section>
      <section class="menu-launch-grid" aria-label="Chọn cách chơi">
        <button type="button" class="menu-launch" data-route="practice"><span class="launch-icon">${icon('target')}</span><span><b>Mini-games</b><em>Flick, phản xạ & tracking</em></span><i aria-hidden="true">›</i></button>
        <button type="button" class="menu-launch" data-route="playlists"><span class="launch-icon">${icon('list')}</span><span><b>Lộ trình luyện tập</b><em>Khởi động đến chuyên sâu</em></span><i aria-hidden="true">›</i></button>
        <button type="button" class="menu-launch" data-route="map"><span class="launch-icon">${icon('map')}</span><span><b>Luyện theo map</b><em>Làm quen vị trí & góc bắn</em></span><i aria-hidden="true">›</i></button>
      </section><div class="home-main-grid">
        <article class="featured-scenario-card"><div class="card-label"><span>Bài tập gợi ý</span><b>Luyện đặt tâm</b></div>${previewMarkup(featured, { compact: true, controls: false })}<div class="featured-copy"><span class="coach-kicker">${escapeHtml(featured.map.name)} / ${escapeHtml(featured.zone.name)}</span><h2>${escapeHtml(featured.scenario.title)}</h2><p>${escapeHtml(featured.scenario.description)}</p><div class="feature-tags">${featured.scenario.skills.slice(0, 3).map((skill) => `<span>${escapeHtml(skillNames[skill] ?? skill)}</span>`).join('')}</div><button class="coach-primary" type="button" data-open-featured>${icon('play')} Xem bài tập <b>›</b></button></div></article>
        <article class="focus-card"><span class="card-label-text">Hướng luyện hôm nay</span><div class="focus-icon">${icon('target')}</div><span>Mục tiêu</span><h2>${records.length ? averageAccuracy !== null && averageAccuracy < 72 ? 'Độ chính xác phát đầu' : 'Giữ nhịp chuyển góc' : 'Bắt đầu từ một phiên'}</h2><p>${records.length ? 'Đây là gợi ý từ các phiên trên máy; chưa phải đánh giá kỹ năng tổng quát.' : 'Hoàn tất vài phiên cùng cấu hình để hệ thống có dữ liệu đề xuất.'}</p><div class="focus-stat-list"><div><span>Độ chính xác</span><b>${averageAccuracy === null ? '—' : `${averageAccuracy.toFixed(1)}%`}</b></div><div><span>Thời gian bắt mục tiêu</span><b>${recentAcquire === null ? '—' : `${Math.round(recentAcquire)} ms`}</b></div><div><span>Phiên hoàn tất</span><b>${records.length}</b></div></div><button type="button" class="ghost-action" data-open-featured>Xem bài phù hợp <b>→</b></button></article>
        <aside class="recommended-card"><div class="panel-title"><b>Khám phá bài tập</b><button type="button" data-route="playlists">Xem tất cả →</button></div>${['targetTransfer', 'reaction', 'verticalTransfer'].map((key) => {
          const recommendation = recommendedScenario(key);
          return `<button class="recommendation-item" type="button" data-recommendation="${key}">${previewMarkup(recommendation, { compact: true, controls: false })}<span><b>${escapeHtml(recommendation.scenario.title)}</b><small>${escapeHtml(recommendation.zone.name)} · ${escapeHtml(skillNames[recommendation.scenario.skills[0]] ?? 'Tactical')}</small></span><i>›</i></button>`;
        }).join('')}</aside>
      </div>
      <section class="performance-summary"><div class="section-heading"><div><span class="coach-kicker">Theo dõi kết quả</span><h2>Tiến bộ qua từng phiên</h2></div><button type="button" class="period-pill" data-route="history">Xem lịch sử</button></div><div class="performance-grid">${[
          metricCard('Điểm luyện tập', records.length ? `${Math.round((averageAccuracy ?? 0) * 10)}<small>/1000</small>` : '—', records.length ? 'Từ accuracy hoặc thời gian bám' : 'Cần phiên hoàn tất', accuracies, 'cool'),
          metricCard('Độ chính xác', averageAccuracy === null ? '—' : `${averageAccuracy.toFixed(1)}%`, records.length ? 'Trung bình các phiên hoàn tất' : 'Chưa có baseline', accuracies, 'positive'),
          metricCard('Thời gian bắt mục tiêu', recentAcquire === null ? '—' : `${Math.round(recentAcquire)} <small>ms</small>`, 'Chỉ target đã trúng', firstShot, 'warm'),
          metricCard('Mục tiêu đã trúng', String(targets), records.length ? 'Tổng hit đã lưu' : 'Chưa có hit', targetCount, 'cool'),
          metricCard('Chuỗi ngày luyện tập', `${sessionStreak(records)} <small>ngày</small>`, records.length ? 'Chuỗi phiên liên tiếp' : 'Bắt đầu từ một phiên', records.map((_, index) => index + 1), 'streak'),
        ].join('')}</div></section>
    </div>`;
    home.querySelectorAll('[data-open-featured]').forEach((button) => button.addEventListener('click', () => openScenario(featured)));
    home.querySelectorAll('[data-recommendation]').forEach((button) => button.addEventListener('click', () => openScenario(recommendedScenario(button.dataset.recommendation))));
    attachRouteHandlers(home);
  }

  function renderMapTraining() {
    const maps = MAP_ORDER.map((id) => SCENARIO_MAPS[id]);
    mapPage.innerHTML = `<div class="map-page-content">
      <header class="page-heading"><div><span class="coach-kicker">TRAIN / MAP BROWSER</span><h1>Làm chủ từng góc bắn</h1><p>Chọn map, khu vực và bài tập phù hợp với kỹ năng muốn luyện.</p></div><div class="route-breadcrumb">TRAIN <i>›</i> ${escapeHtml(selection.map.name)} <i>›</i> ${escapeHtml(selection.zone.name)}</div></header>
      <div class="map-browser-grid"><section class="map-list-panel"><span class="panel-title-label">Chọn map</span>${maps.map((map) => `<button class="map-selection-card${map.id === selection.mapId ? ' active' : ''}" type="button" data-map-id="${map.id}"><span class="map-card-glyph">${icon('map')}</span><span><b>${escapeHtml(map.name)}</b><small>${escapeHtml(map.description)}</small></span><i>${map.id === selection.mapId ? 'ACTIVE' : 'SELECT'}</i></button>`).join('')}</section>
        <section class="map-hero-panel">${previewMarkup(selection, { compact: false, controls: true })}<div class="map-hero-copy"><span class="coach-kicker">MICRO-ZONE / ${escapeHtml(selection.map.shortName)}</span><h2>${escapeHtml(selection.zone.name)}</h2><p>${escapeHtml(selection.zone.description)}</p><div class="zone-chip-row">${selection.map.zones.map((zone) => `<button type="button" class="zone-chip${zone.id === selection.zoneId ? ' active' : ''}" data-zone-id="${zone.id}">${escapeHtml(zone.name)}</button>`).join('')}</div></div></section>
        <aside class="map-mission-panel"><div class="panel-title"><b>Nhiệm vụ</b><span>01 / 03</span></div><div class="mission-radar"><i></i><i></i><i></i><b>${escapeHtml(selection.map.shortName)}</b></div><span class="mission-label">Mục tiêu hiện tại</span><h2>${escapeHtml(selection.scenario.title)}</h2><p>${escapeHtml(selection.scenario.description)}</p><dl><div><dt>Góc cần xử lý</dt><dd>${selection.scenario.angles.length}</dd></div><div><dt>Kỹ năng</dt><dd>${selection.scenario.skills.length}</dd></div><div><dt>Map mode</dt><dd>${selection.mapId === 'lotus' ? '3D TEMPLE' : 'DARK RANGE'}</dd></div></dl><button class="coach-primary" type="button" data-open-scenario>${icon('target')} Xem cấu hình <b>›</b></button></aside>
      </div>
      <section class="scenario-strip"><div class="section-heading"><div><span class="coach-kicker">Bài tập trong khu vực</span><h2>Chọn một tình huống nhỏ, có mục tiêu rõ ràng.</h2></div><span>${selection.map.zones.reduce((total, zone) => total + zone.scenarios.length, 0)} SCENARIOS</span></div><div class="scenario-card-grid">${selection.zone.scenarios.map((scenario) => `<button type="button" class="scenario-route-card${scenario.id === selection.scenarioId ? ' active' : ''}" data-scenario-id="${scenario.id}"><span class="scenario-index">0${selection.zone.scenarios.indexOf(scenario) + 1}</span><b>${escapeHtml(scenario.title)}</b><small>${escapeHtml(scenario.description)}</small><span>${scenario.skills.slice(0, 2).map((skill) => escapeHtml(skillNames[skill] ?? skill)).join(' · ')}</span><i>BRIEFING →</i></button>`).join('')}</div></section>
    </div>`;
    mapPage.querySelectorAll('[data-map-id]').forEach((button) => button.addEventListener('click', () => applySelection({ mapId: button.dataset.mapId })));
    mapPage.querySelectorAll('[data-zone-id]').forEach((button) => button.addEventListener('click', () => applySelection({ ...selection, zoneId: button.dataset.zoneId })));
    mapPage.querySelectorAll('[data-scenario-id]').forEach((button) => button.addEventListener('click', () => openScenario({ ...selection, scenarioId: button.dataset.scenarioId })));
    mapPage.querySelector('[data-open-scenario]')?.addEventListener('click', () => openScenario());
    attachAngleHandlers(mapPage);
  }

  function renderScenarioDetail() {
    const mapOptions = MAP_ORDER.map((id) => `<option value="${id}"${id === selection.mapId ? ' selected' : ''}>${escapeHtml(SCENARIO_MAPS[id].name)}</option>`).join('');
    const zoneOptions = selection.map.zones.map((zone) => `<option value="${zone.id}"${zone.id === selection.zoneId ? ' selected' : ''}>${escapeHtml(zone.name)}</option>`).join('');
    const scenarioOptions = selection.zone.scenarios.map((scenario) => `<option value="${scenario.id}"${scenario.id === selection.scenarioId ? ' selected' : ''}>${escapeHtml(scenario.title)}</option>`).join('');
    const allAngles = zoneAngles(selection);
    scenarioPage.innerHTML = `<div class="scenario-page-content">
      <header class="scenario-detail-heading"><button type="button" class="back-button" data-route="map">← Về danh sách khu vực</button><div><span class="coach-kicker">${escapeHtml(selection.map.name)} / ${escapeHtml(selection.zone.name)}</span><h1>${escapeHtml(selection.scenario.title)}</h1><p>${escapeHtml(selection.scenario.description)}</p></div><div class="scenario-route-badge"><span>Góc đã chọn</span><b>${escapeHtml(selection.angle.title)}</b></div></header>
      <div class="scenario-detail-grid"><section class="scenario-preview-panel">${previewMarkup(selection, { compact: false, controls: true })}<div class="viewport-brief"><span>TACTICAL TRAINING ENVIRONMENT</span><b>${escapeHtml(selection.angle.cue)}</b><small>${escapeHtml(selection.angle.focus)}</small></div></section>
        <aside class="scenario-config-panel"><div class="skills-panel"><div class="panel-title"><b>Kỹ năng luyện tập</b><span>${selection.scenario.skills.length} FOCUS</span></div><div class="skills-grid">${selection.scenario.skills.map((skill, index) => `<div><i>${[icon('crosshair'), icon('bolt'), icon('target'), icon('move')][index % 4]}</i><span>${escapeHtml(skillNames[skill] ?? skill)}</span></div>`).join('')}</div></div>
          <div class="config-heading"><span>Cấu hình bài tập</span><b>LIVE SETUP</b></div>
          <label class="scenario-field"><span>${icon('map')} MAP</span><select data-selection="map">${mapOptions}</select></label>
          <label class="scenario-field"><span>${icon('target')} ZONE</span><select data-selection="zone">${zoneOptions}</select></label>
          <label class="scenario-field"><span>${icon('list')} Bài tập</span><select data-selection="scenario">${scenarioOptions}</select></label>
          <label class="scenario-field"><span>${icon('move')} Chế độ · ${miniGameEntries().length} BÀI</span><select data-config="gameMode">${gameModeOptions(selection, config.gameMode)}</select></label>
          <p class="small-note" data-mode-brief aria-live="polite"></p>
          <label class="scenario-field"><span>${icon('user')} Chuyển động địch</span><select data-config="behavior">${optionMarkup(behaviorOptions, config.behavior)}</select></label>
          <label class="scenario-field"><span>${icon('clock')} Độ trễ phản ứng</span><select data-config="reaction">${optionMarkup(reactionOptions, config.reaction)}</select></label>
          <label class="scenario-field"><span>${icon('target')} Cự ly</span><select data-config="distance">${optionMarkup(distanceOptions, config.distance)}</select></label>
          <label class="scenario-field"><span>${icon('user')} Độ cao mục tiêu</span><select data-config="head">${optionMarkup(headOptions, config.head)}</select></label>
          <label class="scenario-field"><span>${icon('list')} Số lượt</span><select data-config="repetitions">${['15', '25', '40'].map((value) => `<option value="${value}"${value === config.repetitions ? ' selected' : ''}>${value}</option>`).join('')}</select></label>
          <button type="button" class="coach-primary scenario-start" data-launch>${icon('play')} Bắt đầu luyện tập <b>›</b><small>Vào phòng tập với cấu hình đã chọn</small></button>
        </aside></div>
      <div class="scenario-lower-grid"><section class="angle-carousel"><div class="panel-title"><div><b>Các góc xuất hiện</b><small>${allAngles.length} góc trong ${escapeHtml(selection.zone.name)}</small></div><span>CHỌN GÓC →</span></div><div class="angle-card-row">${allAngles.map(({ scenario, angle }, index) => `<button type="button" class="angle-card${scenario.id === selection.scenarioId && angle.id === selection.angleId ? ' active' : ''}" data-angle-scenario="${scenario.id}" data-angle="${angle.id}"><div class="angle-thumb angle-${index % 4}"><i></i><i></i></div><b>${escapeHtml(angle.title)}</b><small>${escapeHtml(scenario.title)}</small></button>`).join('')}</div></section>
        <aside class="zone-overview"><div class="panel-title"><b>Tổng quan khu vực</b><span>MAP / ${escapeHtml(selection.map.shortName)}</span></div><div class="mini-map"><i></i><i></i><i></i><b>${escapeHtml(selection.zone.name.slice(0, 1))}</b></div><div><span class="coach-kicker">${escapeHtml(selection.zone.name)}</span><h2>${escapeHtml(selection.zone.name)}</h2><p>${escapeHtml(selection.zone.description)}</p><ul>${selection.scenario.skills.slice(0, 3).map((skill) => `<li>${escapeHtml(skillNames[skill] ?? skill)}</li>`).join('')}</ul></div></aside></div>
    </div>`;
    scenarioPage.querySelector('[data-selection="map"]')?.addEventListener('change', (event) => applySelection({ mapId: event.target.value }));
    scenarioPage.querySelector('[data-selection="zone"]')?.addEventListener('change', (event) => applySelection({ ...selection, zoneId: event.target.value }));
    scenarioPage.querySelector('[data-selection="scenario"]')?.addEventListener('change', (event) => applySelection({ ...selection, scenarioId: event.target.value }));
    scenarioPage.querySelector('[data-launch]')?.addEventListener('click', launchTraining);
    attachConfigHandlers(scenarioPage);
    updateModeBrief(scenarioPage);
    attachAngleHandlers(scenarioPage);
    attachRouteHandlers(scenarioPage);
  }

  function updateModeBrief(root) {
    const mode=TASKS[trainingSelection().taskId];
    const brief=root.querySelector('[data-mode-brief]');
    if(brief)brief.textContent=`${mode.name}: ${mode.scenario} ${mode.tracking?'Đo tỷ lệ thời gian bám trúng.':'Đo số hit, độ chính xác và thời gian bắt mục tiêu.'}`;
    const behavior=root.querySelector('[data-config="behavior"]');
    if(behavior)behavior.disabled=config.gameMode!=='scenario'&&!mode.combat;
    const repetitions=root.querySelector('[data-config="repetitions"]');
    if(repetitions){
      repetitions.previousElementSibling.innerHTML=`${icon('clock')} ${mode.tracking?'THỜI LƯỢNG':'SỐ MỤC TIÊU / GIỚI HẠN'} `;
      [...repetitions.options].forEach(option=>{const seconds={15:30,25:60,40:90}[option.value];option.textContent=mode.tracking?`${seconds} giây`:`${option.value} mục tiêu / ${seconds} giây`;});
    }
  }

  function renderAnalytics() {
    const records = completedRecords(context.history?.() ?? []);
    const accuracyValues = records.map((record) => Number(record.summary.accuracy) * 100).filter(Number.isFinite).reverse();
    const acquireValues = records.map((record) => Number(record.summary.medianAcquireMs)).filter(Number.isFinite).reverse();
    const mapRows = MAP_ORDER.map((mapId) => {
      const mapRecords = records.filter((record) => historicalMapId(record.config?.map) === mapId);
      const accuracy = average(mapRecords.map((record) => Number(record.summary.accuracy) * 100));
      return `<tr><td><span class="table-map-mark ${mapId}"></span>${escapeHtml(SCENARIO_MAPS[mapId].name)}</td><td>${mapRecords.length}</td><td>${accuracy === null ? '—' : `${accuracy.toFixed(1)}%`}</td><td>${mapRecords.length ? 'Xem baseline' : 'Chưa đủ dữ liệu'}</td></tr>`;
    }).join('');
    analyticsPage.innerHTML = `<div class="analytics-page-content"><header class="page-heading"><div><span class="coach-kicker">ANALYTICS / LOCAL EVIDENCE</span><h1>PERFORMANCE REVIEW</h1><p>Chỉ hiển thị dữ liệu đã đo từ phiên hoàn tất. Không suy đoán sens tối ưu.</p></div><button type="button" class="coach-secondary" data-route="history">MỞ LỊCH SỬ →</button></header><div class="analytics-overview-grid">${[
        metricCard('Độ chính xác', average(accuracyValues) === null ? '—' : `${average(accuracyValues).toFixed(1)}%`, 'Trung bình toàn bộ phiên hoàn tất', accuracyValues, 'positive'),
        metricCard('FIRST-SHOT', average(acquireValues) === null ? '—' : `${Math.round(average(acquireValues))} ms`, 'Chỉ tính target đã trúng', acquireValues, 'warm'),
        metricCard('CLEAN SESSIONS', String(records.filter((record) => record.qualityClean).length), 'Phiên không tạm dừng / lag nặng', records.map((record) => record.qualityClean ? 1 : 0), 'cool'),
        metricCard('STREAK', `${sessionStreak(records)} ngày`, 'Chuỗi ngày có phiên hoàn tất', records.map((_, index) => index + 1), 'streak'),
    ].join('')}</div><section class="analytics-detail-grid"><article class="analytics-insight-card"><span class="coach-kicker">NEXT PRACTICE SIGNAL</span><h2>${records.length ? 'Lặp lại cùng cấu hình trước khi tăng độ khó.' : 'Tạo baseline bằng một phiên 30 giây.'}</h2><p>${records.length ? 'Các đồ thị thời gian, heatmap sai lệch và nhận xét theo kích thước/cự ly có trong phân tích phiên vừa hoàn tất.' : 'Chọn một scenario bên dưới và hoàn tất đủ thời lượng để mở phân tích.'}</p><div class="analytics-actions"><button type="button" class="coach-primary" data-open-scenario>${icon('target')} CHỌN SCENARIO <b>›</b></button><button type="button" class="coach-secondary" data-open-live-analysis>${context.hasLiveAnalysis?.() ? 'MỞ HEATMAP & PHÂN TÍCH →' : 'HEATMAP SAU PHIÊN →'}</button></div></article><article class="scenario-performance-table"><div class="panel-title"><b>MAP PERFORMANCE</b><span>LOCAL ONLY</span></div><table><thead><tr><th>MAP</th><th>PHIÊN</th><th>ACCURACY</th><th>TRẠNG THÁI</th></tr></thead><tbody>${mapRows}</tbody></table></article></section></div>`;
    analyticsPage.querySelector('[data-open-scenario]')?.addEventListener('click', () => openScenario());
    analyticsPage.querySelector('[data-open-live-analysis]')?.addEventListener('click', () => context.openLatestAnalysis?.());
    attachRouteHandlers(analyticsPage);
  }

  function renderPlaylists() {
    if(playlistsPage.dataset.initialized)return;
    playlistsPage.dataset.initialized='true';
    initPlaylists({root:playlistsPage,tasks:TASKS,prepare:context.preparePlaylist,start:context.launchTraining,canChange:context.canNavigate,end:context.endPlaylistStep});
  }

  function renderProfile() {
    const records = completedRecords(context.history?.() ?? []);
    profilePage.innerHTML = `<div class="profile-page-content"><header class="page-heading"><div><span class="coach-kicker">PROFILE / NGƯỜI CHƠI</span><h1>Hồ sơ luyện tập</h1><p>Thông tin này chỉ lưu trên thiết bị hiện tại.</p></div></header><div class="profile-grid"><section class="profile-identity"><div class="profile-shield">V</div><span>PLAYER STATUS</span><h2>NGƯỜI CHƠI</h2><p>${records.length ? `${records.length} phiên hoàn tất đã tạo baseline cục bộ.` : 'Chưa có baseline. Bắt đầu với một scenario ngắn.'}</p><div><b>${sessionStreak(records)}</b><small>NGÀY LIÊN TIẾP</small></div></section><section class="profile-actions"><button type="button" data-route="preferences">${icon('settings')}<span><b>Giao diện & cài đặt</b><small>Chủ đề sáng/tối và tuỳ chọn hệ thống.</small></span><i>›</i></button><button type="button" data-route="dpi">${icon('target')}<span><b>Thiết lập DPI</b><small>Lấy DPI từ profile chuột đang hoạt động.</small></span><i>›</i></button><button type="button" data-route="history">${icon('clock')}<span><b>Lịch sử phiên</b><small>Xuất, nhập và xem phân tích cục bộ.</small></span><i>›</i></button></section></div></div>`;
    attachRouteHandlers(profilePage);
  }

  attachRouteHandlers(document);
  document.addEventListener('v-aim:navigate', (event) => setRouteState(event.detail?.view ?? 'home'));
  document.addEventListener('v-aim:session-finished', () => { renderHome(); renderAnalytics(); renderProfile(); });
  renderHome();
  renderMapTraining();
  renderScenarioDetail();
  renderAnalytics();
  renderPlaylists();
  renderProfile();
  context.configureTraining?.(trainingSelection());
  navigate('home');
}
