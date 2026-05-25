// js/paginas/apoio.js — comportamento da página de apoio
(function(){
  function registrar(){
    if(!window.Roteador){
      window.addEventListener('load', registrar);
      return;
    }

    function _hookApoio(){
      // Accordion FAQ
      document.querySelectorAll('.faq-question').forEach((btn) => {
        btn.addEventListener('click', () => {
          const expanded = btn.getAttribute('aria-expanded') === 'true';
          btn.setAttribute('aria-expanded', String(!expanded));
          const answer = btn.nextElementSibling;
          if(answer){
            answer.hidden = expanded;
          }
        });
      });

      // Busca rápida: envia a busca para a aba mapa (via sessionStorage)
      const input = document.getElementById('busca-apoio-input');
      const botao = document.getElementById('busca-apoio-botao');
      function executarBusca(){
        const termo = input?.value.trim();
        if(!termo) return;
        try{ sessionStorage.setItem('truckway_busca', termo); }catch(e){}
        // abre a aba mapa
        window.Roteador.ir('mapa');
      }
      botao?.addEventListener('click', executarBusca);
      input?.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') executarBusca(); });

      // Formulário de contato (simulação)
      const form = document.getElementById('apoio-form');
      const feedback = document.getElementById('apoio-feedback');
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        const nome = document.getElementById('apoio-nome')?.value || '';
        const email = document.getElementById('apoio-email')?.value || '';
        const tipo = document.getElementById('apoio-tipo')?.value || '';
        const mensagem = document.getElementById('apoio-mensagem')?.value || '';

        // Aqui você integraria com a API de chamados. Por enquanto, simulamos.
        feedback.textContent = 'Chamado enviado — obrigado! Responderemos por e-mail.';
        form.reset();

        setTimeout(() => { feedback.textContent = ''; }, 7000);
      });

    }

    window.Roteador.registrarHook('apoio', _hookApoio);
  }

  registrar();
})();
