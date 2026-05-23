// ============================================================
//  dados.js — Truckway
//  Dados simulados do MVP: postos de apoio e balanças.
//  Em produção, estes dados viriam de uma API ou banco de dados.
//  Também exporta funções utilitárias usadas em todo o projeto.
// ============================================================

const Dados = {
  // ── Pontos de apoio ──────────────────────────────────────
  //  Postos de combustível e estrutura para caminhoneiros
  //  ao longo das principais rodovias de MG/SP.
  pontosDeApoio: [
    {
      id: "pa-001",
      nome: "Posto Modelo — BR-381 km 47",
      tipo: "posto",
      coords: [-23.104, -46.549], // Mairiporã/SP
      rodovia: "BR-381",
      descricao: "Pátio p/ caminhões, restaurante 24h, banheiro, ducha",
      avaliacao: 4.3,
    },
    {
      id: "pa-002",
      nome: "TruckStop Extrema — BR-381 km 231",
      tipo: "posto",
      coords: [-22.856, -46.318], // Extrema/MG
      rodovia: "BR-381",
      descricao: "GNV, estacionamento coberto, mecânica pesada, restaurante",
      avaliacao: 4.6,
    },
    {
      id: "pa-003",
      nome: "Posto Cruzeiro do Sul — BR-459 km 12",
      tipo: "posto",
      coords: [-22.267, -45.715], // Santa Rita do Sapucaí/MG
      rodovia: "BR-459",
      descricao: "Diesel S10, estacionamento, lanchonete",
      avaliacao: 4.0,
    },
    {
      id: "pa-004",
      nome: "Posto Horizonte — BR-459 km 38",
      tipo: "posto",
      coords: [-22.433, -45.451], // Itajubá/MG
      rodovia: "BR-459",
      descricao: "Pátio amplo, borracharia, restaurante, ducha",
      avaliacao: 4.1,
    },
    {
      id: "pa-005",
      nome: "Posto Fernão Dias — BR-381 km 112",
      tipo: "posto",
      coords: [-23.117, -46.556], // Atibaia/SP
      rodovia: "BR-381",
      descricao:
        "Estrutura completa: mecânica, restaurante, farmácia, caixa 24h",
      avaliacao: 4.5,
    },
    {
      id: "pa-006",
      nome: "Posto Triângulo — SP-330 km 88",
      tipo: "posto",
      coords: [-22.72, -47.012], // Campinas/SP
      rodovia: "SP-330",
      descricao: "Grande pátio, lavagem de caminhões, restaurante",
      avaliacao: 3.9,
    },
  ],

  // ── Balanças (postos de pesagem) ─────────────────────────
  balancas: [
    {
      id: "bal-001",
      nome: "Balança DNIT — BR-381 Norte km 238",
      coords: [-22.898, -46.259], // Extrema/MG
      rodovia: "BR-381",
      descricao: "Pesagem federal, sentido Belo Horizonte",
      operando: true,
    },
    {
      id: "bal-002",
      nome: "Balança DNIT — BR-381 Sul km 230",
      coords: [-22.862, -46.3], // Extrema/MG
      rodovia: "BR-381",
      descricao: "Pesagem federal, sentido São Paulo",
      operando: true,
    },
    {
      id: "bal-003",
      nome: "Posto de Pesagem DER — SP-330 km 91",
      coords: [-22.748, -47.038], // Campinas/SP
      rodovia: "SP-330",
      descricao: "Pesagem estadual, ambos os sentidos",
      operando: false,
    },
    {
      id: "bal-004",
      nome: "Balança PRF — BR-459 km 28",
      coords: [-22.362, -45.564], // Itajubá/MG
      rodovia: "BR-459",
      descricao: "Operação variável — fiscalização itinerante",
      operando: true,
    },
  ],

  // ── Funções utilitárias ──────────────────────────────────

  /**
   * Converte metros para exibição legível.
   * Ex.: 485320 → "485 km"  |  920 → "920 m"
   */
  formatarDistancia(metros) {
    if (metros >= 1000) {
      const km = metros / 1000;
      // Para rotas longas, não precisamos de decimais; para médias, 1 casa
      if (km >= 100) return `${km.toFixed(0)} km`;
      return `${km.toFixed(1)} km`;
    }
    return `${Math.round(metros)} m`;
  },

  /**
   * Converte segundos para exibição legível.
   * Ex.: 22800 → "6h 20min"  |  3600 → "1h"  |  540 → "9 min"
   */
  formatarDuracao(segundos) {
    const h = Math.floor(segundos / 3600);
    const m = Math.floor((segundos % 3600) / 60);
    const s = Math.floor(segundos % 60);
    if (h > 0) {
      return m === 0 ? `${h}h` : `${h}h ${m}min`;
    }
    if (m > 0) {
      return s === 0 ? `${m} min` : `${m} min ${s}s`;
    }
    return `${s} s`;
  },
};
