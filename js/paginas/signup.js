const botao = document.getElementById("cadastrar");

const usuario = document.getElementById("usuario");

const senha = document.getElementById("senha");

const olho = document.getElementById("olho");

olho.addEventListener("click", function () {

    if (senha.type === "password") {

        senha.type = "text";

    } else {

        senha.type = "password";

    }

});

botao.addEventListener("click", function () {

    localStorage.setItem("usuario", usuario.value);

    localStorage.setItem("senha", senha.value);

    localStorage.setItem("logado", "true");

    alert("Conta criada!");

    window.location.href = "../index.html";

});