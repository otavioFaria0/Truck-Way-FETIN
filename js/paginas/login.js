const form = document.getElementById("loginForm");
const senha = document.getElementById("senha");
const olho = document.getElementById("olho");
const usuarioInput = document.getElementById("loginUsuario");
const feedback = document.getElementById("loginFeedback");

olho?.addEventListener("click", function () {
    const mostrando = senha.type === "text";
    senha.type = mostrando ? "password" : "text";
    olho.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
});

form?.addEventListener("submit", function (evento) {
    evento.preventDefault();

    const usuarioDigitado = usuarioInput.value.trim();
    const senhaDigitada = senha.value;

    feedback.textContent = "";
    feedback.classList.remove("auth-feedback--ok");

    if (!usuarioDigitado || !senhaDigitada) {
        feedback.textContent = "Preencha usuario e senha.";
        return;
    }

    const resultado = window.TruckwayAuth.entrar(usuarioDigitado, senhaDigitada);

    if (!resultado.ok) {
        feedback.textContent = resultado.mensagem;
        return;
    }

    feedback.textContent = "Login realizado. Redirecionando...";
    feedback.classList.add("auth-feedback--ok");

    setTimeout(() => {
        window.location.href = "../index.html";
    }, 500);
});
