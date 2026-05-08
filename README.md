# Truckway — README do Projeto

## Visão geral

O **Truckway** é um projeto da equipe para a **FETIN 2026**, com foco em caminhoneiros. A ideia é criar um site com aparência de aplicativo (PWA), que ajude na navegação com rotas mais seguras, pontos de apoio, balanças e avaliações feitas por outros motoristas.

A prioridade do projeto é construir um **MVP simples, funcional e bem organizado**, sem depender de frameworks neste primeiro momento.

---

## Objetivo do MVP

Nesta primeira versão, o projeto deve entregar:

* uma **tela inicial** com identidade visual do Truckway;
* uma área para **planejar rota**;
* uma área de **mapa**;
* uma seção de **pontos de apoio**;
* uma seção de **avaliações**;
* uma página/seção **Sobre**;
* estrutura pronta para virar **PWA**.

Nem tudo precisa estar pronto de forma completa agora. O foco é ter uma base organizada para crescer depois.

---

## Como a aplicação vai funcionar

A ideia é usar um **layout fixo** no `index.html` com:

* cabeçalho no topo;
* menu lateral;
* área central (`main`) para trocar o conteúdo das páginas;
* barra de navegação inferior;
* conteúdo carregado dinamicamente por JavaScript.

As telas principais ficarão separadas dentro da pasta `paginas/`, e cada uma terá um arquivo JavaScript próprio para facilitar o trabalho em equipe.

---

## Estrutura do projeto

```txt
truckway/
├── index.html
├── manifest.json
├── service-worker.js
├── README.md
│
├── assets/
│   ├── icones/
│   ├── imagens/
│   └── logo/
│
├── css/
│   ├── global.css
│   ├── inicio.css
│   ├── rota.css
│   ├── mapa.css
│   ├── apoio.css
│   ├── avaliacoes.css
│   └── sobre.css
│
├── js/
│   ├── principal.js
│   ├── roteador.js
│   ├── interface.js
│   ├── dados.js
│   ├── mapas.js
│   ├── pwa.js
│   └── paginas/
│       ├── inicio.js
│       ├── rota.js
│       ├── mapa.js
│       ├── apoio.js
│       ├── avaliacoes.js
│       └── sobre.js
│
└── paginas/
    ├── inicio.html
    ├── rota.html
    ├── mapa.html
    ├── apoio.html
    ├── avaliacoes.html
    └── sobre.html
```

---

## Explicação de cada pasta e arquivo

### `index.html`

Arquivo principal da aplicação.

Responsável por:

* manter a estrutura base do site;
* carregar o cabeçalho, menu lateral e navegação inferior;
* abrir o conteúdo central dentro de um `<main>`;
* chamar os arquivos CSS e JS principais.

**Importante:** o `index.html` não deve ficar gigante. Ele serve como a moldura do projeto.

---

### `manifest.json`

Arquivo de configuração do PWA.

Define:

* nome do aplicativo;
* nome curto;
* cores do tema;
* ícones;
* modo de exibição.

---

### `service-worker.js`

Arquivo responsável por recursos de PWA, como:

* cache básico;
* carregamento mais rápido;
* suporte inicial a funcionamento offline.

---

### Pasta `assets/`

Guarda arquivos visuais do projeto.

#### `assets/icones/`

Ícones usados na interface.

#### `assets/imagens/`

Imagens gerais, ilustrações e elementos visuais.

#### `assets/logo/`

Logo oficial do Truckway.

---

### Pasta `css/`

Contém os estilos do projeto.

#### `global.css`

Estilos gerais do site: cores, fontes, espaçamento, componentes base.

#### `inicio.css`

Estilos específicos da tela inicial.

#### `rota.css`

Estilos da tela de planejamento de rota.

#### `mapa.css`

Estilos da tela do mapa.

#### `apoio.css`

Estilos da tela de pontos de apoio.

#### `avaliacoes.css`

Estilos da tela de avaliações.

#### `sobre.css`

