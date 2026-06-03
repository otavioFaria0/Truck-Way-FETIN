// ============================================================
//  mapas.js — Truckway  (versão melhorada)
//  Melhorias implementadas:
//    • watchPosition() para rastreamento em tempo real
//    • Ícone do caminhão rotaciona com base no heading
//    • Rerouting automático se desviar mais de 80m da rota
//    • Modo noturno automático (após 18h) ou manual
//    • Alerta de POIs próximos durante navegação ativa
// ============================================================

(function () {

  // ─────────────────────────────────────────
  //  Estado interno
  // ─────────────────────────────────────────
  let _mapa          = null;
  let _camadaPOI     = null;
  let _mapaPreview   = null;
  let _watchId       = null;          // ID do watchPosition
  let _markerUsuario = null;          // marker do caminhão (atualizado em tempo real)
  let _posicaoAtual  = null;          // { lat, lon } mais recente
  let _modoNoturno   = false;
  let _alertadosPOI  = new Set();     // IDs de POIs já alertados nesta sessão
  let _layerTile     = null;          // referência à camada de tiles

  const COORDS_PADRAO = [-22.2568, -45.7036]; // Inatel

  const TILES = {
    dia:   'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    noite: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
  };

  // ══════════════════════════════════════════
  //  CICLO DE VIDA DO MAPA
  // ══════════════════════════════════════════

  function _destruirMapa() {
    _pararRastreamento();
    if (_mapa) {
      _mapa.remove();
      _mapa          = null;
      _camadaPOI     = null;
      _markerUsuario = null;
      _layerTile     = null;
    }
  }

  function _destruirMapaPreview() {
    if (_mapaPreview) {
      _mapaPreview.remove();
      _mapaPreview = null;
    }
  }

  // ── Preview (tela inicial) ──────────────────

  function _criarMapaPreview(coords) {
    const preview = document.getElementById('inicio-mapa-preview');
    if (!preview) return;
    _destruirMapaPreview();

    _mapaPreview = L.map('inicio-mapa-preview', {
      zoomControl: false, attributionControl: false,
      dragging: false, scrollWheelZoom: false,
      doubleClickZoom: false, boxZoom: false,
      touchZoom: false, keyboard: false, tap: false,
    }).setView(coords, 12);

    L.tileLayer(_modoNoturno ? TILES.noite : TILES.dia, { maxZoom: 19, opacity: _modoNoturno ? 0.92 : 1 }).addTo(_mapaPreview);
    L.circle(coords, { radius: 300, color: '#0c61eb', fillColor: 'rgba(12,97,235,0.18)', weight: 2 }).addTo(_mapaPreview);
    setTimeout(() => { if (_mapaPreview) _mapaPreview.invalidateSize(); }, 200);
  }

  // ── Mapa principal ──────────────────────────

  function _criarMapa(coords, precisao = null) {
    const container = document.getElementById('mapa-container');
    if (!container) return;
    _destruirMapa();

    _mapa = L.map('mapa-container', {
      zoomControl: false,
      attributionControl: true,
    }).setView(coords, 15);

    L.control.zoom({ position: 'bottomright' }).addTo(_mapa);

    _layerTile = L.tileLayer(_modoNoturno ? TILES.noite : TILES.dia, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
      opacity: _modoNoturno ? 0.92 : 1,
    }).addTo(_mapa);

    document.querySelector('.mapa-wrapper')?.classList.toggle('mapa-wrapper--noite', _modoNoturno);

    // Cria marker do usuário
    _markerUsuario = L.marker(coords, { icon: _criarIconeUsuario(null) })
      .addTo(_mapa)
      .bindPopup(_textoPopup(precisao));

    setTimeout(() => { if (_mapa) _mapa.invalidateSize(); }, 200);

    _adicionarPOIs();
    _adicionarBotaoModoNoturno();
    _adicionarBotaoCentralizar();
  }

  // ══════════════════════════════════════════
  //  ÍCONE DO CAMINHÃO (rotaciona com heading)
  // ══════════════════════════════════════════

  function _criarIconeUsuario(heading) {
    const rotacao = (heading !== null && heading !== undefined) ? heading : 0;
    const temHeading = heading !== null && heading !== undefined;

    return L.divIcon({
      className: '',
      html: `
        <div class="pin-usuario" style="transform: rotate(${rotacao}deg)">
          <div class="pin-usuario__pulso"></div>
          ${temHeading
            ? `<div class="pin-usuario__caminhao">🚛</div>`
            : `<div class="pin-usuario__ponto"></div>`
          }
        </div>`,
      iconSize:   [40, 40],
      iconAnchor: [20, 20],
    });
  }

  function _textoPopup(precisao) {
    return precisao !== null
      ? `<b>Você está aqui</b><br><small>Precisão: ~${Math.round(precisao)} m</small>`
      : `<b>Truckway</b><br><small>Inatel — Santa Rita do Sapucaí</small>`;
  }

  // ══════════════════════════════════════════
  //  GEOLOCALIZAÇÃO EM TEMPO REAL
  // ══════════════════════════════════════════

  function _inicializarComGeolocalizacao() {
    if (!document.getElementById('mapa-container')) return;

    if (!navigator.geolocation) {
      _criarMapa(COORDS_PADRAO);
      return;
    }

    _mostrarCarregando(true);

    // Primeiro fix rápido para montar o mapa imediatamente
    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude, accuracy } }) => {
        _mostrarCarregando(false);
        _posicaoAtual = { lat: latitude, lon: longitude };
        _criarMapa([latitude, longitude], accuracy);

        // Depois ativa o rastreamento contínuo
        _iniciarRastreamento();
      },
      () => {
        _mostrarCarregando(false);
        _criarMapa(COORDS_PADRAO);
        _iniciarRastreamento(); // tenta mesmo assim
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }

  function _iniciarRastreamento() {
    if (_watchId !== null) return; // já está rodando

    _watchId = navigator.geolocation.watchPosition(
      ({ coords: { latitude, longitude, accuracy, heading, speed } }) => {
        _posicaoAtual = { lat: latitude, lon: longitude };
        _atualizarPosicaoUsuario(latitude, longitude, accuracy, heading, speed);
        _verificarPOIsProximos(latitude, longitude);
        _verificarDesvioDeRota(latitude, longitude);
      },
      (err) => {
        console.warn('[Truckway] Erro de geolocalização:', err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,       // sempre posição fresca
        timeout: 10000,
      }
    );
  }

  function _pararRastreamento() {
    if (_watchId !== null) {
      navigator.geolocation.clearWatch(_watchId);
      _watchId = null;
    }
  }

  function _atualizarPosicaoUsuario(lat, lon, precisao, heading, speed) {
    if (!_mapa) return;

    const novasCoords = [lat, lon];

    if (_markerUsuario) {
      // Atualiza posição sem recriar o marker (mais suave)
      _markerUsuario.setLatLng(novasCoords);
      _markerUsuario.setIcon(_criarIconeUsuario(heading));

      // Atualiza popup se aberto
      if (_markerUsuario.isPopupOpen()) {
        const velKmh = speed ? Math.round(speed * 3.6) : 0;
        _markerUsuario.setPopupContent(
          `<b>Você está aqui</b><br>
           <small>Precisão: ~${Math.round(precisao)} m</small><br>
           ${velKmh > 0 ? `<small>Velocidade: ${velKmh} km/h</small>` : ''}`
        );
      }
    } else {
      _markerUsuario = L.marker(novasCoords, { icon: _criarIconeUsuario(heading) })
        .addTo(_mapa)
        .bindPopup(_textoPopup(precisao));
    }

    // Se estiver em modo navegação, centraliza o mapa no caminhão
    if (window.TruckwayNavegando) {
      _mapa.setView(novasCoords, _mapa.getZoom(), { animate: true, duration: 0.5 });
    }
  }

  // ══════════════════════════════════════════
  //  VERIFICAÇÃO DE POIs PRÓXIMOS
  // ══════════════════════════════════════════

  function _verificarPOIsProximos(lat, lon) {
    if (typeof Dados === 'undefined') return;

    const RAIO_ALERTA_M = 5000; // 5 km

    [...Dados.pontosDeApoio, ...Dados.balancas].forEach((poi) => {
      if (_alertadosPOI.has(poi.id)) return;

      const dist = _calcularDistancia(lat, lon, poi.coords[0], poi.coords[1]);
      if (dist <= RAIO_ALERTA_M) {
        _alertadosPOI.add(poi.id);
        const emoji = poi.tipo === 'posto' ? '⛽' : '⚖️';
        const distKm = (dist / 1000).toFixed(1);
        _exibirToast(`${emoji} ${poi.nome} — a ${distKm} km`);
      }
    });
  }

  // ══════════════════════════════════════════
  //  REROUTING — detecta desvio da rota ativa
  // ══════════════════════════════════════════

  function _verificarDesvioDeRota(lat, lon) {
    const estado = window.TruckwayEstado;
    if (!estado?.rotaGeoJSON) return; // não há rota calculada

    const DESVIO_MAX_M = 80;
    const distMinima = _distanciaParaGeoJSON(lat, lon, estado.rotaGeoJSON);

    if (distMinima > DESVIO_MAX_M) {
      // Evita recalcular múltiplas vezes em sequência
      if (window._truckwayRecalculando) return;
      window._truckwayRecalculando = true;

      _exibirToast('🔄 Fora da rota — recalculando…');

      setTimeout(() => {
        window._truckwayRecalculando = false;
      }, 15000); // aguarda 15s antes de poder recalcular novamente

      // Dispara o recálculo de rota se o módulo rota.js estiver ativo
      if (typeof window.TruckwayRecalcularRota === 'function') {
        window.TruckwayRecalcularRota({ lat, lon });
      }
    }
  }

  // Distância em metros do ponto até a polyline do GeoJSON
  function _distanciaParaGeoJSON(lat, lon, geojson) {
    let minDist = Infinity;
    const coords = geojson?.features?.[0]?.geometry?.coordinates || [];

    for (let i = 0; i < coords.length - 1; i++) {
      const [ax, ay] = coords[i];
      const [bx, by] = coords[i + 1];
      const d = _distanciaPontoSegmento(lat, lon, ay, ax, by, bx);
      if (d < minDist) minDist = d;
    }

    return minDist;
  }

  // Distância aproximada em metros de um ponto a um segmento de reta
  function _distanciaPontoSegmento(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return _calcularDistancia(px, py, ax, ay);
    let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return _calcularDistancia(px, py, ax + t * dx, ay + t * dy);
  }

  // Haversine (metros)
  function _calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // ══════════════════════════════════════════
  //  MODO NOTURNO
  // ══════════════════════════════════════════

  function _detectarModoNoturno() {
    const preferDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const hora = new Date().getHours();
    _modoNoturno =  hora >= 18 || hora < 6 || preferDark;
  }

  function _alternarModoNoturno() {
    _modoNoturno = !_modoNoturno;

    if (_mapa && _layerTile) {
      _mapa.removeLayer(_layerTile);
      _layerTile = L.tileLayer(_modoNoturno ? TILES.noite : TILES.dia, {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
        opacity: _modoNoturno ? 0.92 : 1,
      }).addTo(_mapa);
      // Garante que o tile fique abaixo dos marcadores
      _layerTile.setZIndex(0);
    }

    document.querySelector('.mapa-wrapper')?.classList.toggle('mapa-wrapper--noite', _modoNoturno);

    const btn = document.getElementById('btn-modo-noturno');
    if (btn) btn.textContent = _modoNoturno ? '☀️' : '🌙';
  }

  function _adicionarBotaoModoNoturno() {
    if (!_mapa) return;

    document.getElementById('btn-modo-noturno')?.remove();

    const btn = document.createElement('button');
    btn.id = 'btn-modo-noturno';
    btn.className = 'mapa-controle mapa-controle--modo';
    btn.type = 'button';
    btn.textContent = _modoNoturno ? '☀️' : '🌙';
    btn.title = 'Alternar modo noturno';
    btn.style.position = 'absolute';
    btn.style.bottom = '100px';
    btn.style.right = '10px';
    btn.addEventListener('click', _alternarModoNoturno);
    document.querySelector('.mapa-wrapper')?.appendChild(btn);
  }

  function _adicionarBotaoCentralizar() {
    if (!_mapa) return;

    const wrapper = document.querySelector('.mapa-wrapper');
    if (!wrapper) return;

    document.getElementById('btn-centralizar')?.remove();

    const btn = document.createElement('button');
    btn.id = 'btn-centralizar';
    btn.className = 'mapa-controle mapa-controle--centralizar';
    btn.type = 'button';
    btn.title = 'Centralizar na minha posição';
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" style="display:block;">
        <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.07-7.07l-1.41 1.41M7.34 16.66l-1.41 1.41m0-11.32l1.41 1.41M16.66 16.66l1.41 1.41" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" stroke-width="2"/>
      </svg>
    `;
    btn.style.position = 'absolute';
    btn.style.bottom = '156px';
    btn.style.right = '10px';
    btn.addEventListener('click', () => {
      if (!_mapa) return;

      const alvo = _posicaoAtual
        ? [_posicaoAtual.lat, _posicaoAtual.lon]
        : (_markerUsuario ? _markerUsuario.getLatLng() : null);

      if (alvo) {
        _mapa.flyTo(alvo, 15, { animate: true, duration: 0.8 });
        return;
      }

      _exibirToast('Aguardando posição do GPS. Por favor, permita a localização.');
    });

    wrapper.appendChild(btn);
  }

  // ══════════════════════════════════════════
  //  TOAST DE NOTIFICAÇÃO
  // ══════════════════════════════════════════

  function _exibirToast(mensagem, duracaoMs = 4000) {
    const wrapper = document.querySelector('.mapa-wrapper') || document.body;
    const toast = document.createElement('div');
    toast.style.cssText = `
      position:absolute; top:80px; left:50%; transform:translateX(-50%);
      z-index:2000; background:#1f2937; color:#fff; padding:10px 18px;
      border-radius:20px; font-size:13px; font-weight:600;
      box-shadow:0 4px 14px rgba(0,0,0,0.3); white-space:nowrap;
      animation:slideDown 0.3s ease;
    `;
    toast.textContent = mensagem;

    // Injetar keyframe se ainda não existe
    if (!document.getElementById('truckway-toast-style')) {
      const style = document.createElement('style');
      style.id = 'truckway-toast-style';
      style.textContent = `@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`;
      document.head.appendChild(style);
    }

    wrapper.appendChild(toast);
    setTimeout(() => toast.remove(), duracaoMs);
  }

  // ══════════════════════════════════════════
  //  BUSCA NO MAPA
  // ══════════════════════════════════════════

  function _inicializarBusca() {
    const input = document.getElementById('busca-mapa-input');
    const botao = document.getElementById('busca-mapa-botao');
    if (!input || !botao) return;

    // Retoma busca vinda da aba Apoio (via sessionStorage)
    try {
      const busca = sessionStorage.getItem('truckway_busca');
      if (busca) { input.value = busca; sessionStorage.removeItem('truckway_busca'); _executarBusca(input.value); }
    } catch (e) { /* ignore */ }

    function executarBusca() { _executarBusca(input.value.trim()); }

    botao.addEventListener('click', executarBusca);
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') executarBusca(); });
  }

  async function _executarBusca(termo) {
    if (!termo || !_mapa) return;

    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(termo)}&limit=1&countrycodes=br`,
        { headers: { 'Accept-Language': 'pt-BR,pt' } }
      );
      const lista = await r.json();
      if (!lista.length) { _exibirToast('Nenhum local encontrado.'); return; }

      const { lat, lon, display_name } = lista[0];
      _mapa.flyTo([+lat, +lon], 14, { animate: true, duration: 1 });
      L.popup().setLatLng([+lat, +lon]).setContent(`<b>${display_name}</b>`).openOn(_mapa);
    } catch {
      _exibirToast('Erro ao buscar. Verifique sua conexão.');
    }
  }

  // ══════════════════════════════════════════
  //  MARCADORES DE POI
  // ══════════════════════════════════════════

  function _adicionarPOIs() {
    if (!_mapa || typeof Dados === 'undefined') return;

    if (_camadaPOI) {
      _camadaPOI.clearLayers();
    } else {
      _camadaPOI = L.layerGroup().addTo(_mapa);
    }

    Dados.pontosDeApoio.forEach((ponto) => {
      const icone = L.divIcon({
        className: '',
        html: `<div class="pin-poi pin-poi--posto" title="${ponto.nome}">⛽</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      });
      const estrelas = '★'.repeat(Math.round(ponto.avaliacao)) + '☆'.repeat(5 - Math.round(ponto.avaliacao));
      L.marker(ponto.coords, { icon: icone }).addTo(_camadaPOI).bindPopup(`
        <div class="popup-poi">
          <strong>${ponto.nome}</strong>
          <span class="popup-poi__rodovia">${ponto.rodovia}</span>
          <p>${ponto.descricao}</p>
          <span class="popup-poi__estrelas">${estrelas} (${ponto.avaliacao})</span>
        </div>`);
    });

    Dados.balancas.forEach((balanca) => {
      const icone = L.divIcon({
        className: '',
        html: `<div class="pin-poi pin-poi--balanca ${balanca.operando ? '' : 'pin-poi--inativo'}" title="${balanca.nome}">⚖️</div>`,
        iconSize: [36, 36], iconAnchor: [18, 18],
      });
      L.marker(balanca.coords, { icon: icone }).addTo(_camadaPOI).bindPopup(`
        <div class="popup-poi">
          <strong>${balanca.nome}</strong>
          <span class="popup-poi__rodovia">${balanca.rodovia}</span>
          <p>${balanca.descricao}</p>
          <span class="popup-poi__status ${balanca.operando ? 'popup-poi__status--ok' : 'popup-poi__status--off'}">
            ${balanca.operando ? '● Em operação' : '○ Inativo / variável'}
          </span>
        </div>`);
    });
  }

  // ══════════════════════════════════════════
  //  CARREGANDO
  // ══════════════════════════════════════════

  function _mostrarCarregando(visivel) {
    const el = document.getElementById('mapa-carregando');
    if (el) el.hidden = !visivel;
  }

  // ══════════════════════════════════════════
  //  OBSERVER — limpa ao sair da aba
  // ══════════════════════════════════════════

  function _observarRemocao() {
    const conteudo = document.getElementById('conteudo');
    if (!conteudo) return;

    const observer = new MutationObserver(() => {
      if (!document.getElementById('mapa-container')) {
        _destruirMapa();
      }
      if (!document.getElementById('inicio-mapa-preview')) {
        _destruirMapaPreview();
      }
      if (!document.getElementById('mapa-container') && !document.getElementById('inicio-mapa-preview')) {
        observer.disconnect();
      }
    });

    observer.observe(conteudo, { childList: true, subtree: false });
  }

  // ══════════════════════════════════════════
  //  HOOKS PRINCIPAIS
  // ══════════════════════════════════════════

  function _hookMapa() {
    _alertadosPOI.clear();
    _detectarModoNoturno();
    _inicializarComGeolocalizacao();
    _inicializarBusca();
    _observarRemocao();
  }

  function _hookInicio() {
    _modoNoturno = false;
    document.querySelector('.mapa-wrapper')?.classList.remove('mapa-wrapper--noite');

    if (!document.getElementById('inicio-mapa-preview')) return;

    if (!navigator.geolocation) {
      _criarMapaPreview(COORDS_PADRAO);
    } else {
      navigator.geolocation.getCurrentPosition(
        ({ coords: { latitude, longitude } }) => _criarMapaPreview([latitude, longitude]),
        () => _criarMapaPreview(COORDS_PADRAO),
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
      );
    }

    const preview = document.getElementById('inicio-mapa-preview');
    if (preview) {
      function navegarMapa() { window.Roteador?.ir('mapa'); }
      preview.addEventListener('click', navegarMapa);
      preview.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navegarMapa(); }
      });
    }

    if (typeof iniciarInicio === 'function') iniciarInicio();
    _observarRemocao();
  }

  // ══════════════════════════════════════════
  //  REGISTRO
  // ══════════════════════════════════════════

  function _registrar() {
    if (window.Roteador) {
      window.Roteador.registrarHook('mapa', _hookMapa);
      window.Roteador.registrarHook('inicio', _hookInicio);
    } else {
      window.addEventListener('load', () => {
        window.Roteador?.registrarHook('mapa', _hookMapa);
        window.Roteador?.registrarHook('inicio', _hookInicio);
      });
    }
  }

  _registrar();

  if (typeof window !== 'undefined') {
    window.inicializarMapa = _hookMapa;
    // Expõe a posição atual para outros módulos
    Object.defineProperty(window, 'TruckwayPosicaoAtual', {
      get: () => _posicaoAtual,
    });
  }

})();