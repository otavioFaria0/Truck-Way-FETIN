# TRUCKWAY

Projeto desenvolvido para a FETIN 2026.

O Truckway é uma plataforma web em formato PWA voltada para caminhoneiros, com foco em:
- rotas seguras;
- restrições para caminhões;
- balanças;
- pontos de apoio;
- avaliações da comunidade.

---

# Estrutura do Projeto

## index.html
Arquivo principal da aplicação.

Responsável por:
- estrutura base do site;
- carregamento dos estilos;
- carregamento dos scripts;
- áreas principais da interface.

---

## manifest.json
Arquivo de configuração do PWA.

Define:
- nome do aplicativo;
- ícones;
- cores;
- comportamento de instalação;
- modo de exibição.

---

## service-worker.js
Responsável pelo funcionamento offline e cache do PWA.

Funções:
- cache de arquivos;
- carregamento rápido;
- suporte offline básico.

---

# Pasta assets/

Armazena arquivos visuais do projeto.

## assets/icones/
Ícones utilizados na interface.

## assets/imagens/
Imagens gerais do sistema.

## assets/logo/
Logo oficial do projeto.

---

# Pasta css/

## estilo.css
Arquivo principal de estilos.

Responsável por:
- layout;
- responsividade;
- cores;
- animações;
- aparência geral.

---

# Pasta js/

## principal.js
Arquivo principal do JavaScript.

Responsável por:
- iniciar o sistema;
- carregar a aplicação;
- conectar os módulos.

---

## roteador.js
Controla a navegação entre páginas/abas.

Responsável por:
- trocar telas;
- renderizar páginas;
- atualizar conteúdo principal.

---

## interface.js
Funções visuais reutilizáveis.

Exemplos:
- criação de cards;
- alertas;
- componentes;
- elementos dinâmicos.

---

## dados.js
Armazena dados simulados do MVP.

Exemplos:
- pontos de apoio;
- balanças;
- avaliações;
- rotas;
- alertas.

---

## mapas.js
Responsável pela integração com mapas.

Funções:
- localização;
- renderização do mapa;
- controle de rotas;
- marcadores.

---

## pwa.js
Funções relacionadas ao PWA.

Exemplos:
- registro do service worker;
- instalação do app;
- futuras notificações.

---

# Pasta paginas/

Contém as telas principais do sistema.

## inicio.js
Tela inicial do aplicativo.

---

## rota.js
Tela de planejamento de rota.

---

## mapa.js
Tela principal de navegação e visualização do trajeto.

---

## apoio.js
Tela de pontos de apoio e balanças.

---

## avaliacoes.js
Tela de avaliações dos usuários.

---

## sobre.js
Tela institucional do projeto.

Informações:
- objetivo;
- equipe;
- tecnologias;
- visão futura.

---

# Tecnologias Utilizadas

- HTML5
- CSS
- JavaScript
- PWA
- API de mapas (futura integração)

---

# Objetivo do MVP

Entregar uma aplicação funcional e demonstrável para a FETIN, validando a proposta do Truckway de forma simples, organizada e escalável.