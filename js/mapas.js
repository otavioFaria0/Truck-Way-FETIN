// ============================================================
//  mapas.js — Truckway
//  Responsável por:
//    • Inicializar o Leaflet com geolocalização real do usuário
//    • Exibir marcadores de postos de apoio e balanças (Dados)
//    • Busca de locais via Nominatim
//    • Destruir corretamente ao sair da aba
// ============================================================

(function () {

  // ─────────────────────────────────────────
  //  Estado interno do módulo
  // ─────────────────────────────────────────
  let _mapa = null;
  let _camadaPOI = null;
  let _mapaPreview = null;

  const COORDS_PADRAO = [-22.2568, -45.7036]; // Inatel


  // ══════════════════════════════════════════
  //  CICLO DE VIDA DO MAPA
  // ══════════════════════════════════════════

  function _destruirMapa() {
    if (_mapa) {
      _mapa.remove();
      _mapa = null;
      _camadaPOI = null;
    }
  }

  function _destruirMapaPreview() {
    if (_mapaPreview) {
      _mapaPreview.remove();
      _mapaPreview = null;
    }
  }

  function _criarMapaPreview(coords) {
    const preview = document.getElementById("inicio-mapa-preview");
    if (!preview) return;

    _destruirMapaPreview();

    _mapaPreview = L.map("inicio-mapa-preview", {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      touchZoom: false,
      keyboard: false,
      tap: false,
    }).setView(coords, 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(_mapaPreview);

    L.circle(coords, {
      radius: 300,
      color: "#0c61eb",
      fillColor: "rgba(12, 97, 235, 0.18)",
      weight: 2,
    }).addTo(_mapaPreview);

    setTimeout(() => {
      if (_mapaPreview) _mapaPreview.invalidateSize();
    }, 200);
  }

  function _criarMapa(coords, precisao = null) {
    const container = document.getElementById("mapa-container");
    if (!container) return;

    _destruirMapa();

    _mapa = L.map("mapa-container", {
      zoomControl: false,
      attributionControl: true,
    }).setView(coords, 14);

    L.control.zoom({ position: "bottomright" }).addTo(_mapa);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(_mapa);

    // Pin do usuário
    const iconeUsuario = L.divIcon({
      className: "",
      html: `
        <div class="pin-usuario">
          <div class="pin-usuario__pulso"></div>
          <div class="pin-usuario__ponto"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const textoPopup = precisao !== null
      ? `<b>Você está aqui</b><br><small>Precisão: ~${Math.round(precisao)} m</small>`
      : `<b>Truckway</b><br><small>Inatel — Santa Rita do Sapucaí</small>`;

    L.marker(coords, { icon: iconeUsuario })
      .addTo(_mapa)
      .bindPopup(textoPopup)
      .openPopup();

    setTimeout(() => {
      if (_mapa) _mapa.invalidateSize();
    }, 200);

    _adicionarPOIs();
  }


  // ══════════════════════════════════════════
  //  GEOLOCALIZAÇÃO
  // ══════════════════════════════════════════

  function _inicializarComGeolocalizacao() {
    if (!document.getElementById("mapa-container")) return;

    if (!navigator.geolocation) {
      _criarMapa(COORDS_PADRAO);
      return;
    }

    _mostrarCarregando(true);

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude, accuracy } }) => {
        _mostrarCarregando(false);
        _criarMapa([latitude, longitude], accuracy);
      },
      () => {
        _mostrarCarregando(false);
        _criarMapa(COORDS_PADRAO);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60000,
      }
    );
  }

  function _mostrarCarregando(visivel) {
    const el = document.getElementById("mapa-carregando");
    if (el) el.hidden = !visivel;
  }


  // ══════════════════════════════════════════
  //  BUSCA NO MAPA
  // ══════════════════════════════════════════

  function _inicializarBusca() {
    const input = document.getElementById("busca-mapa-input");
    const botao = document.getElementById("busca-mapa-botao");

    if (!input || !botao) return;

    function executarBusca() {
      const termo = input.value.trim();
      if (!termo || !_mapa) return;

      fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(termo)}&limit=1&countrycodes=br`,
        {
          headers: {
            "Accept-Language": "pt-BR,pt"
          }
        }
      )
        .then((r) => r.json())
        .then((lista) => {
          if (!lista.length) {
            alert("Nenhum local encontrado.");
            return;
          }

          const { lat, lon, display_name } = lista[0];
          const coords = [+lat, +lon];

          _mapa.flyTo(coords, 14, {
            animate: true,
            duration: 1
          });

          L.popup()
            .setLatLng(coords)
            .setContent(`<b>${display_name}</b>`)
            .openOn(_mapa);
        })
        .catch(() => {
          alert("Erro ao buscar. Verifique sua conexão.");
        });
    }

    botao.addEventListener("click", executarBusca);

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        executarBusca();
      }
    });
  }


  // ══════════════════════════════════════════
  //  MARCADORES DE POI
  // ══════════════════════════════════════════

  function _adicionarPOIs() {
    if (!_mapa || typeof Dados === "undefined") return;

    if (_camadaPOI) {
      _camadaPOI.clearLayers();
    } else {
      _camadaPOI = L.layerGroup().addTo(_mapa);
    }

    // Postos de apoio
    Dados.pontosDeApoio.forEach((ponto) => {
      const icone = L.divIcon({
        className: "",
        html: `<div class="pin-poi pin-poi--posto" title="${ponto.nome}">⛽</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const estrelas =
        "★".repeat(Math.round(ponto.avaliacao)) +
        "☆".repeat(5 - Math.round(ponto.avaliacao));

      L.marker(ponto.coords, { icon: icone })
        .addTo(_camadaPOI)
        .bindPopup(`
          <div class="popup-poi">
            <strong>${ponto.nome}</strong>
            <span class="popup-poi__rodovia">${ponto.rodovia}</span>
            <p>${ponto.descricao}</p>
            <span class="popup-poi__estrelas">${estrelas} (${ponto.avaliacao})</span>
          </div>
        `);
    });

    // Balanças
    Dados.balancas.forEach((balanca) => {
      const icone = L.divIcon({
        className: "",
        html: `
          <div class="pin-poi pin-poi--balanca ${balanca.operando ? "" : "pin-poi--inativo"}"
               title="${balanca.nome}">
            ⚖️
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      L.marker(balanca.coords, { icon: icone })
        .addTo(_camadaPOI)
        .bindPopup(`
          <div class="popup-poi">
            <strong>${balanca.nome}</strong>
            <span class="popup-poi__rodovia">${balanca.rodovia}</span>
            <p>${balanca.descricao}</p>
            <span class="popup-poi__status ${balanca.operando
              ? "popup-poi__status--ok"
              : "popup-poi__status--off"}">
              ${balanca.operando
                ? "● Em operação"
                : "○ Inativo / variável"}
            </span>
          </div>
        `);
    });
  }


  // ══════════════════════════════════════════
  //  OBSERVER
  // ══════════════════════════════════════════

  function _observarRemocao() {
    const conteudo = document.getElementById("conteudo");
    if (!conteudo) return;

    const observer = new MutationObserver(() => {
      if (!document.getElementById("mapa-container")) {
        _destruirMapa();
      }
      if (!document.getElementById("inicio-mapa-preview")) {
        _destruirMapaPreview();
      }
      if (!document.getElementById("mapa-container") && !document.getElementById("inicio-mapa-preview")) {
        observer.disconnect();
      }
    });

    observer.observe(conteudo, {
      childList: true,
      subtree: false,
    });
  }


  // ══════════════════════════════════════════
  //  HOOK PRINCIPAL
  // ══════════════════════════════════════════

  function _hookMapa() {
    _inicializarComGeolocalizacao();
    _inicializarBusca();
    _observarRemocao();
  }

  function _inicializarInicioMapa() {
    if (!document.getElementById("inicio-mapa-preview")) return;

    if (!navigator.geolocation) {
      _criarMapaPreview(COORDS_PADRAO);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords: { latitude, longitude } }) => {
        _criarMapaPreview([latitude, longitude]);
      },
      () => {
        _criarMapaPreview(COORDS_PADRAO);
      },
      {
        enableHighAccuracy: false,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  }

  function _hookInicio() {
    _inicializarInicioMapa();
    if (typeof iniciarInicio === "function") {
      iniciarInicio();
    }
    _observarRemocao();
  }


  // Registro no Roteador
  function _registrar() {
    if (window.Roteador) {
      window.Roteador.registrarHook("mapa", _hookMapa);
      window.Roteador.registrarHook("inicio", _hookInicio);
    } else {
      window.addEventListener("load", () => {
        window.Roteador?.registrarHook("mapa", _hookMapa);
        window.Roteador?.registrarHook("inicio", _hookInicio);
      });
    }
  }

  _registrar();

})();