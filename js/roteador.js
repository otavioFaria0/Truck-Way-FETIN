// ============================================================
//  roteador.js — Truckway
//  Responsável por:
//    • Trocar o conteúdo da área principal
//    • Chamar o hook de inicialização de cada página
//    • Gerenciar o estado ativo da barra inferior
//    • Controlar o menu lateral
//    • Sincronizar a URL (History API) para suportar o botão voltar
// ============================================================


// ─────────────────────────────────────────
//  Registro de hooks de página
//  Cada módulo de página pode se registrar aqui chamando:
//    Roteador.registrarHook('mapa', () => { ... })
//  O hook é chamado automaticamente após o HTML da página
//  ser injetado no DOM.
// ─────────────────────────────────────────
const _hooks = {};

function registrarHook(nomePagina, fn) {
  _hooks[nomePagina] = fn;
}


// ─────────────────────────────────────────
//  Estado interno
// ─────────────────────────────────────────
let _paginaAtual = null;


// ─────────────────────────────────────────
//  Elementos do DOM
// ─────────────────────────────────────────
const conteudo   = document.getElementById("conteudo");
const botoes     = document.querySelectorAll("[data-pagina]");
const menuLateral = document.getElementById("menuLateral");
const overlay    = document.getElementById("overlay");
const abrirMenu  = document.getElementById("abrirMenu");
const fecharMenu = document.getElementById("fecharMenu");


// ─────────────────────────────────────────
//  Menu lateral
// ─────────────────────────────────────────
function abrirMenuLateral() {
  menuLateral.classList.add("ativo");
  overlay.hidden = false;
  menuLateral.setAttribute("aria-hidden", "false");
}

function fecharMenuLateral() {
  menuLateral.classList.remove("ativo");
  overlay.hidden = true;
  menuLateral.setAttribute("aria-hidden", "true");
}

abrirMenu.addEventListener("click", abrirMenuLateral);
fecharMenu.addEventListener("click", fecharMenuLateral);
overlay.addEventListener("click", fecharMenuLateral);


// ─────────────────────────────────────────
//  Atualiza o botão ativo na barra inferior
//  (e no menu lateral, se houver botão correspondente)
// ─────────────────────────────────────────
function _atualizarAtivo(nomePagina) {
  botoes.forEach((b) => {
    const esteAtivo = b.dataset.pagina === nomePagina;
    b.classList.toggle("item-barra--ativo", esteAtivo);
    b.setAttribute("aria-current", esteAtivo ? "page" : "false");
  });
}


// ─────────────────────────────────────────
//  Carregamento de página
// ─────────────────────────────────────────
async function carregarPagina(nomePagina, pushState = true) {
  // Evita recarregar a mesma página
  if (nomePagina === _paginaAtual) return;

  try {
    const resposta = await fetch(`paginas/${nomePagina}.html`);

    if (!resposta.ok) {
      throw new Error(`Página não encontrada: ${nomePagina} (${resposta.status})`);
    }

    const html = await resposta.text();

    // Injeta o HTML (sem executar <script> inline por segurança)
    conteudo.innerHTML = html;

    // Remove classes de página anterior e aplica a da atual
    // Convenção: conteudo--<nomePagina> (ex: conteudo--mapa)
    conteudo.className = conteudo.className
      .replace(/\bconteudo--\S+/g, "")
      .trim();
    conteudo.classList.add(`conteudo--${nomePagina}`);

    // Rola para o topo do conteúdo
    conteudo.scrollTop = 0;

    // Atualiza estado
    _paginaAtual = nomePagina;
    _atualizarAtivo(nomePagina);
    fecharMenuLateral();

    // Sincroniza a URL sem recarregar
    if (pushState) {
      history.pushState({ pagina: nomePagina }, "", `#${nomePagina}`);
    }

    // Dispara o hook da página, se houver
    if (typeof _hooks[nomePagina] === "function") {
      _hooks[nomePagina]();
    }

  } catch (erro) {
    console.error("[Roteador]", erro);
    conteudo.innerHTML = `
      <div style="padding:2rem;text-align:center;color:#6b7280;">
        <p>Não foi possível carregar esta página.</p>
        <button onclick="Roteador.ir('inicio')" style="margin-top:1rem;padding:.5rem 1.5rem;border-radius:8px;border:1px solid #d1d5db;cursor:pointer;">
          Voltar ao início
        </button>
      </div>`;
  }
}


// ─────────────────────────────────────────
//  Eventos de clique nos botões de navegação
// ─────────────────────────────────────────
botoes.forEach((botao) => {
  botao.addEventListener("click", () => {
    carregarPagina(botao.dataset.pagina);
  });
});


// ─────────────────────────────────────────
//  Suporte ao botão Voltar/Avançar do navegador
// ─────────────────────────────────────────
window.addEventListener("popstate", (evento) => {
  const pagina = evento.state?.pagina ?? _resolverPaginaHash();
  // pushState = false para não duplicar a entrada no histórico
  _paginaAtual = null; // força o recarregamento
  carregarPagina(pagina, false);
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