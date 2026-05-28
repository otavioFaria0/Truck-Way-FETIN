(function () {
  const CHAVE_STORAGE = "truckway_avaliacoes";
  const CHAVE_EXEMPLOS = "truckway_avaliacoes_exemplos_adicionados";

  function criarAvaliacoesIniciais() {
    if (typeof Dados === "undefined" || !Array.isArray(Dados.pontosDeApoio)) {
      return [];
    }

    const comentarios = [
      "Local bem avaliado pela comunidade, com boa estrutura para parada durante a viagem.",
      "Ponto de apoio util para motoristas que precisam abastecer, descansar ou revisar a rota.",
      "Referencia cadastrada no Truckway para ajudar no planejamento de viagens mais seguras.",
      "Estrutura indicada para quem procura servicos basicos e uma parada mais tranquila.",
      "Avaliacao inicial criada a partir dos dados simulados do MVP.",
      "Local incluido como exemplo para demonstrar a area de avaliacoes do projeto.",
    ];

    return [...Dados.pontosDeApoio]
      .sort((a, b) => Number(b.avaliacao || 0) - Number(a.avaliacao || 0))
      .map((ponto, indice) => ({
        id: `exemplo-${ponto.id}`,
        local: ponto.nome,
        tipo: "Posto",
        rodovia: ponto.rodovia || "",
        nota: Math.max(1, Math.min(5, Math.round(Number(ponto.avaliacao) || 5))),
        comentario: comentarios[indice % comentarios.length],
        motorista: "Equipe Truckway",
        criadoEm: new Date(2026, 4, 27 - indice).toISOString(),
      }));
  }

  function adicionarExemplosUmaVez(avaliacoes) {
    try {
      if (localStorage.getItem(CHAVE_EXEMPLOS)) return avaliacoes;

      const exemplos = criarAvaliacoesIniciais();
      if (exemplos.length === 0) return avaliacoes;

      const idsExistentes = new Set(avaliacoes.map((avaliacao) => avaliacao.id));
      const exemplosNovos = exemplos.filter(
        (avaliacao) => !idsExistentes.has(avaliacao.id)
      );

      const avaliacoesComExemplos = [...avaliacoes, ...exemplosNovos];

      if (salvarAvaliacoes(avaliacoesComExemplos)) {
        localStorage.setItem(CHAVE_EXEMPLOS, "true");
      }

      return avaliacoesComExemplos;
    } catch (erro) {
      console.error("Nao foi possivel adicionar avaliacoes de exemplo.", erro);
      return avaliacoes;
    }
  }

  function carregarAvaliacoes() {
    try {
      const salvo = localStorage.getItem(CHAVE_STORAGE);
      const avaliacoes = salvo ? JSON.parse(salvo) : [];
      const lista = Array.isArray(avaliacoes) ? avaliacoes : [];
      return adicionarExemplosUmaVez(lista);
    } catch (erro) {
      console.error("Nao foi possivel carregar as avaliacoes.", erro);
      return criarAvaliacoesIniciais();
    }
  }

  function salvarAvaliacoes(avaliacoes) {
    try {
      localStorage.setItem(CHAVE_STORAGE, JSON.stringify(avaliacoes));
      return true;
    } catch (erro) {
      console.error("Nao foi possivel salvar as avaliacoes.", erro);
      return false;
    }
  }

  function escaparHtml(texto) {
    return String(texto)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function criarId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `avaliacao-${Date.now()}-${Math.round(Math.random() * 1000)}`;
  }

  function formatarData(dataIso) {
    const data = new Date(dataIso);
    if (Number.isNaN(data.getTime())) return "";

    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(data);
  }

  function iniciarAvaliacoes() {
    const form = document.getElementById("avaliacao-form");
    const lista = document.getElementById("avaliacoes-lista");
    const totalEl = document.getElementById("avaliacoes-total");
    const mediaEl = document.getElementById("avaliacoes-media");
    const feedback = document.getElementById("avaliacao-feedback");
    const notaInput = document.getElementById("avaliacao-nota");
    const botoesNota = document.querySelectorAll(".avaliacao-nota");

    if (!form || !lista || !notaInput) return;

    let avaliacoes = carregarAvaliacoes();

    function selecionarNota(nota) {
      notaInput.value = String(nota);

      botoesNota.forEach((botao) => {
        const estaAtivo = botao.dataset.nota === String(nota);
        botao.classList.toggle("avaliacao-nota--ativa", estaAtivo);
        botao.setAttribute("aria-pressed", String(estaAtivo));
      });
    }

    function atualizarResumo() {
      const total = avaliacoes.length;
      const media =
        total === 0
          ? 0
          : avaliacoes.reduce((soma, item) => soma + Number(item.nota || 0), 0) /
            total;

      if (totalEl) totalEl.textContent = String(total);
      if (mediaEl) mediaEl.textContent = media.toFixed(1);
    }

    function renderizarAvaliacoes() {
      atualizarResumo();

      if (avaliacoes.length === 0) {
        lista.innerHTML = `
          <div class="avaliacao-vazio">
            Nenhuma avaliacao salva ainda. Crie a primeira para ela aparecer aqui.
          </div>
        `;
        return;
      }

      lista.innerHTML = avaliacoes
        .map((avaliacao) => {
          const rodovia = avaliacao.rodovia
            ? ` - ${escaparHtml(avaliacao.rodovia)}`
            : "";
          const motorista = avaliacao.motorista
            ? escaparHtml(avaliacao.motorista)
            : "Motorista Truckway";

          return `
            <article class="avaliacao-card">
              <div class="avaliacao-card__topo">
                <div class="avaliacao-card__local">
                  <strong>${escaparHtml(avaliacao.local)}</strong>
                  <span class="avaliacao-card__meta">
                    ${escaparHtml(avaliacao.tipo)}${rodovia}
                  </span>
                </div>
                <span class="avaliacao-card__nota">${Number(avaliacao.nota)}/5</span>
              </div>

              <p class="avaliacao-card__comentario">
                ${escaparHtml(avaliacao.comentario)}
              </p>

              <div class="avaliacao-card__rodape">
                <span>${motorista} - ${formatarData(avaliacao.criadoEm)}</span>
                <button
                  class="avaliacao-card__excluir"
                  type="button"
                  data-excluir-avaliacao="${escaparHtml(avaliacao.id)}"
                >
                  Excluir
                </button>
              </div>
            </article>
          `;
        })
        .join("");
    }

    botoesNota.forEach((botao) => {
      botao.addEventListener("click", () => {
        selecionarNota(botao.dataset.nota);
      });
    });

    form.addEventListener("submit", (evento) => {
      evento.preventDefault();

      const novaAvaliacao = {
        id: criarId(),
        local: document.getElementById("avaliacao-local").value.trim(),
        tipo: document.getElementById("avaliacao-tipo").value,
        rodovia: document.getElementById("avaliacao-rodovia").value.trim(),
        nota: Number(notaInput.value),
        comentario: document.getElementById("avaliacao-comentario").value.trim(),
        motorista: document.getElementById("avaliacao-motorista").value.trim(),
        criadoEm: new Date().toISOString(),
      };

      if (!novaAvaliacao.local || !novaAvaliacao.comentario) {
        if (feedback) feedback.textContent = "Preencha o local e o comentario.";
        return;
      }

      const avaliacoesAtualizadas = [novaAvaliacao, ...avaliacoes];

      if (!salvarAvaliacoes(avaliacoesAtualizadas)) {
        if (feedback) {
          feedback.textContent =
            "Nao foi possivel salvar. Verifique o armazenamento do navegador.";
        }
        return;
      }

      avaliacoes = avaliacoesAtualizadas;
      form.reset();
      selecionarNota(5);
      renderizarAvaliacoes();

      if (feedback) {
        feedback.textContent = "Avaliacao salva com sucesso.";
        setTimeout(() => {
          feedback.textContent = "";
        }, 3500);
      }
    });

    form.addEventListener("reset", () => {
      setTimeout(() => selecionarNota(5), 0);
    });

    lista.addEventListener("click", (evento) => {
      const botaoExcluir = evento.target.closest("[data-excluir-avaliacao]");
      if (!botaoExcluir) return;

      const id = botaoExcluir.dataset.excluirAvaliacao;
      avaliacoes = avaliacoes.filter((avaliacao) => avaliacao.id !== id);
      salvarAvaliacoes(avaliacoes);
      renderizarAvaliacoes();
    });

    selecionarNota(5);
    renderizarAvaliacoes();
  }

  function registrar() {
    if (!window.Roteador) {
      window.addEventListener("load", registrar);
      return;
    }

    window.Roteador.registrarHook("avaliacoes", iniciarAvaliacoes);
  }

  registrar();
})();
