// ============================================================
//  config.js — Truckway
//  Ponto único de configuração da aplicação.
//  Coloque aqui suas chaves de API e parâmetros globais.
// ============================================================

const Config = {

  // ── Nominatim (Geocoding) ───────────────────────────────
  //  Serviço público de geocoding OpenStreetMap
  //  Sem limite de requisições com respeito ao rate limit
  NOMINATIM_URL: "https://nominatim.openstreetmap.org",

  // ── OpenRouteService ────────────────────────────────────
  //  Conta gratuita em: https://openrouteservice.org
  //  Limite gratuito: 2.000 requisições/dia — suficiente para o MVP
  ORS_API_KEY: "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjZiY2IyNDczMDQ0MDQ5MmRhOGM2ZGNhZTZlOWM3ZjBhIiwiaCI6Im11cm11cjY0In0=",
  ORS_BASE_URL: "https://api.openrouteservice.org/v2",
  ORS_PERFIL: "driving-hgv",  // Heavy Goods Vehicle para restrições de peso/altura

};