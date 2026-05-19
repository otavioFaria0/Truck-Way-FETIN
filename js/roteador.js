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

async function carregarPagina(nomePagina) {
  try {
    const resposta = await fetch(`paginas/${nomePagina}.html`);
    if (!resposta.ok) throw new Error(`Erro ao carregar a página: ${nomePagina}`);
    
    const html = await resposta.text();
    if (conteudo) conteudo.innerHTML = html;

    fecharMenuLateral();

    // Executa dinamicamente o mapa se a página for "mapa"
    if (nomePagina === "mapa") {
      if (!document.querySelector('script[src="js/mapas.js"]')) {
        const scriptMapa = document.createElement("script");
        scriptMapa.src = "js/mapas.js";
        scriptMapa.defer = true;
        scriptMapa.onload = () => {
          if (typeof window.inicializarMapa === 'function') {
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