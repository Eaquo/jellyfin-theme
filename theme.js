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
  }, 500);
})();
