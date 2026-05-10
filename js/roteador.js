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