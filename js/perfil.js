const usuarioAtual = window.TruckwayAuth.exigirLogin();

const form = document.getElementById("perfilForm");
const fotoPerfil = document.getElementById("fotoPerfil");
const avatarIniciais = document.getElementById("avatarIniciais");
const inputFoto = document.getElementById("inputFoto");
const feedback = document.getElementById("perfilFeedback");
const sair = document.getElementById("perfilSair");

const campos = {
    nome: document.getElementById("nome"),
    usuario: document.getElementById("usuario"),
    email: document.getElementById("email"),
    telefone: document.getElementById("telefone"),
    empresa: document.getElementById("empresa"),
    cnh: document.getElementById("cnh"),
    caminhao: document.getElementById("caminhao"),
    bio: document.getElementById("bio"),
    senha: document.getElementById("senha"),
};

let fotoAtual = usuarioAtual?.foto || "";

function formatarData(dataIso) {
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return "--/--/----";

    return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    }).format(data);
}

function renderizarFoto(usuario) {
    const foto = fotoAtual || usuario?.foto;

    if (foto) {
        fotoPerfil.src = foto;
        fotoPerfil.hidden = false;
        avatarIniciais.hidden = true;
        return;
    }

    fotoPerfil.hidden = true;
    avatarIniciais.hidden = false;
    avatarIniciais.textContent = window.TruckwayAuth.obterIniciais(usuario?.nome);
}

function preencherPerfil(usuario) {
    if (!usuario) return;

    campos.nome.value = usuario.nome || "";
    campos.usuario.value = usuario.usuario || "";
    campos.email.value = usuario.email || "";
    campos.telefone.value = usuario.telefone || "";
    campos.empresa.value = usuario.empresa || "";
    campos.cnh.value = usuario.cnh || "";
    campos.caminhao.value = usuario.caminhao || "";
    campos.bio.value = usuario.bio || "";

    document.getElementById("perfil-titulo").textContent = usuario.nome || "Meu Perfil";
    document.getElementById("perfilTipo").textContent = usuario.perfil || "Motorista";
    document.getElementById("perfilEmail").textContent = usuario.email || "E-mail nao informado";
    document.getElementById("perfilConta").textContent = usuario.perfil || "Motorista";
    document.getElementById("perfilUsuarioResumo").textContent = usuario.usuario || "-";
    document.getElementById("perfilCriadoEm").textContent = formatarData(usuario.criadoEm);

    renderizarFoto(usuario);
}

inputFoto?.addEventListener("change", (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    if (!arquivo.type.startsWith("image/")) {
        feedback.textContent = "Escolha uma imagem valida.";
        feedback.classList.add("perfil-feedback--erro");
        return;
    }

    const reader = new FileReader();

    reader.onload = () => {
        fotoAtual = String(reader.result || "");
        renderizarFoto({ ...usuarioAtual, foto: fotoAtual });
        feedback.textContent = "Foto pronta para salvar.";
        feedback.classList.remove("perfil-feedback--erro");
    };

    reader.readAsDataURL(arquivo);
});

form?.addEventListener("submit", (evento) => {
    evento.preventDefault();

    if (!usuarioAtual) return;

    feedback.textContent = "";
    feedback.classList.remove("perfil-feedback--erro");

    const resultado = window.TruckwayAuth.atualizarUsuario(usuarioAtual.id, {
        nome: campos.nome.value,
        usuario: campos.usuario.value,
        email: campos.email.value,
        telefone: campos.telefone.value,
        empresa: campos.empresa.value,
        cnh: campos.cnh.value,
        caminhao: campos.caminhao.value,
        bio: campos.bio.value,
        senha: campos.senha.value,
        foto: fotoAtual,
    });

    if (!resultado.ok) {
        feedback.textContent = resultado.mensagem;
        feedback.classList.add("perfil-feedback--erro");
        return;
    }

    campos.senha.value = "";
    feedback.textContent = "Perfil atualizado com sucesso.";
    preencherPerfil(resultado.usuario);
});

sair?.addEventListener("click", () => {
    window.TruckwayAuth.sair();
    window.location.href = "login.html";
});

preencherPerfil(usuarioAtual);
