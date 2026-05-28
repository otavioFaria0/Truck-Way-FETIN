// navegador de paginas, vai ser responsavel pelo redirecionamento das paginas

// ------------------------------
// -------- MENU LATERAL --------
// ------------------------------
const abrirMenu = document.getElementById("abrirMenu");
const fecharMenu = document.getElementById("fecharMenu");
const menuLateral = document.getElementById("menuLateral");
const overlay = document.getElementById("overlay");

function abrirMenuLateral() {
  menuLateral.classList.add("ativo");
  if (overlay) overlay.hidden = false;
  menuLateral.setAttribute("aria-hidden", "false");
}

function fecharMenuLateral() {
  menuLateral.classList.remove("ativo");
  if (overlay) overlay.hidden = true;
  menuLateral.setAttribute("aria-hidden", "true");
}

if (abrirMenu) abrirMenu.addEventListener("click", abrirMenuLateral);
if (fecharMenu) fecharMenu.addEventListener("click", fecharMenuLateral);
if (overlay) overlay.addEventListener("click", fecharMenuLateral);

// ------------------------------
// -------- PAGINAÇÃO -----------
// ------------------------------
const conteudo = document.getElementById("conteudo");
const _paginaHooks = {};
const PAGINAS_VALIDAS = ["inicio", "rota", "mapa", "apoio", "avaliacoes", "sobre"];

function registrarHook(pagina, callback) {
  _paginaHooks[pagina] = callback;
}

function atualizarNavegacaoAtiva(nomePagina) {
  document.querySelectorAll("[data-pagina]").forEach((botao) => {
    botao.classList.toggle("item-barra--ativo", botao.dataset.pagina === nomePagina);
  });
}

async function carregarPagina(nomePagina, opcoes = {}) {
  const pagina = PAGINAS_VALIDAS.includes(nomePagina) ? nomePagina : "inicio";

  try {
    const resposta = await fetch(`paginas/${pagina}.html`);
    if (!resposta.ok)
      throw new Error(`Erro ao carregar a página: ${pagina}`);

    const html = await resposta.text();
    if (conteudo) conteudo.innerHTML = html;

    fecharMenuLateral();
    atualizarNavegacaoAtiva(pagina);

    if (
      opcoes.atualizarHistorico !== false &&
      window.history &&
      window.history.pushState &&
      location.hash !== `#${pagina}`
    ) {
      window.history.pushState({ pagina }, "", `#${pagina}`);
    }

    const hookPagina = _paginaHooks[pagina];

    if (typeof hookPagina === "function") {
      hookPagina();
    }

    // Fallback: carrega a lógica do mapa se o hook ainda não foi registrado.
    if (pagina === "mapa" && typeof hookPagina !== "function") {
      if (!document.querySelector('script[src="js/mapas.js"]')) {
        const scriptMapa = document.createElement("script");
        scriptMapa.src = "js/mapas.js";
        scriptMapa.defer = true;
        scriptMapa.onload = () => {
          if (typeof window.inicializarMapa === "function") {
            window.inicializarMapa();
          }
        };
        document.body.appendChild(scriptMapa);
      } else if (typeof window.inicializarMapa === "function") {
        // Se o script já existir, apenas reinicia a lógica do mapa
        window.inicializarMapa();
      }
    }
  } catch (erro) {
    console.error(erro);
  }
}

// ─────────────────────────────────────────
//  Suporte ao botão Voltar/Avançar do navegador
// ─────────────────────────────────────────
window.addEventListener("popstate", (evento) => {
  const pagina = evento.state?.pagina ?? _resolverPaginaHash();
  carregarPagina(pagina, { atualizarHistorico: false });
});


// ─────────────────────────────────────────
//  Lê a página a partir do hash da URL (ex.: #mapa)
// ─────────────────────────────────────────
function _resolverPaginaHash() {
  const hash = location.hash.replace("#", "").trim();
  return PAGINAS_VALIDAS.includes(hash) ? hash : "inicio";
}


// ─────────────────────────────────────────
//  API pública
// ─────────────────────────────────────────
const Roteador = {
  ir: carregarPagina,
  registrarHook,
};

window.Roteador = Roteador;


// ─────────────────────────────────────────
//  Inicialização — carrega a página correta
//  respeitando um hash na URL (ex.: ao recarregar
//  a página estando em #mapa)
// ─────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("[data-pagina]").forEach((botao) => {
    botao.addEventListener("click", () => {
      carregarPagina(botao.dataset.pagina);
    });
  });

  carregarPagina(_resolverPaginaHash(), { atualizarHistorico: false });
});
const botaoPerfil = document.getElementById("botaoPerfil");

const menuPerfil = document.getElementById("menuPerfil");

botaoPerfil?.addEventListener("click", function () {

    if (menuPerfil.style.display === "flex") {

        menuPerfil.style.display = "none";

    } else {

        menuPerfil.style.display = "flex";

    }

});

document.addEventListener("click", function (event) {
    if (!botaoPerfil || !menuPerfil) return;

    if (
        !botaoPerfil.contains(event.target) &&
        !menuPerfil.contains(event.target)
    ) {

        menuPerfil.style.display = "none";

    }

});

const logoutBtn = document.getElementById("logoutBtn");

logoutBtn?.addEventListener("click", function () {

    window.TruckwayAuth?.sair();

    window.location.href = "paginas/login.html";

});
