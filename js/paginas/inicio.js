function iniciarInicio() {
  // ── Saudação por horário ──
  const hora = new Date().getHours();
  const periodo = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
  const el = document.getElementById("inicio-saudacao");
  if (el) el.textContent = `${periodo}, Motorista`;

  // ── Postos em destaque (top 3 por avaliação) ──
  const containerPostos = document.getElementById("inicio-postos");
  if (containerPostos && typeof Dados !== "undefined") {
    const top = [...Dados.pontosDeApoio]
      .sort((a, b) => b.avaliacao - a.avaliacao)
      .slice(0, 3);

    containerPostos.innerHTML = top.map((p) => {
      const estrelas = "★".repeat(Math.round(p.avaliacao)) + "☆".repeat(5 - Math.round(p.avaliacao));
      return `
        <div class="posto-card">
          <div class="posto-card__topo">
            <span class="posto-card__nome">${p.nome}</span>
            <span class="posto-card__badge">${p.rodovia}</span>
          </div>
          <p class="posto-card__desc">${p.descricao}</p>
          <span class="posto-card__estrelas">${estrelas} <b>${p.avaliacao}</b></span>
        </div>
      `;
    }).join("");
  }

  // ── Balanças ──
  const containerBalancas = document.getElementById("inicio-balancas");
  if (containerBalancas && typeof Dados !== "undefined") {
    containerBalancas.innerHTML = Dados.balancas.map((b) => `
      <div class="balanca-item">
        <span class="balanca-item__icone">⚖️</span>
        <div class="balanca-item__info">
          <strong>${b.nome}</strong>
          <small>${b.rodovia} · ${b.descricao}</small>
        </div>
        <span class="balanca-item__status balanca-item__status--${b.operando ? "ativa" : "inativa"}">
          ${b.operando ? "● Ativa" : "○ Inativa"}
        </span>
      </div>
    `).join("");
  }
}

