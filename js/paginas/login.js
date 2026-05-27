const botao = document.querySelector("button");

const senha = document.getElementById("senha");

const olho = document.getElementById("olho");

const usuarioInput = document.querySelector('input[type="text"]');

olho.addEventListener("click", function () {

    if (senha.type === "password") {

        senha.type = "text";

    } else {

        senha.type = "password";

    }

});

botao.addEventListener("click", function () {

    const usuarioSalvo = localStorage.getItem("usuario");

    const senhaSalva = localStorage.getItem("senha");

    if (
        usuarioInput.value === usuarioSalvo &&
        senha.value === senhaSalva
    ) {

        localStorage.setItem("logado", "true");

        alert("Login realizado!");

        window.location.href = "../index.html";

    } else {

        alert("Usuário ou senha incorretos!");

    }

});