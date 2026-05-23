// ============================================================
//  js/paginas/rota.js — Truckway
//  Mapa embutido na aba Rota com painel flutuante inferior.
//  Fluxo: usuário digita origem/destino → busca → calcula →
//         rota desenhada no mapa + painel de resultado.
// ============================================================

(function () {

  // ── Estado ──
  let _mapa          = null;
  let _camadaRota    = null;
  let _origemCoords  = null;
  let _destinoCoords = null;
  let _dimAtual      = { peso: 16, altura: 4.4, largura: 2.6, comprimento: 14.0 };

  // Debounce helper para evitar recalculos imediatos em sequência
  function _debounce(fn, wait = 300) {
    let t = null;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), wait);
    };
  }
  const _debouncedRecalcular = _debounce(() => { if (_origemCoords && _destinoCoords) _onCalcular(); }, 350);


  // ══════════════════════════════════════════
  //  MAPA (Leaflet embutido na aba Rota)
  // ══════════════════════════════════════════

  function _inicializarMapa() {
    const container = document.getElementById("rota-mapa-container");
    if (!container || _mapa) return;

    _mapa = L.map("rota-mapa-container", {
      zoomControl: false,
      attributionControl: true,
    }).setView([-15.78, -47.93], 5); // Brasil inteiro

    L.control.zoom({ position: "bottomright" }).addTo(_mapa);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(_mapa);

    _camadaRota = L.layerGroup().addTo(_mapa);

    // Renderiza rota existente se o usuário já calculou antes
    if (window.TruckwayEstado?.rotaGeoJSON) {
      setTimeout(() => { _mapa.invalidateSize(); _desenharRota(); }, 300);
    } else {
      setTimeout(() => _mapa.invalidateSize(), 300);
    }
  }

  function _destruirMapa() {
    if (_mapa) { _mapa.remove(); _mapa = null; _camadaRota = null; }
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
      style: {
        color:   "#0c61eb",
        weight:  5,
        opacity: 0.9,
        lineJoin: "round",
        lineCap:  "round",
      },
    }).addTo(_camadaRota);

    // Pin A (origem)
    L.marker(
      [estado.origemCoords.lat, estado.origemCoords.lon],
      { icon: L.divIcon({ className: "", html: `<div class="pin-rota pin-rota--a">A</div>`, iconSize: [28,28], iconAnchor: [14,14] }) }
    ).addTo(_camadaRota)
     .bindPopup(`<b>Origem</b><br>${estado.origemCoords.nome.split(",")[0]}`);

    // Pin B (destino)
    L.marker(
      [estado.destinoCoords.lat, estado.destinoCoords.lon],
      { icon: L.divIcon({ className: "", html: `<div class="pin-rota pin-rota--b">B</div>`, iconSize: [28,28], iconAnchor: [14,14] }) }
    ).addTo(_camadaRota)
     .bindPopup(`<b>Destino</b><br>${estado.destinoCoords.nome.split(",")[0]}`);

    // Ajusta zoom para mostrar a rota inteira
    const bounds = L.geoJSON(estado.rotaGeoJSON).getBounds();
    _mapa.fitBounds(bounds, { padding: [60, 60], animate: true });
  }


  // ══════════════════════════════════════════
  //  GEOCODING (Nominatim)
  // ══════════════════════════════════════════

  async function _geocodificar(termo) {
    const r = await fetch(
      `${Config.NOMINATIM_URL}/search?format=json&q=${encodeURIComponent(termo)}&limit=1&countrycodes=br`,
      { headers: { "Accept-Language": "pt-BR,pt" } }
    );
    if (!r.ok) throw new Error("Geocoder indisponível.");
    const lista = await r.json();
    if (!lista.length) return null;
    return { lat: parseFloat(lista[0].lat), lon: parseFloat(lista[0].lon), nome: lista[0].display_name };
  }

  async function _buscarLocal(campo) {
    const input = document.getElementById(`input-${campo}`);
    const wrap  = input?.closest(".rota-campo__wrap");
    const termo = input?.value.trim();
    if (!termo) return;

    _setSpinner(campo, true);
    _setConfirmacao(campo, "", null);
    wrap?.classList.remove("rota-campo__wrap--ok", "rota-campo__wrap--erro");

    try {
      const res = await _geocodificar(termo);
      if (!res) {
        _setConfirmacao(campo, "Local não encontrado.", false);
        wrap?.classList.add("rota-campo__wrap--erro");
        if (campo === "origem")  _origemCoords  = null;
        if (campo === "destino") _destinoCoords = null;
        return;
      }
      const nome = res.nome.split(",").slice(0, 2).join(",").trim();
      _setConfirmacao(campo, `✓  ${nome}`, true);
      wrap?.classList.add("rota-campo__wrap--ok");
      if (campo === "origem")  _origemCoords  = res;
      if (campo === "destino") _destinoCoords = res;

      // Centraliza no mapa para dar feedback visual imediato
      if (_mapa) _mapa.flyTo([res.lat, res.lon], 12, { animate: true, duration: 0.8 });

    } catch {
      _setConfirmacao(campo, "Erro de conexão.", false);
    } finally {
      _setSpinner(campo, false);
    }
  }


  // ══════════════════════════════════════════
  //  ROTEAMENTO ORS (HGV)
  // ══════════════════════════════════════════

  async function _chamarORS(origem, destino, dim) {
    const r = await fetch(`${Config.ORS_BASE_URL}/directions/${Config.ORS_PERFIL}/geojson`, {
      method:  "POST",
      headers: {
        "Authorization": Config.ORS_API_KEY,
        "Content-Type":  "application/json",
        "Accept":        "application/json, application/geo+json",
      },
      body: JSON.stringify({
        coordinates: [[origem.lon, origem.lat], [destino.lon, destino.lat]],
        options: {
          vehicle_type: "hgv",
          profile_params: {
            restrictions: {
              weight: parseFloat(dim.peso),
              height: parseFloat(dim.altura),
              width:  parseFloat(dim.largura),
              length: parseFloat(dim.comprimento),
            },
          },
        },
        instructions: false,
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err?.error?.message || `Erro ${r.status}`);
    }
    return r.json();
  }

  async function _onCalcular() {
    _esconderErro();

    if (!_origemCoords || !_destinoCoords) {
      _mostrarErro("Busque e confirme a origem e o destino primeiro.");
      return;
    }

    _setBotao("calculando");

    try {
      const geojson = await _chamarORS(_origemCoords, _destinoCoords, _dimAtual);
      const resumo  = geojson.features[0].properties.summary;

      window.TruckwayEstado = {
        rotaGeoJSON:  geojson,
        resumo,
        origemCoords:  _origemCoords,
        destinoCoords: _destinoCoords,
      };

      _desenharRota();
      _mostrarResultado(resumo);

    } catch (e) {
      console.error("[Rota]", e);
      _mostrarErro(e.message);
      _setBotao("idle");
    }
  }


  // ══════════════════════════════════════════
  //  SELETOR DE VEÍCULO
  // ══════════════════════════════════════════

  function _inicializarVeiculos() {
    document.querySelectorAll(".veiculo-chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".veiculo-chip").forEach((c) => c.classList.remove("veiculo-chip--ativo"));
        chip.classList.add("veiculo-chip--ativo");
        _dimAtual = {
          peso:        chip.dataset.peso,
          altura:      chip.dataset.altura,
          largura:     chip.dataset.largura,
          comprimento: chip.dataset.comprimento,
        };
        // Se já temos origem e destino, recalcula automaticamente (debounced)
        if (_origemCoords && _destinoCoords) {
          _debouncedRecalcular();
        }
      });
    });
  }


  // ══════════════════════════════════════════
  //  TROCAR ORIGEM ↕ DESTINO
  // ══════════════════════════════════════════

  function _inicializarTrocar() {
    document.getElementById("btn-trocar")?.addEventListener("click", () => {
      const iO = document.getElementById("input-origem");
      const iD = document.getElementById("input-destino");
      const cO = document.getElementById("confirmacao-origem");
      const cD = document.getElementById("confirmacao-destino");
      if (!iO || !iD) return;

      [iO.value, iD.value] = [iD.value, iO.value];

      if (cO && cD) {
        const tmp = { t: cO.textContent, c: cO.className, h: cO.hidden };
        cO.textContent = cD.textContent; cO.className = cD.className; cO.hidden = cD.hidden;
        cD.textContent = tmp.t;          cD.className = tmp.c;        cD.hidden = tmp.h;
      }

      [_origemCoords, _destinoCoords] = [_destinoCoords, _origemCoords];

      // Atualiza borda dos wraps
      const wO = iO.closest(".rota-campo__wrap");
      const wD = iD.closest(".rota-campo__wrap");
      if (wO && wD) {
        const ok = "rota-campo__wrap--ok", er = "rota-campo__wrap--erro";
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

  function _setSpinner(campo, ativo) {
    const btn = document.getElementById(`btn-${campo}-busca`);
    if (!btn) return;
    btn.disabled  = ativo;
    btn.innerHTML = ativo
      ? `<span class="spinner-btn" style="border-color:rgba(0,0,0,.1);border-top-color:#374151;width:13px;height:13px"></span>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
  }

  function _setConfirmacao(campo, texto, ok) {
    const el = document.getElementById(`confirmacao-${campo}`);
    if (!el) return;
    if (ok === null) { el.hidden = true; el.textContent = ""; return; }
    el.hidden    = false;
    el.className = `rota-confirmacao rota-confirmacao--${ok ? "ok" : "erro"}`;
    el.textContent = texto;
  }

  function _setBotao(estado) {
    const btn = document.getElementById("btn-calcular");
    if (!btn) return;
    btn.disabled  = estado === "calculando";
    btn.innerHTML = estado === "calculando"
      ? `<span class="spinner-btn"></span> Calculando…`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Calcular Rota`;
  }

  function _mostrarResultado(resumo) {
  const form = document.getElementById("rota-form");
  const resultado = document.getElementById("rota-resultado");

  if (!form || !resultado) {
    console.error("[Rota] Elementos da tela de rota não encontrados:", { form, resultado });
    return;
  }

  form.hidden = true;
  resultado.hidden = false;

  document.getElementById("resultado-distancia").textContent = Dados.formatarDistancia(resumo.distance);
  document.getElementById("resultado-duracao").textContent = Dados.formatarDuracao(resumo.duration);
  document.getElementById("resultado-origem-nome").textContent = _origemCoords?.nome.split(",")[0] ?? "—";
  document.getElementById("resultado-destino-nome").textContent = _destinoCoords?.nome.split(",")[0] ?? "—";
}

  function _mostrarErro(msg) {
    const el = document.getElementById("rota-erro");
    if (!el) return;
    el.hidden = false;
    el.textContent = `⚠️  ${msg}`;
  }

  function _esconderErro() {
    const el = document.getElementById("rota-erro");
    if (el) el.hidden = true;
  }

  function _voltarParaForm() {
    document.getElementById("rota-form").hidden     = false;
    document.getElementById("rota-resultado").hidden = true;
    _setBotao("idle");
  }


  // ══════════════════════════════════════════
  //  OBSERVER — destrói mapa ao sair da aba
  // ══════════════════════════════════════════

  function _observarRemocao() {
    const conteudo = document.getElementById("conteudo");
    if (!conteudo) return;
    const obs = new MutationObserver(() => {
      if (!document.getElementById("rota-mapa-container")) {
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
    _inicializarVeiculos();
    _inicializarTrocar();
    _observarRemocao();

    // Botões de busca
    document.getElementById("btn-origem-busca")
      ?.addEventListener("click", () => _buscarLocal("origem"));
    document.getElementById("btn-destino-busca")
      ?.addEventListener("click", () => _buscarLocal("destino"));

    // Enter nos inputs
    document.getElementById("input-origem")
      ?.addEventListener("keydown", (e) => { if (e.key === "Enter") _buscarLocal("origem"); });
    document.getElementById("input-destino")
      ?.addEventListener("keydown", (e) => { if (e.key === "Enter") _buscarLocal("destino"); });

    // Calcular
    document.getElementById("btn-calcular")
      ?.addEventListener("click", _onCalcular);

    // Nova rota
    document.getElementById("btn-nova-rota")
      ?.addEventListener("click", _voltarParaForm);

    // Restaura se já tinha rota calculada
    const estado = window.TruckwayEstado;
    if (estado?.resumo) {
      if (estado.origemCoords) {
        _origemCoords = estado.origemCoords;
        const el = document.getElementById("input-origem");
        if (el) el.value = estado.origemCoords.nome.split(",")[0];
        _setConfirmacao("origem", `✓  ${estado.origemCoords.nome.split(",").slice(0,2).join(",").trim()}`, true);
        document.getElementById("input-origem")?.closest(".rota-campo__wrap")?.classList.add("rota-campo__wrap--ok");
      }
      if (estado.destinoCoords) {
        _destinoCoords = estado.destinoCoords;
        const el = document.getElementById("input-destino");
        if (el) el.value = estado.destinoCoords.nome.split(",")[0];
        _setConfirmacao("destino", `✓  ${estado.destinoCoords.nome.split(",").slice(0,2).join(",").trim()}`, true);
        document.getElementById("input-destino")?.closest(".rota-campo__wrap")?.classList.add("rota-campo__wrap--ok");
      }
      _mostrarResultado(estado.resumo);
    }
  }


  // ─── Registro ───
  if (window.Roteador) {
    window.Roteador.registrarHook("rota", _hookRota);
  } else {
    window.addEventListener("load", () => window.Roteador?.registrarHook("rota", _hookRota));
  }

})();