Estilos da página sobre o projeto.

---

### Pasta `js/`

Contém toda a lógica da aplicação.

#### `principal.js`

Arquivo principal do JavaScript.

Responsável por:

* iniciar o site;
* chamar o roteador;
* carregar a página inicial;
* conectar os módulos.

#### `roteador.js`

Controla a navegação entre as telas.

Responsável por:

* trocar o conteúdo do centro da página;
* carregar os fragmentos HTML;
* responder aos cliques da barra inferior e do menu.

#### `interface.js`

Funções reutilizáveis de interface.

Exemplos:

* montar cards;
* criar botões;
* renderizar listas;
* mostrar alertas.

#### `dados.js`

Dados simulados do MVP.

Exemplos:

* pontos de apoio;
* balanças;
* avaliações;
* alertas;
* rotas sugeridas.

#### `mapas.js`

Arquivo reservado para a lógica de mapas.

Pode conter:

* integração com API de mapas;
* exibição de marcadores;
* cálculo visual de rota;
* localização aproximada.

#### `pwa.js`

Funções relacionadas ao comportamento de PWA.

Exemplos:

* registrar service worker;
* preparar instalação;
* futuramente lidar com notificações.

---

### Pasta `js/paginas/`

Contém scripts específicos de cada tela.

#### `inicio.js`

Lógica da tela inicial.

#### `rota.js`

Lógica da tela de planejamento de rota.

#### `mapa.js`

Lógica da tela de mapa.

#### `apoio.js`

Lógica da tela de pontos de apoio.

#### `avaliacoes.js`

Lógica da tela de avaliações.

#### `sobre.js`

Lógica da página sobre o projeto.

---

### Pasta `paginas/`

Contém o conteúdo de cada tela em HTML parcial.

Esses arquivos **não** precisam ter estrutura completa de HTML (`<html>`, `<head>`, `<body>`), porque serão carregados dentro do conteúdo principal do `index.html`.

#### `inicio.html`

Conteúdo da tela inicial.

#### `rota.html`

Conteúdo da tela de rota.

#### `mapa.html`

Conteúdo da tela de mapa.

#### `apoio.html`

Conteúdo da tela de pontos de apoio.

#### `avaliacoes.html`

Conteúdo da tela de avaliações.

#### `sobre.html`

Conteúdo da página sobre o projeto.

---

## Organização sugerida para a equipe

Como a equipe tem 4 pessoas, uma divisão possível é:

* **Pessoa 1:** estrutura do projeto e integração geral;
* **Pessoa 2:** HTML/CSS da tela inicial e layout base;
* **Pessoa 3:** páginas de rota, mapa e apoio;
* **Pessoa 4:** avaliações, dados simulados e PWA.

Essa divisão pode ser ajustada conforme o nível de cada integrante.

---

## Padrão de trabalho recomendado

1. Primeiro definir a estrutura das páginas.
2. Depois montar o `index.html` como moldura fixa.
3. Em seguida criar os fragmentos de cada página.
4. Depois aplicar o CSS.
5. Por fim conectar a navegação com JavaScript.

---

## Regras importantes

* manter os nomes dos arquivos padronizados;
* evitar criar arquivos gigantes;
* separar responsabilidade por arquivo;
* deixar o código fácil para iniciantes entenderem;
* não tentar implementar tudo de uma vez.

---

## Ideia principal do projeto

O Truckway existe para ajudar caminhoneiros com:

* rotas mais seguras;
* localização de apoio;
* consulta de balanças;
* avaliações de locais;
* experiência prática em formato de aplicativo.

---

## Próximos passos

Depois de organizar essa base, o próximo passo é criar:

1. o `index.html` com layout fixo;
2. a página inicial (`inicio.html`);
3. o CSS global;
4. a navegação entre páginas;
5. os dados simulados.

---

## Observação final

Este projeto está sendo construído de forma gradual. A prioridade agora é **clareza, organização e facilidade de manutenção**, para que toda a equipe consiga entender e contribuir.
