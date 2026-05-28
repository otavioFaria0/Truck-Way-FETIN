(function () {
  const CHAVE_USUARIOS = "truckway_usuarios";
  const CHAVE_SESSAO = "truckway_usuario_atual";

  const CONTAS_EQUIPE = [
    {
      id: "adm-truckway",
      nome: "Administrador Truckway",
      usuario: "admin",
      email: "admin@truckway.local",
      senha: "admin123",
      perfil: "Administrador",
      telefone: "",
      empresa: "Truckway",
      cnh: "",
      caminhao: "",
      bio: "Conta administrativa da equipe do projeto.",
      foto: "",
      criadoEm: "2026-05-27T00:00:00.000Z",
      atualizadoEm: "2026-05-27T00:00:00.000Z",
    },
    {
      id: "dev-truckway",
      nome: "Equipe de Desenvolvimento",
      usuario: "dev",
      email: "dev@truckway.local",
      senha: "dev123",
      perfil: "Programador",
      telefone: "",
      empresa: "Truckway",
      cnh: "",
      caminhao: "",
      bio: "Conta compartilhada para testes da equipe.",
      foto: "",
      criadoEm: "2026-05-27T00:00:00.000Z",
      atualizadoEm: "2026-05-27T00:00:00.000Z",
    },
  ];

  function normalizar(valor) {
    return String(valor || "").trim().toLowerCase();
  }

  function criarId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `usuario-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  }

  function lerUsuarios() {
    try {
      const usuarios = JSON.parse(localStorage.getItem(CHAVE_USUARIOS) || "[]");
      return Array.isArray(usuarios) ? usuarios : [];
    } catch {
      return [];
    }
  }

  function salvarUsuarios(usuarios) {
    localStorage.setItem(CHAVE_USUARIOS, JSON.stringify(usuarios));
  }

  function usuarioPublico(usuario) {
    if (!usuario) return null;
    const { senha, ...dadosPublicos } = usuario;
    return dadosPublicos;
  }

  function procurarUsuario(identificador, usuarios = lerUsuarios()) {
    const termo = normalizar(identificador);
    return usuarios.find(
      (usuario) =>
        normalizar(usuario.usuario) === termo || normalizar(usuario.email) === termo
    );
  }

  function sincronizarSessaoComUsuario(usuarioAtualizado) {
    const sessao = obterUsuarioAtual();
    if (!sessao || sessao.id !== usuarioAtualizado.id) return;
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioPublico(usuarioAtualizado)));
  }

  function garantirContasPadrao() {
    const usuarios = lerUsuarios();
    let alterado = false;

    CONTAS_EQUIPE.forEach((conta) => {
      const jaExiste = usuarios.some(
        (usuario) =>
          usuario.id === conta.id ||
          normalizar(usuario.usuario) === normalizar(conta.usuario) ||
          normalizar(usuario.email) === normalizar(conta.email)
      );

      if (!jaExiste) {
        usuarios.push({ ...conta });
        alterado = true;
      }
    });

    const usuarioAntigo = localStorage.getItem("usuario");
    const senhaAntiga = localStorage.getItem("senha");

    if (usuarioAntigo && senhaAntiga && !procurarUsuario(usuarioAntigo, usuarios)) {
      usuarios.push({
        id: criarId(),
        nome: usuarioAntigo,
        usuario: usuarioAntigo,
        email: "",
        senha: senhaAntiga,
        perfil: "Motorista",
        telefone: "",
        empresa: "",
        cnh: "",
        caminhao: "",
        bio: "",
        foto: "",
        criadoEm: new Date().toISOString(),
        atualizadoEm: new Date().toISOString(),
      });
      alterado = true;
    }

    if (alterado) salvarUsuarios(usuarios);
  }

  function obterUsuarioAtual() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_SESSAO) || "null");
    } catch {
      return null;
    }
  }

  function entrar(identificador, senha) {
    garantirContasPadrao();
    const usuario = procurarUsuario(identificador);

    if (!usuario || usuario.senha !== senha) {
      return { ok: false, mensagem: "Usuario ou senha incorretos." };
    }

    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioPublico(usuario)));
    localStorage.setItem("logado", "true");
    return { ok: true, usuario: usuarioPublico(usuario) };
  }

  function cadastrar(dados) {
    garantirContasPadrao();

    const usuarios = lerUsuarios();
    const usuario = String(dados.usuario || "").trim();
    const email = String(dados.email || "").trim();
    const senha = String(dados.senha || "");

    if (!dados.nome?.trim() || !usuario || !email || !senha) {
      return { ok: false, mensagem: "Preencha todos os campos obrigatorios." };
    }

    if (senha.length < 6) {
      return { ok: false, mensagem: "A senha precisa ter pelo menos 6 caracteres." };
    }

    if (procurarUsuario(usuario, usuarios) || procurarUsuario(email, usuarios)) {
      return { ok: false, mensagem: "Usuario ou e-mail ja cadastrado." };
    }

    const novoUsuario = {
      id: criarId(),
      nome: dados.nome.trim(),
      usuario,
      email,
      senha,
      perfil: "Motorista",
      telefone: "",
      empresa: "",
      cnh: "",
      caminhao: "",
      bio: "",
      foto: "",
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    usuarios.push(novoUsuario);
    salvarUsuarios(usuarios);
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(usuarioPublico(novoUsuario)));
    localStorage.setItem("logado", "true");

    return { ok: true, usuario: usuarioPublico(novoUsuario) };
  }

  function atualizarUsuario(id, dados) {
    const usuarios = lerUsuarios();
    const indice = usuarios.findIndex((usuario) => usuario.id === id);

    if (indice === -1) {
      return { ok: false, mensagem: "Usuario nao encontrado." };
    }

    const usuarioAtual = usuarios[indice];
    const novoUsuario = String(dados.usuario || usuarioAtual.usuario).trim();
    const novoEmail = String(dados.email || usuarioAtual.email).trim();
    const senha = String(dados.senha || "");

    const existeOutro = usuarios.some(
      (usuario) =>
        usuario.id !== id &&
        (normalizar(usuario.usuario) === normalizar(novoUsuario) ||
          normalizar(usuario.email) === normalizar(novoEmail))
    );

    if (existeOutro) {
      return { ok: false, mensagem: "Usuario ou e-mail ja esta em uso." };
    }

    usuarios[indice] = {
      ...usuarioAtual,
      nome: String(dados.nome || usuarioAtual.nome).trim(),
      usuario: novoUsuario,
      email: novoEmail,
      telefone: String(dados.telefone || "").trim(),
      empresa: String(dados.empresa || "").trim(),
      cnh: String(dados.cnh || "").trim(),
      caminhao: String(dados.caminhao || "").trim(),
      bio: String(dados.bio || "").trim(),
      foto: dados.foto ?? usuarioAtual.foto,
      senha: senha ? senha : usuarioAtual.senha,
      atualizadoEm: new Date().toISOString(),
    };

    salvarUsuarios(usuarios);
    sincronizarSessaoComUsuario(usuarios[indice]);

    return { ok: true, usuario: usuarioPublico(usuarios[indice]) };
  }

  function sair() {
    localStorage.removeItem(CHAVE_SESSAO);
    localStorage.removeItem("logado");
  }

  function obterIniciais(nome) {
    const partes = String(nome || "Motorista")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (partes.length === 0) return "TW";
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return `${partes[0][0]}${partes[partes.length - 1][0]}`.toUpperCase();
  }

  function exigirLogin() {
    const usuario = obterUsuarioAtual();

    if (!usuario) {
      window.location.href = "login.html";
      return null;
    }

    return usuario;
  }

  function sincronizarCabecalho() {
    const usuario = obterUsuarioAtual();
    const avatar = document.querySelector(".botao-perfil__avatar");
    const nome = document.querySelector(".botao-perfil__texto strong");
    const status = document.querySelector(".botao-perfil__texto small");
    const linkPerfil = document.getElementById("linkPerfil");
    const linkLogin = document.getElementById("linkLogin");
    const logoutBtn = document.getElementById("logoutBtn");

    if (!avatar || !nome || !status) return;

    if (!usuario) {
      avatar.textContent = "TW";
      nome.textContent = "Visitante";
      status.textContent = "Entrar";
      if (linkPerfil) linkPerfil.style.display = "none";
      if (linkLogin) linkLogin.style.display = "";
      if (logoutBtn) logoutBtn.style.display = "none";
      return;
    }

    avatar.textContent = obterIniciais(usuario.nome);
    nome.textContent = usuario.nome;
    status.textContent = usuario.perfil || "Motorista";
    if (linkPerfil) linkPerfil.style.display = "";
    if (linkLogin) linkLogin.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "";
  }

  garantirContasPadrao();

  window.TruckwayAuth = {
    entrar,
    cadastrar,
    sair,
    obterUsuarioAtual,
    atualizarUsuario,
    obterIniciais,
    exigirLogin,
    sincronizarCabecalho,
  };

  document.addEventListener("DOMContentLoaded", sincronizarCabecalho);
})();
