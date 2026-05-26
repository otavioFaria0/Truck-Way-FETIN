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

function registrarHook(pagina, callback) {
  _paginaHooks[pagina] = callback;
}

async function carregarPagina(nomePagina) {
  try {
    const resposta = await fetch(`paginas/${nomePagina}.html`);
    if (!resposta.ok)
      throw new Error(`Erro ao carregar a página: ${nomePagina}`);

    const html = await resposta.text();
    if (conteudo) conteudo.innerHTML = html;

    fecharMenuLateral();

    if (window.history && window.history.pushState) {
      window.history.pushState({ pagina: nomePagina }, '', `#${nomePagina}`);
    }

    if (typeof _paginaHooks[nomePagina] === 'function') {
      _paginaHooks[nomePagina]();
    }

    // Executa dinamicamente o mapa se a página for "mapa"
    if (nomePagina === "mapa") {
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
      } else if (typeof inicializarMapa === "function") {
        // Se o script já existir, apenas reinicia a lógica do mapa
        inicializarMapa();
      }
    }
  } catch (erro) {
    console.error(erro);
  }
}

// Inicializa os escutadores de clique assim que o DOM estiver pronto
document.addEventListener("DOMContentLoaded", () => {
  const botoes = document.querySelectorAll("[data-pagina]");

  botoes.forEach((botao) => {
    botao.addEventListener("click", () => {
      const pagina = botao.dataset.pagina;
      carregarPagina(pagina);

      botao.classList.add("item-barra--ativo");
      botoes.forEach((b) => {
        if (b !== botao) {
          b.classList.remove("item-barra--ativo");
        }
      });
    });
  });

  // Carrega a página inicial por padrão
  carregarPagina("inicio");
});


// ─────────────────────────────────────────
//  Suporte ao botão Voltar/Avançar do navegador
// ─────────────────────────────────────────
window.addEventListener("popstate", (evento) => {
  const pagina = evento.state?.pagina ?? _resolverPaginaHash();
  carregarPagina(pagina);
});


// ─────────────────────────────────────────
//  Lê a página a partir do hash da URL (ex.: #mapa)
// ─────────────────────────────────────────
function _resolverPaginaHash() {
  const hash = location.hash.replace("#", "").trim();
  const paginasValidas = ["inicio", "rota", "mapa", "apoio", "avaliacoes", "sobre"];
  return paginasValidas.includes(hash) ? hash : "inicio";
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
  carregarPagina(_resolverPaginaHash(), false);
});
