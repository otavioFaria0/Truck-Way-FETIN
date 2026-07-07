// ============================================================
//  js/paginas/rota.js — Truckway  (versão melhorada)
//  Melhorias implementadas:
//    • Suporte a múltiplos waypoints (paradas intermediárias)
//    • Instruções de manobra (turn-by-turn) com painel dedicado
//    • Botão "Usar minha localização" como origem
//    • Rerouting automático integrado com mapas.js
//    • Painel de navegação ativa com próxima instrução
//    • Estimativa de combustível por tipo de veículo
// ============================================================

(function () {

  // ── Estado ──────────────────────────────────────────────────────────
  let _mapa             = null;
  let _camadaRota       = null;
  let _origemCoords     = null;
  let _destinoCoords    = null;
  let _waypointsCoords  = [];   // array de paradas intermediárias [{lat,lon,nome}]
  let _instrucoes       = [];   // array de steps retornados pelo ORS
  let _instrucaoAtual   = 0;    // índice da instrução sendo exibida
  let _modoNavegando    = false;
  let _dimAtual         = { peso: 16, altura: 4.4, largura: 2.6, comprimento: 14.0 };

  // Consumo médio em litros/100km por tipo de veículo (referência ANTT)
  const CONSUMO_VEICULO = {
    toco:      28,
    truck:     35,
    carreta:   40,
    bitrem:    46,
    rodotrem:  52,
    vuc:       15,
    mini:      12,
  };
  let _veiculoAtivo = 'toco';

  const Config = window.Config || {
    NOMINATIM_URL: 'https://nominatim.openstreetmap.org',
    ORS_BASE_URL: 'https://api.openrouteservice.org',
    ORS_PERFIL: 'driving-hgv',
    ORS_API_KEY: '',
  };
  window.Config = window.Config || Config;

  function _debounce(fn, wait = 300) {
    let t = null;
    return function (...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); };
  }
  const _debouncedRecalcular = _debounce(() => {
    if (_origemCoords && _destinoCoords) _onCalcular();
  }, 350);


  // ══════════════════════════════════════════
  //  MAPA
  // ══════════════════════════════════════════

  function _inicializarMapa() {
    const container = document.getElementById('rota-mapa-container');
    if (!container || _mapa) return;

    _mapa = L.map('rota-mapa-container', {
      zoomControl: false,
      attributionControl: true,
    }).setView([-15.78, -47.93], 5);

    L.control.zoom({ position: 'bottomright' }).addTo(_mapa);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(_mapa);

    _camadaRota = L.layerGroup().addTo(_mapa);
    // camada para desenhar bloqueios salvos
    _camadaBloqueiosRota = L.layerGroup().addTo(_mapa);

    if (window.TruckwayEstado?.rotaGeoJSON) {
      setTimeout(() => { _mapa.invalidateSize(); _desenharRota(); }, 300);
    } else {
      setTimeout(() => _mapa.invalidateSize(), 300);
    }
  }

  function _desenharBloqueiosRota() {
    if (!_mapa) return;
    if (!_camadaBloqueiosRota) _camadaBloqueiosRota = L.layerGroup().addTo(_mapa);
    _camadaBloqueiosRota.clearLayers();
    const bloqueios = window.TruckwayBloqueiosGeoJSON?.features || [];
    bloqueios.forEach((feat) => {
      try {
        if (feat.geometry?.type === 'LineString') {
          const coords = feat.geometry.coordinates.map(c => [c[1], c[0]]);
          L.polyline(coords, { color: '#d33', weight: 6, opacity: 0.9 }).addTo(_camadaBloqueiosRota);
        } else if (feat.geometry?.type === 'Polygon') {
          const coords = feat.geometry.coordinates[0].map(c => [c[1], c[0]]);
          L.polygon(coords, { color: '#d33', fillColor: 'rgba(211,33,33,0.18)', weight:2 }).addTo(_camadaBloqueiosRota);
        }
      } catch (e) { console.warn('[Rota] erro desenhando bloqueio', e); }
    });
  }

  function _destruirMapa() {
    if (_mapa) { _mapa.remove(); _mapa = null; _camadaRota = null; }
    _pararNavegacao();
  }


  // ══════════════════════════════════════════
  //  DESENHAR ROTA NO MAPA
  // ══════════════════════════════════════════

  function _desenharRota() {
    const estado = window.TruckwayEstado;
    if (!_mapa || !estado?.rotaGeoJSON) return;

    _camadaRota.clearLayers();

    // Linha azul da rota
    L.geoJSON(estado.rotaGeoJSON, {
      style: { color: '#0c61eb', weight: 5, opacity: 0.9, lineJoin: 'round', lineCap: 'round' },
    }).addTo(_camadaRota);

    // Pin A (origem)
    _adicionarPin(_origemCoords, 'A', 'pin-rota--a', 'Origem');

    // Pins intermediários (C, D, E…)
    const letras = ['C', 'D', 'E', 'F', 'G'];
    _waypointsCoords.forEach((wp, i) => {
      _adicionarPin(wp, letras[i] || String(i + 3), 'pin-rota--wp', `Parada ${i + 1}`);
    });

    // Pin B (destino)
    _adicionarPin(_destinoCoords, 'B', 'pin-rota--b', 'Destino');

    const bounds = L.geoJSON(estado.rotaGeoJSON).getBounds();
    _mapa.fitBounds(bounds, { padding: [60, 60], animate: true });
  }

  function _adicionarPin(coords, letra, classe, titulo) {
    if (!coords) return;
    L.marker(
      [coords.lat, coords.lon],
      { icon: L.divIcon({ className: '', html: `<div class="pin-rota ${classe}">${letra}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }) }
    ).addTo(_camadaRota).bindPopup(`<b>${titulo}</b><br>${coords.nome?.split(',')[0] || ''}`);
  }


  // ══════════════════════════════════════════
  //  GEOCODING (Nominatim)
  // ══════════════════════════════════════════

  async function _geocodificar(termo) {
    const r = await fetch(
      `${Config.NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(termo)}&limit=1&countrycodes=br`,
      { headers: { 'Accept-Language': 'pt-BR,pt' } }
    );
    if (!r.ok) throw new Error('Geocoder indisponível.');
    const lista = await r.json();
    if (!lista.length) return null;
    return { lat: parseFloat(lista[0].lat), lon: parseFloat(lista[0].lon), nome: lista[0].display_name };
  }

  async function _buscarLocal(campo, inputEl) {
    const input = inputEl || document.getElementById(`input-${campo}`);
    const wrap  = input?.closest('.rota-campo__wrap');
    const termo = input?.value.trim();
    if (!termo) return;

    const btnId = campo === 'origem' ? 'btn-origem-busca' : campo === 'destino' ? 'btn-destino-busca' : null;
    if (btnId) _setSpinner(btnId, true);
    wrap?.classList.remove('rota-campo__wrap--ok', 'rota-campo__wrap--erro');

    try {
      const res = await _geocodificar(termo);
      if (!res) {
        wrap?.classList.add('rota-campo__wrap--erro');
        if (campo === 'origem')  _origemCoords  = null;
        if (campo === 'destino') _destinoCoords = null;
        return;
      }

      const nome = res.nome.split(',').slice(0, 2).join(',').trim();
      wrap?.classList.add('rota-campo__wrap--ok');

      if (campo === 'origem')  _origemCoords  = res;
      if (campo === 'destino') _destinoCoords = res;

      if (_mapa) _mapa.flyTo([res.lat, res.lon], 12, { animate: true, duration: 0.8 });

      return { res, nome };
    } catch {
      wrap?.classList.add('rota-campo__wrap--erro');
    } finally {
      if (btnId) _setSpinner(btnId, false);
    }
  }

  // ── Usar minha localização como origem ──────────────────────────────

  function _usarMinhaLocalizacao() {
    const btn = document.getElementById('btn-minha-localizacao');
    if (btn) { btn.disabled = true; btn.textContent = '…'; }

    if (!navigator.geolocation) {
      alert('Geolocalização não disponível neste dispositivo.');
      return;
    }

    // Tenta pegar a posição já capturada pelo mapas.js primeiro
    const posAtual = window.TruckwayPosicaoAtual;
    if (posAtual) {
      _aplicarMinhaLocalizacao(posAtual.lat, posAtual.lon, btn);
      try { window.TruckwayFollowPosition = true; } catch (e) {}
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        _aplicarMinhaLocalizacao(latitude, longitude, btn);
        try { window.TruckwayFollowPosition = true; } catch (e) {}
      },
      () => {
        alert('Não foi possível obter sua localização.');
        if (btn) { btn.disabled = false; btn.textContent = '📍'; }
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }

  async function _aplicarMinhaLocalizacao(lat, lon, btn) {
    // Geocoding reverso para obter nome legível
    try {
      const r = await fetch(
        `${Config.NOMINATIM_URL}/reverse?format=json&lat=${lat}&lon=${lon}&zoom=14`,
        { headers: { 'Accept-Language': 'pt-BR,pt' } }
      );
      const data = await r.json();
      const nome = data.display_name || `${lat.toFixed(5)}, ${lon.toFixed(5)}`;

      _origemCoords = { lat, lon, nome };

      const inputOrigem = document.getElementById('input-origem');
      if (inputOrigem) {
        inputOrigem.value = nome.split(',').slice(0, 2).join(',').trim();
        inputOrigem.closest('.rota-campo__wrap')?.classList.add('rota-campo__wrap--ok');
      }

      if (_mapa) _mapa.flyTo([lat, lon], 13, { animate: true, duration: 0.8 });
    } catch {
      _origemCoords = { lat, lon, nome: `Minha posição (${lat.toFixed(4)}, ${lon.toFixed(4)})` };
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = '📍'; }
    }
  }


  // ══════════════════════════════════════════
  //  WAYPOINTS (paradas intermediárias)
  // ══════════════════════════════════════════

  let _contadorWaypoints = 0;

  function _adicionarWaypoint() {
    const lista = document.getElementById('lista-waypoints');
    if (!lista) return;

    const id = `wp-${++_contadorWaypoints}`;
    const idx = _waypointsCoords.length;
    _waypointsCoords.push(null); // reserva posição

    const letras = ['C', 'D', 'E', 'F', 'G'];
    const letra  = letras[idx] || String(idx + 3);

    const div = document.createElement('div');
    div.id = id;
    div.className = 'rota-campo';
    div.dataset.idx = idx;
    div.innerHTML = `
      <div class="rota-campo__bolinha rota-campo__bolinha--wp">${letra}</div>
      <div class="rota-campo__wrap">
        <input class="rota-campo__input wp-input" type="search"
          placeholder="Parada ${idx + 1}" autocomplete="off" />
        <button class="rota-campo__btn wp-busca-btn" type="button" aria-label="Buscar parada">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
        <button class="rota-campo__btn wp-remover-btn" type="button" aria-label="Remover parada" style="border-left:1px solid var(--cor-borda);">✕</button>
      </div>`;

    lista.appendChild(div);

    // Busca ao clicar
    div.querySelector('.wp-busca-btn').addEventListener('click', async () => {
      const input = div.querySelector('.wp-input');
      const result = await _buscarWaypoint(input, idx);
      if (result && _origemCoords && _destinoCoords) _debouncedRecalcular();
    });

    // Busca ao pressionar Enter
    div.querySelector('.wp-input').addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      const input = div.querySelector('.wp-input');
      const result = await _buscarWaypoint(input, idx);
      if (result && _origemCoords && _destinoCoords) _debouncedRecalcular();
    });

    // Remover parada
    div.querySelector('.wp-remover-btn').addEventListener('click', () => {
      _waypointsCoords.splice(idx, 1);
      div.remove();
      // Renumera os restantes
      document.querySelectorAll('#lista-waypoints .rota-campo').forEach((el, i) => {
        el.dataset.idx = i;
        const letras2 = ['C', 'D', 'E', 'F', 'G'];
        el.querySelector('.rota-campo__bolinha').textContent = letras2[i] || String(i + 3);
        el.querySelector('.wp-input').placeholder = `Parada ${i + 1}`;
      });
      if (_origemCoords && _destinoCoords) _debouncedRecalcular();
    });
  }

  async function _buscarWaypoint(inputEl, idx) {
    const termo = inputEl.value.trim();
    if (!termo) return null;

    const wrap = inputEl.closest('.rota-campo__wrap');
    wrap?.classList.remove('rota-campo__wrap--ok', 'rota-campo__wrap--erro');

    try {
      const res = await _geocodificar(termo);
      if (!res) { wrap?.classList.add('rota-campo__wrap--erro'); _waypointsCoords[idx] = null; return null; }
      _waypointsCoords[idx] = res;
      wrap?.classList.add('rota-campo__wrap--ok');
      if (_mapa) _mapa.flyTo([res.lat, res.lon], 12, { animate: true, duration: 0.8 });
      return res;
    } catch {
      wrap?.classList.add('rota-campo__wrap--erro');
      return null;
    }
  }


  // ══════════════════════════════════════════
  //  ROTEAMENTO ORS (HGV) — N pontos
  // ══════════════════════════════════════════

  async function _chamarOSRM(pontos) {
    const coordinates = pontos.map((p) => `${p.lon},${p.lat}`).join(';');
    const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true&continue_straight=true`;

    const r = await fetch(url);
    if (!r.ok) throw new Error('Serviço de rotas temporariamente indisponível.');

    const data = await r.json();
    if (!data.routes?.length) throw new Error('Nenhuma rota encontrada.');

    const route = data.routes[0];
    return {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: route.geometry,
          properties: {
            summary: {
              distance: route.distance,
              duration: route.duration,
            },
            segments: (route.legs || []).map((leg) => ({
              steps: (leg.steps || []).map((step) => ({
                instruction: _formatOSRMStep(step),
                distance: step.distance,
                duration: step.duration,
                type: step.maneuver?.type || 0,
              })),
            })),
          },
        },
      ],
    };
  }

  function _formatOSRMStep(step) {
    const maneuver = step.maneuver || {};
    const name = step.name ? ` ${step.name}` : '';
    const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : '';
    return `${maneuver.type || 'Continue'}${modifier}${name}`.trim();
  }

  async function _chamarORS(pontos, dim) {
    if (!Config.ORS_API_KEY) {
      return _chamarOSRM(pontos);
    }

    const coordinates = pontos.map(p => [p.lon, p.lat]);

    try {
      // se houver bloqueios definidos no mapa, adiciona como avoid_polygons
      const bloqueios = window.TruckwayBloqueiosGeoJSON || null;
      const body = {
        coordinates,
        options: {
          vehicle_type: 'hgv',
          profile_params: {
            restrictions: {
              weight: parseFloat(dim.peso),
              height: parseFloat(dim.altura),
              width:  parseFloat(dim.largura),
              length: parseFloat(dim.comprimento),
            },
          },
        },
        instructions: true,
        instructions_format: 'text',
        language: 'pt',
      };
      if (bloqueios && bloqueios.features && bloqueios.features.length) {
        body.options.avoid_polygons = bloqueios;
      }

      const r = await fetch(`${Config.ORS_BASE_URL}/directions/${Config.ORS_PERFIL}/geojson`, {
        method:  'POST',
        headers: {
          'Authorization': Config.ORS_API_KEY,
          'Content-Type':  'application/json',
          'Accept':        'application/json, application/geo+json',
        },
        body: JSON.stringify(body),
      });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err?.error?.message || `Erro ${r.status}`);
      }
      return r.json();
    } catch (error) {
      console.warn('[Rota] ORS falhou, usando fallback OSRM', error);
      return _chamarOSRM(pontos);
    }
  }

  async function _onCalcular() {
    _esconderErro();

    if (!_origemCoords || !_destinoCoords) {
      _mostrarErro('Busque e confirme a origem e o destino primeiro.');
      return;
    }

    _setBotao('calculando');

    // Monta lista de pontos: origem + waypoints válidos + destino
    const pontosValidos = [
      _origemCoords,
      ..._waypointsCoords.filter(Boolean),
      _destinoCoords,
    ];

    // Se houver bloqueios definidos e não houver ORS API key, avisa o usuário
    try {
      const bloqueios = window.TruckwayBloqueiosGeoJSON?.features || [];
      if (bloqueios.length && !Config.ORS_API_KEY) {
        _mostrarErro('Existem trechos bloqueados marcados — para que o roteamento os evite automaticamente, configure uma chave ORS em `Config.ORS_API_KEY`.');
        return;
      }
    } catch (e) { /* silencioso */ }

    try {
      const geojson = await _chamarORS(pontosValidos, _dimAtual);
      const feature = geojson.features[0];
      const resumo  = feature.properties.summary;

      // Extrai instruções (steps) de todos os trechos
      _instrucoes = [];
      const segmentos = feature.properties.segments || [];
      segmentos.forEach((seg) => {
        (seg.steps || []).forEach((step) => {
          _instrucoes.push({
            instrucao: step.instruction || '',
            distancia: step.distance,
            duracao:   step.duration,
            tipo:      step.type,
          });
        });
      });
      _instrucaoAtual = 0;

      window.TruckwayEstado = {
        rotaGeoJSON:   geojson,
        resumo,
        instrucoes:    _instrucoes,
        origemCoords:  _origemCoords,
        destinoCoords: _destinoCoords,
        waypoints:     _waypointsCoords.filter(Boolean),
      };

      _desenharRota();
      _mostrarResultado(resumo);
      _setBotao('idle');

      // Registra callback de rerouting no namespace global
      window.TruckwayRecalcularRota = async (novaPosicao) => {
        if (!novaPosicao) return;
        _origemCoords = { lat: novaPosicao.lat, lon: novaPosicao.lon, nome: 'Posição atual' };
        await _onCalcular();
      };

    } catch (e) {
      console.error('[Rota]', e);
      _mostrarErro(e.message);
      _setBotao('idle');
    }
  }


  // ══════════════════════════════════════════
  //  NAVEGAÇÃO TURN-BY-TURN
  // ══════════════════════════════════════════

  function _iniciarNavegacao() {
    if (!_instrucoes.length) {
      alert('Calcule uma rota primeiro.');
      return;
    }

    _modoNavegando = true;
    window.TruckwayNavegando = true; // mapas.js usa isso para centralizar o mapa
    _instrucaoAtual = 0;

    // Atualiza botão iniciar -> parar
    const btnNav = document.getElementById('btn-iniciar-nav');
    if (btnNav) {
      btnNav.textContent = '⏹ Parar Navegação';
      btnNav.removeEventListener('click', _iniciarNavegacao);
      btnNav.addEventListener('click', _pararNavegacao);
    }

    _mostrarPainelNavegacao();
    _atualizarInstrucao();

    // Se o mapa de rota estiver ativo, centraliza na origem
    if (_mapa && _origemCoords) {
      _mapa.setView([_origemCoords.lat, _origemCoords.lon], 16);
    }
  }

  function _pararNavegacao() {
    _modoNavegando = false;
    window.TruckwayNavegando = false;
    _esconderPainelNavegacao();

    // Desativa acompanhamento de posição ao parar
    try { window.TruckwayFollowPosition = false; } catch (e) {}

    // Restaura botão iniciar
    const btnNav = document.getElementById('btn-iniciar-nav');
    if (btnNav) {
      btnNav.textContent = '🧭 Iniciar Navegação';
      btnNav.removeEventListener('click', _pararNavegacao);
      btnNav.addEventListener('click', _iniciarNavegacao);
    }
  }

  function _mostrarPainelNavegacao() {
    let painel = document.getElementById('painel-navegacao');
    if (!painel) {
      painel = document.createElement('div');
      painel.id = 'painel-navegacao';
      painel.style.cssText = `
        position:absolute; top:0; left:0; right:0; z-index:600;
        background:linear-gradient(180deg,rgba(12,97,235,0.95) 0%,rgba(12,97,235,0.9) 100%);
        color:#fff; padding:16px 20px 12px;
        box-shadow:0 4px 20px rgba(0,0,0,0.25);
        display:flex; flex-direction:column; gap:8px;
      `;

      painel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div id="nav-icon" style="font-size:28px; line-height:1;">➡️</div>
          <div style="flex:1;padding:0 12px;">
            <div id="nav-instrucao" style="font-size:15px;font-weight:700;line-height:1.3;">Iniciando navegação…</div>
            <div id="nav-distancia-step" style="font-size:12px;opacity:0.85;margin-top:2px;"></div>
          </div>
          <button id="btn-parar-nav" type="button"
            style="background:rgba(255,255,255,0.2);border:none;color:#fff;
                   padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;">
            Parar
          </button>
        </div>
        <div style="display:flex;gap:16px;font-size:12px;opacity:0.9;">
          <span>🏁 <span id="nav-dist-total">—</span></span>
          <span>⏱ <span id="nav-tempo-total">—</span></span>
          <span id="nav-passo-contador" style="margin-left:auto;opacity:0.7;"></span>
        </div>`;

      document.querySelector('.rota-wrapper')?.appendChild(painel);

      document.getElementById('btn-parar-nav')?.addEventListener('click', _pararNavegacao);
    }

    painel.hidden = false;

    // Preenche totais
    const estado = window.TruckwayEstado;
    if (estado?.resumo) {
      document.getElementById('nav-dist-total').textContent  = Dados.formatarDistancia(estado.resumo.distance);
      document.getElementById('nav-tempo-total').textContent = Dados.formatarDuracao(estado.resumo.duration);
    }
  }

  function _esconderPainelNavegacao() {
    const painel = document.getElementById('painel-navegacao');
    if (painel) painel.hidden = true;
  }

  function _atualizarInstrucao() {
    if (!_instrucoes.length) return;

    const step = _instrucoes[_instrucaoAtual] || _instrucoes[_instrucoes.length - 1];
    const ICONES_MANOBRA = {
      0: '↗️', 1: '⬆️', 2: '↗️', 3: '↘️', 4: '➡️',
      5: '↙️', 6: '↖️', 7: '⬅️', 10: '🔄', 11: '⛳',
    };

    document.getElementById('nav-instrucao').textContent   = step.instrucao || 'Continue em frente';
    document.getElementById('nav-distancia-step').textContent = step.distancia > 0
      ? `Em ${Dados.formatarDistancia(step.distancia)}`
      : '';
    document.getElementById('nav-icon').textContent = ICONES_MANOBRA[step.tipo] || '➡️';
    document.getElementById('nav-passo-contador').textContent =
      `${_instrucaoAtual + 1} / ${_instrucoes.length}`;
  }

  function _avancarInstrucao() {
    if (_instrucaoAtual < _instrucoes.length - 1) {
      _instrucaoAtual++;
      _atualizarInstrucao();
    }
  }

  function _voltarInstrucao() {
    if (_instrucaoAtual > 0) {
      _instrucaoAtual--;
      _atualizarInstrucao();
    }
  }


  // ══════════════════════════════════════════
  //  PAINEL MINIMIZÁVEL
  // ══════════════════════════════════════════

  let _painelMinimizado = false;

  function _setPainelMinimizado(ativo) {
    const painel = document.querySelector('.rota-painel');
    const alca   = document.getElementById('rota-painel-alca');
    const status = document.querySelector('.rota-painel__status');
    if (!painel || !alca) return;

    if (!painel.classList.contains('rota-painel--minimizado')) {
      painel.dataset.alturaExpandida = String(painel.scrollHeight);
    }

    painel.style.removeProperty('--rota-painel-offset');
    _painelMinimizado = Boolean(ativo);
    painel.classList.toggle('rota-painel--minimizado', _painelMinimizado);
    alca.setAttribute('aria-label', _painelMinimizado ? 'Expandir painel de rota' : 'Minimizar painel de rota');
    alca.setAttribute('aria-expanded', String(!_painelMinimizado));
    if (status) {
      status.textContent = _painelMinimizado
        ? 'Clique ou arraste para cima para abrir'
        : 'Clique ou arraste para baixo para minimizar';
    }
  }

  function _alternarPainelMinimizado() {
    _setPainelMinimizado(!_painelMinimizado);
  }

  function _inicializarPainelMinimizado() {
    const painel = document.querySelector('.rota-painel');
    const alca = document.getElementById('rota-painel-alca');
    if (!painel || !alca) return;

    let ativo = false;
    let arrastou = false;
    let inicioY = 0;
    let inicioOffset = 0;
    let maxOffset = 0;

    function atualizarOffset(deltaY) {
      const offset = Math.max(0, Math.min(inicioOffset + deltaY, maxOffset));
      painel.style.setProperty('--rota-painel-offset', `${offset}px`);
      return offset;
    }

    alca.addEventListener('click', (evento) => {
      if (arrastou) {
        evento.preventDefault();
        arrastou = false;
        return;
      }
      _alternarPainelMinimizado();
    });
    alca.addEventListener('keydown', (evento) => {
      if (evento.key !== 'Enter' && evento.key !== ' ') return;
      evento.preventDefault();
      _alternarPainelMinimizado();
    });

    alca.addEventListener('pointerdown', (evento) => {
      ativo = true;
      arrastou = false;
      inicioY = evento.clientY;
      const alturaExpandida = Number(painel.dataset.alturaExpandida) || painel.scrollHeight;
      maxOffset = Math.max(0, alturaExpandida - 94);
      inicioOffset = _painelMinimizado ? maxOffset : 0;
      painel.classList.add('rota-painel--dragging');
      alca.setPointerCapture(evento.pointerId);
    });

    alca.addEventListener('pointermove', (evento) => {
      if (!ativo) return;
      const delta = evento.clientY - inicioY;
      if (Math.abs(delta) < 8) return;
      arrastou = true;
      atualizarOffset(delta);
    });

    alca.addEventListener('pointerup', (evento) => {
      if (!ativo) return;
      ativo = false;
      const delta = evento.clientY - inicioY;
      const offset = atualizarOffset(delta);
      const deveMinimizar = offset > maxOffset * 0.45;
      _setPainelMinimizado(deveMinimizar);
      painel.classList.remove('rota-painel--dragging');
      alca.releasePointerCapture(evento.pointerId);
    });

    alca.addEventListener('pointercancel', () => {
      ativo = false;
      painel.style.removeProperty('--rota-painel-offset');
      _setPainelMinimizado(_painelMinimizado);
      painel.classList.remove('rota-painel--dragging');
    });

    _setPainelMinimizado(false);
  }


  // ══════════════════════════════════════════
  //  SELETOR DE VEÍCULO
  // ══════════════════════════════════════════

  function _inicializarVeiculos() {
    document.querySelectorAll('.veiculo-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.veiculo-chip').forEach((c) => c.classList.remove('veiculo-chip--ativo'));
        chip.classList.add('veiculo-chip--ativo');
        _veiculoAtivo = chip.dataset.veiculo || 'toco';
        _dimAtual = {
          peso:        chip.dataset.peso,
          altura:      chip.dataset.altura,
          largura:     chip.dataset.largura,
          comprimento: chip.dataset.comprimento,
        };
        if (_origemCoords && _destinoCoords) _debouncedRecalcular();
      });
    });
  }


  // ══════════════════════════════════════════
  //  TROCAR ORIGEM ↕ DESTINO
  // ══════════════════════════════════════════

  function _inicializarTrocar() {
    document.getElementById('btn-trocar')?.addEventListener('click', () => {
      const iO = document.getElementById('input-origem');
      const iD = document.getElementById('input-destino');
      if (!iO || !iD) return;

      [iO.value, iD.value] = [iD.value, iO.value];
      [_origemCoords, _destinoCoords] = [_destinoCoords, _origemCoords];

      const wO = iO.closest('.rota-campo__wrap');
      const wD = iD.closest('.rota-campo__wrap');
      if (wO && wD) {
        const ok = 'rota-campo__wrap--ok', er = 'rota-campo__wrap--erro';
        const oOk = wO.classList.contains(ok), oEr = wO.classList.contains(er);
        const dOk = wD.classList.contains(ok), dEr = wD.classList.contains(er);
        wO.classList.toggle(ok, dOk); wO.classList.toggle(er, dEr);
        wD.classList.toggle(ok, oOk); wD.classList.toggle(er, oEr);
      }
    });
  }


  // ══════════════════════════════════════════
  //  HELPERS DE INTERFACE
  // ══════════════════════════════════════════

  function _setSpinner(btnId, ativo) {
    const btn = document.getElementById(btnId);
    if (!btn) return;
    btn.disabled  = ativo;
    btn.innerHTML = ativo
      ? `<span class="spinner-btn" style="border-color:rgba(0,0,0,.1);border-top-color:#374151;width:13px;height:13px"></span>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  }

  function _setBotao(estado) {
    const btn = document.getElementById('btn-calcular');
    if (!btn) return;
    btn.disabled  = estado === 'calculando';
    btn.innerHTML = estado === 'calculando'
      ? `<span class="spinner-btn"></span> Calculando…`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Calcular Rota`;
  }

  function _estimarCombustivel(distanciaM) {
    const consumo = CONSUMO_VEICULO[_veiculoAtivo] || 35;
    const litros  = (distanciaM / 1000 / 100) * consumo;
    return litros.toFixed(0);
  }

  function _mostrarResultado(resumo) {
    const form      = document.getElementById('rota-form');
    const resultado = document.getElementById('rota-resultado');
    if (!form || !resultado) return;

    form.hidden      = true;
    resultado.hidden = false;

    document.getElementById('resultado-distancia').textContent = Dados.formatarDistancia(resumo.distance);
    document.getElementById('resultado-duracao').textContent   = Dados.formatarDuracao(resumo.duration);
    document.getElementById('resultado-origem-nome').textContent  = _origemCoords?.nome.split(',')[0] ?? '—';
    document.getElementById('resultado-destino-nome').textContent = _destinoCoords?.nome.split(',')[0] ?? '—';

    // Estimativa de combustível
    const litros = _estimarCombustivel(resumo.distance);
    const elComb = document.getElementById('resultado-combustivel');
    if (elComb) {
      elComb.textContent = `⛽ Estimativa: ~${litros} L de diesel`;
    }

    // Waypoints no resultado
    const elWPs = document.getElementById('resultado-waypoints');
    if (elWPs) {
      const validos = _waypointsCoords.filter(Boolean);
      if (validos.length) {
        elWPs.hidden = false;
        elWPs.innerHTML = validos
          .map((wp, i) => {
            const letras = ['C', 'D', 'E', 'F', 'G'];
            return `<span class="rota-resultado__ponto" style="background:#d97706">${letras[i]||i+3}</span>
                    <span class="rota-resultado__cidade">${wp.nome.split(',')[0]}</span>`;
          })
          .join('<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>');
      } else {
        elWPs.hidden = true;
      }
    }
  }

  function _mostrarErro(msg) {
    const el = document.getElementById('rota-erro');
    if (!el) return;
    el.hidden = false;
    el.textContent = `⚠️  ${msg}`;
  }

  function _esconderErro() {
    const el = document.getElementById('rota-erro');
    if (el) el.hidden = true;
  }

  function _voltarParaForm() {
    document.getElementById('rota-form').hidden     = false;
    document.getElementById('rota-resultado').hidden = true;
    _setBotao('idle');
    _pararNavegacao();
  }


  // ══════════════════════════════════════════
  //  OBSERVER — destrói mapa ao sair da aba
  // ══════════════════════════════════════════

  function _observarRemocao() {
    const conteudo = document.getElementById('conteudo');
    if (!conteudo) return;
    const obs = new MutationObserver(() => {
      if (!document.getElementById('rota-mapa-container')) {
        _destruirMapa();
        obs.disconnect();
      }
    });
    obs.observe(conteudo, { childList: true, subtree: false });
  }


  // ══════════════════════════════════════════
  //  HOOK PRINCIPAL
  // ══════════════════════════════════════════

  function _hookRota() {
    _inicializarMapa();
    // desenha bloqueios existentes e atualiza periodicamente
    try { _desenharBloqueiosRota(); } catch(e){}
    const _bloqInterval = setInterval(() => { try { _desenharBloqueiosRota(); } catch(e){} }, 2000);
    _inicializarPainelMinimizado();
    _inicializarVeiculos();
    _inicializarTrocar();
    _observarRemocao();

    // Busca origem
    document.getElementById('btn-origem-busca')?.addEventListener('click', async () => {
      await _buscarLocal('origem');
      if (_origemCoords && _destinoCoords) _debouncedRecalcular();
    });
    document.getElementById('input-origem')?.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      await _buscarLocal('origem');
      if (_origemCoords && _destinoCoords) _debouncedRecalcular();
    });

    // Busca destino
    document.getElementById('btn-destino-busca')?.addEventListener('click', async () => {
      await _buscarLocal('destino');
      if (_origemCoords && _destinoCoords) _debouncedRecalcular();
    });
    document.getElementById('input-destino')?.addEventListener('keydown', async (e) => {
      if (e.key !== 'Enter') return;
      await _buscarLocal('destino');
      if (_origemCoords && _destinoCoords) _debouncedRecalcular();
    });

    // Minha localização
    document.getElementById('btn-minha-localizacao')?.addEventListener('click', _usarMinhaLocalizacao);

    // Adicionar parada
    document.getElementById('btn-add-parada')?.addEventListener('click', _adicionarWaypoint);

    // Calcular
    document.getElementById('btn-calcular')?.addEventListener('click', _onCalcular);

    // Nova rota
    document.getElementById('btn-nova-rota')?.addEventListener('click', _voltarParaForm);

    // Iniciar / parar navegação
    document.getElementById('btn-iniciar-nav')?.addEventListener('click', _iniciarNavegacao);
    document.getElementById('btn-nav-anterior')?.addEventListener('click', _voltarInstrucao);
    document.getElementById('btn-nav-proximo')?.addEventListener('click', _avancarInstrucao);

    // Restaura estado anterior
    const estado = window.TruckwayEstado;
    if (estado?.resumo) {
      if (estado.origemCoords) {
        _origemCoords = estado.origemCoords;
        const el = document.getElementById('input-origem');
        if (el) el.value = estado.origemCoords.nome.split(',')[0];
        document.getElementById('input-origem')?.closest('.rota-campo__wrap')?.classList.add('rota-campo__wrap--ok');
      }
      if (estado.destinoCoords) {
        _destinoCoords = estado.destinoCoords;
        const el = document.getElementById('input-destino');
        if (el) el.value = estado.destinoCoords.nome.split(',')[0];
        document.getElementById('input-destino')?.closest('.rota-campo__wrap')?.classList.add('rota-campo__wrap--ok');
      }
      _instrucoes = estado.instrucoes || [];
      _mostrarResultado(estado.resumo);
    }
    // limpa interval quando sair da aba (observer fará _destruirMapa que pode limpar camadas)
    // não guardamos referência global adicional; interval será coletado ao recarregar a aba
  }


  // ─── Registro ───────────────────────────────────────────────────────
  if (window.Roteador) {
    window.Roteador.registrarHook('rota', _hookRota);
  } else {
    window.addEventListener('load', () => window.Roteador?.registrarHook('rota', _hookRota));
  }

})();