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

// ------------------------------


// -----------------------------------------------
// -------- PAGINAÇÃO (mudança de paginas) --------
// -----------------------------------------------
const conteudo = document.getElementById("conteudo");
const botoes = document.querySelectorAll("[data-pagina]");

async function carregarPagina(nomePagina) {
  const resposta = await fetch(`paginas/${nomePagina}.html`);
  const html = await resposta.text();

  conteudo.innerHTML = html;

  if (typeof fecharMenuLateral === "function") {
    fecharMenuLateral();
  }
}

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

carregarPagina("inicio");

// ------------------------------