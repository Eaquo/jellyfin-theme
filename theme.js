/* Jellyfin Dock Theme — fonctions optionnelles (plugin JavaScript Injector).
   Couleur dynamique, bandeau d'accueil, pilules de saisons, mode léger automatique.
   Les styles sont dans theme.css ; ce fichier ne fait que la logique. */
(() => {
  if (window.__dockTheme) return;
  window.__dockTheme = true;

  const root = document.documentElement;
  const api = () => window.ApiClient;
  const visiblePage = () => document.querySelector('.page:not(.hide)') || document;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Mode léger automatique ----------
     Choix forcé possible : localStorage.dockLite = '1' (léger) ou '0' (complet). */
  const forced = localStorage.getItem('dockLite');
  if (forced === '1') root.classList.add('dock-lite');
  else if (forced !== '0') {
    if ((navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.hardwareConcurrency || 8) <= 2) {
      root.classList.add('dock-lite');
    } else {
      // Mesure la fluidité sur ~60 images : sous 40 i/s, on passe en léger
      let n = 0;
      const t0 = performance.now();
      const tick = () => {
        if (++n < 60) return requestAnimationFrame(tick);
        if (60000 / (performance.now() - t0) < 40) root.classList.add('dock-lite');
      };
      requestAnimationFrame(tick);
    }
  }

  /* ---------- Couleur dynamique ---------- */
  const colorCache = {};
  function dominantColor(url) {
    if (url in colorCache) return Promise.resolve(colorCache[url]);
    return new Promise(resolve => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onerror = () => resolve(null);
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = c.height = 24;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 24, 24);
        let d;
        try { d = ctx.getImageData(0, 0, 24, 24).data; } catch { return resolve(null); }
        // Moyenne pondérée par la saturation : les couleurs vives comptent, le noir/gris/blanc non
        let r = 0, g = 0, b = 0, w = 0;
        for (let i = 0; i < d.length; i += 4) {
          const max = Math.max(d[i], d[i + 1], d[i + 2]), min = Math.min(d[i], d[i + 1], d[i + 2]);
          const wt = max ? ((max - min) / max) ** 2 * (max / 255) : 0;
          r += d[i] * wt; g += d[i + 1] * wt; b += d[i + 2] * wt; w += wt;
        }
        if (w < 1) return resolve(colorCache[url] = null);
        // Éclaircit jusqu'à ce que le canal le plus fort atteigne 255 : même teinte, plus lumineuse
        const rgb = [r / w, g / w, b / w];
        const k = 255 / Math.max(...rgb);
        resolve(colorCache[url] = rgb.map(v => Math.round(v * k)).join(', '));
      };
      img.src = url;
    });
  }

  async function applyItemColor(item) {
    const id = item.SeriesId || item.Id;
    const url = api().getImageUrl(id, { type: 'Primary', maxWidth: 96 });
    const rgb = await dominantColor(url);
    if (rgb && currentItemId === item.Id) root.style.setProperty('--glow', rgb);
  }

  /* ---------- Pilules de saisons ---------- */
  async function renderSeasonPills(item) {
    const seriesId = item.Type === 'Series' ? item.Id : item.SeriesId;
    if (!seriesId) return;
    const page = visiblePage();
    const anchor = page.querySelector('#listChildrenCollapsible');
    if (!anchor || page.querySelector('.dockSeasonPills')) return;

    const res = await api().getSeasons(seriesId, { userId: api().getCurrentUserId() });
    const seasons = res.Items || [];
    if (seasons.length < 2 || currentItemId !== item.Id || page.querySelector('.dockSeasonPills')) return;

    const nav = document.createElement('nav');
    nav.className = 'dockSeasonPills';
    nav.setAttribute('aria-label', 'Saisons');
    for (const s of seasons) {
      const a = document.createElement('a');
      a.href = `#/details?id=${s.Id}&serverId=${api().serverId()}`;
      a.textContent = s.IndexNumber === 0 ? 'Spéciaux' : `S${s.IndexNumber ?? '?'}`;
      a.title = s.Name;
      if (s.Id === item.Id || s.Id === item.SeasonId) a.classList.add('current');
      if (s.UserData && s.UserData.Played) a.classList.add('played');
      nav.appendChild(a);
    }
    anchor.before(nav);
  }

  /* ---------- Bandeau d'accueil ---------- */
  let heroTimer = null;

  async function renderHero() {
    const page = visiblePage();
    const sections = page.querySelector('.homeSectionsContainer');
    if (!sections || page.querySelector('.dockHero')) return;

    const res = await api().getItems(api().getCurrentUserId(), {
      SortBy: 'DateCreated', SortOrder: 'Descending', Recursive: true,
      IncludeItemTypes: 'Movie,Series', ImageTypes: 'Backdrop', Fields: 'Overview', Limit: 8
    });
    const items = (res.Items || []).filter(i => i.Overview);
    if (!items.length || page.querySelector('.dockHero')) return;

    const hero = document.createElement('section');
    hero.className = 'dockHero';
    const dots = document.createElement('div');
    dots.className = 'dockHeroDots';

    items.forEach((item, i) => {
      const slide = document.createElement('a');
      slide.className = 'dockHeroSlide' + (i === 0 ? ' active' : '');
      slide.href = `#/details?id=${item.Id}&serverId=${api().serverId()}`;
      slide.style.backgroundImage = `url("${api().getImageUrl(item.Id, { type: 'Backdrop', maxWidth: 1920, tag: item.BackdropImageTags[0] })}")`;

      const info = document.createElement('div');
      info.className = 'dockHeroInfo';
      if (item.ImageTags && item.ImageTags.Logo) {
        const logo = document.createElement('img');
        logo.className = 'dockHeroLogo';
        logo.alt = item.Name;
        logo.src = api().getImageUrl(item.Id, { type: 'Logo', maxWidth: 600, tag: item.ImageTags.Logo });
        info.appendChild(logo);
      } else {
        const title = document.createElement('h2');
        title.className = 'dockHeroTitle';
        title.textContent = item.Name;
        info.appendChild(title);
      }
      const meta = document.createElement('div');
      meta.className = 'dockHeroMeta';
      meta.textContent = [item.ProductionYear, item.Type === 'Series' ? 'Série' : 'Film', item.OfficialRating].filter(Boolean).join(' · ');
      const overview = document.createElement('p');
      overview.className = 'dockHeroOverview';
      overview.textContent = item.Overview;
      const cta = document.createElement('span');
      cta.className = 'dockHeroButton';
      cta.textContent = 'Voir';
      info.append(meta, overview, cta);
      slide.appendChild(info);
      hero.appendChild(slide);

      const dot = document.createElement('button');
      dot.type = 'button';
      dot.setAttribute('aria-label', item.Name);
      dot.addEventListener('click', () => show(i));
      dots.appendChild(dot);
    });
    dots.firstChild.classList.add('active');
    hero.appendChild(dots);
    sections.before(hero);

    let index = 0;
    function show(i) {
      hero.children[index].classList.remove('active');
      dots.children[index].classList.remove('active');
      index = (i + items.length) % items.length;
      hero.children[index].classList.add('active');
      dots.children[index].classList.add('active');
    }
    clearInterval(heroTimer);
    if (!reducedMotion && items.length > 1) {
      heroTimer = setInterval(() => {
        if (!hero.isConnected) return clearInterval(heroTimer);
        if (hero.offsetParent && !hero.matches(':hover') && !document.hidden) show(index + 1);
      }, 8000);
    }
  }

  /* ---------- « Surprends-moi » ---------- */
  const detailsHref = id => `#/details?id=${id}&serverId=${api().serverId()}`;

  function ensureDiceButton() {
    if (document.querySelector('.dockDice')) return;
    const bar = document.querySelector('.MuiAppBar-positionFixed > .MuiToolbar-root:not(.padded-left)')
      || document.querySelector('html:not(.layout-tv) .skinHeader .headerRight');
    if (!bar || !bar.lastElementChild) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dockDice';
    btn.title = 'Surprends-moi';
    btn.setAttribute('aria-label', 'Surprends-moi');
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.6" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.6" fill="currentColor"/></svg>';
    btn.addEventListener('click', () => surprise().catch(() => {}));
    bar.lastElementChild.before(btn);
  }

  async function surprise() {
    document.querySelector('.dockSurprise')?.remove();
    const res = await api().getItems(api().getCurrentUserId(), {
      SortBy: 'Random', Recursive: true, IncludeItemTypes: 'Movie,Series',
      IsPlayed: false, ImageTypes: 'Primary', Fields: 'Overview', Limit: 14
    });
    const items = res.Items || [];
    if (!items.length) return;
    const posters = items.map(i => api().getImageUrl(i.Id, { type: 'Primary', maxWidth: 400, tag: i.ImageTags.Primary }));
    // Précharge les affiches pour que le défilement ne clignote pas
    await Promise.all(posters.map(src => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = src; })));

    const overlay = document.createElement('div');
    overlay.className = 'dockSurprise';
    overlay.innerHTML = '<div class="dockSurpriseCard" role="dialog" aria-label="Surprends-moi"><img class="dockSurprisePoster" alt=""><div class="dockSurpriseInfo"><h2></h2><p class="dockSurpriseMeta"></p><p class="dockSurpriseOverview"></p><div class="dockSurpriseActions"><a class="dockSurpriseGo">Voir</a><button type="button" class="dockSurpriseAgain">Encore</button></div></div></div>';
    const img = overlay.querySelector('img');
    const close = () => { overlay.remove(); document.removeEventListener('keydown', onKey); };
    const onKey = e => { if (e.key === 'Escape') close(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    overlay.querySelector('.dockSurpriseAgain').addEventListener('click', () => { close(); surprise().catch(() => {}); });
    overlay.querySelector('.dockSurpriseGo').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);

    // Les affiches défilent de plus en plus lentement, puis s'arrêtent sur la dernière
    const pick = items[items.length - 1];
    let step = reducedMotion ? items.length - 1 : 0;
    await new Promise(done => {
      const next = () => {
        img.src = posters[step];
        if (step === items.length - 1) return done();
        step++;
        setTimeout(next, 60 + step * step * 2.2);
      };
      next();
    });
    overlay.querySelector('h2').textContent = pick.Name;
    overlay.querySelector('.dockSurpriseMeta').textContent = [pick.ProductionYear, pick.Type === 'Series' ? 'Série' : 'Film', pick.OfficialRating].filter(Boolean).join(' · ');
    overlay.querySelector('.dockSurpriseOverview').textContent = pick.Overview || '';
    overlay.querySelector('.dockSurpriseGo').href = detailsHref(pick.Id);
    overlay.classList.add('revealed');
    applyColorFrom(posters[items.length - 1], overlay);
  }

  // Le halo de la fenêtre prend la couleur de l'affiche tirée
  async function applyColorFrom(url, el) {
    const rgb = await dominantColor(url);
    if (rgb) el.style.setProperty('--glow', rgb);
  }

  /* ---------- Badges 4K / HDR / VF / VOSTFR ---------- */
  const badgeCache = {};
  const FR = ['fre', 'fra', 'fr', 'french'];

  function badgesFor(item) {
    const streams = item.MediaStreams || [];
    const video = streams.find(s => s.Type === 'Video');
    const audioFr = streams.some(s => s.Type === 'Audio' && FR.includes((s.Language || '').toLowerCase()));
    const subFr = streams.some(s => s.Type === 'Subtitle' && FR.includes((s.Language || '').toLowerCase()));
    const out = [];
    if (video && (video.Width >= 3800 || video.Height >= 2100)) out.push(['4K', 'uhd']);
    if (video && video.VideoRange && video.VideoRange !== 'SDR') out.push([video.VideoRangeType && video.VideoRangeType.startsWith('DOVI') ? 'DV' : 'HDR', 'hdr']);
    if (audioFr) out.push(['VF', 'lang']);
    else if (subFr) out.push(['VOSTFR', 'lang']);
    return out;
  }

  function paintBadges(card, list) {
    const box = card.querySelector('.cardScalable');
    if (!box || !list.length || box.querySelector('.dockBadges')) return;
    const wrap = document.createElement('div');
    wrap.className = 'dockBadges';
    for (const [label, kind] of list) {
      const b = document.createElement('span');
      b.className = 'dockBadge-' + kind;
      b.textContent = label;
      wrap.appendChild(b);
    }
    box.appendChild(wrap);
  }

  let badgeBusy = false;
  async function scanBadges() {
    if (badgeBusy) return;
    const cards = [...document.querySelectorAll('.card[data-id]:not([data-dock-badged])')]
      .filter(c => c.dataset.type === 'Movie' || c.dataset.type === 'Episode');
    if (!cards.length) return;
    cards.forEach(c => { c.dataset.dockBadged = '1'; });

    const missing = [...new Set(cards.map(c => c.dataset.id).filter(id => !(id in badgeCache)))].slice(0, 80);
    if (missing.length) {
      badgeBusy = true;
      try {
        const res = await api().getItems(api().getCurrentUserId(), { Ids: missing.join(','), Fields: 'MediaStreams' });
        for (const it of res.Items || []) badgeCache[it.Id] = badgesFor(it);
        missing.forEach(id => { if (!(id in badgeCache)) badgeCache[id] = []; });
      } finally { badgeBusy = false; }
    }
    cards.forEach(c => paintBadges(c, badgeCache[c.dataset.id] || []));
  }

  /* ---------- Routage ----------
     Jellyfin change de page sans recharger : on surveille l'adresse et on réessaie tant que
     les éléments de la page ne sont pas encore affichés. */
  let currentItemId = null;
  let lastHref = '';
  let tries = 0;

  async function onRoute() {
    if (!api() || !api().getCurrentUserId()) return;
    const hash = location.hash;
    const detail = hash.match(/details\?(?:.*&)?id=([0-9a-f]+)/i);

    if (detail) {
      if (currentItemId !== detail[1]) {
        currentItemId = detail[1];
        const item = await api().getItem(api().getCurrentUserId(), currentItemId);
        if (currentItemId !== item.Id) return;
        onRoute.item = item;
        applyItemColor(item);
      }
      const item = onRoute.item;
      if (item && ['Series', 'Season'].includes(item.Type)) renderSeasonPills(item).catch(() => {});
      return;
    }

    if (currentItemId) {
      currentItemId = null;
      root.style.removeProperty('--glow');
    }
    if (/^#\/home(\.html)?(\?(?!.*tab=[1-9]).*)?$/.test(hash) || hash === '' || hash === '#/') {
      renderHero().catch(() => {});
    }
  }

  setInterval(() => {
    if (location.href !== lastHref) { lastHref = location.href; tries = 0; }
    // Quelques passages après chaque changement de page, le temps que Jellyfin affiche le contenu
    if (tries++ < 12) onRoute().catch(() => {});
    if (!api() || !api().getCurrentUserId()) return;
    ensureDiceButton();
    scanBadges().catch(() => {});
  }, 500);
})();
