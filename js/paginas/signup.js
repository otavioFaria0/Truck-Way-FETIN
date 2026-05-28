const form = document.getElementById("signupForm");
const nome = document.getElementById("nome");
const usuario = document.getElementById("usuario");
const email = document.getElementById("email");
const senha = document.getElementById("senha");
const confirmarSenha = document.getElementById("confirmarSenha");
const olho = document.getElementById("olho");
const feedback = document.getElementById("signupFeedback");

olho?.addEventListener("click", function () {
    const mostrando = senha.type === "text";
    senha.type = mostrando ? "password" : "text";
    confirmarSenha.type = mostrando ? "password" : "text";
    olho.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
});

form?.addEventListener("submit", function (evento) {
    evento.preventDefault();

    feedback.textContent = "";
    feedback.classList.remove("auth-feedback--ok");

    if (senha.value !== confirmarSenha.value) {
        feedback.textContent = "As senhas nao conferem.";
        return;
    }

    const resultado = window.TruckwayAuth.cadastrar({
        nome: nome.value,
        usuario: usuario.value,
        email: email.value,
        senha: senha.value,
    });

    if (!resultado.ok) {
        feedback.textContent = resultado.mensagem;
        return;
    }

    feedback.textContent = "Conta criada. Redirecionando...";
    feedback.classList.add("auth-feedback--ok");

    setTimeout(() => {
        window.location.href = "../index.html";
    }, 600);
});
