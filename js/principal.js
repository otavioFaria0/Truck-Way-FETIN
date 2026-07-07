localStorage.setItem("Tema", "Claro");

export function alternarTema() {
    const temaAtual = localStorage.getItem("Tema");
    const novoTema = temaAtual === "Claro" ? "Escuro" : "Claro";
    localStorage.setItem("Tema", novoTema);
    window.location.reload();
}