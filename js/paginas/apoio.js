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

      // Botões para destacar vias bloqueadas e gerenciar bloqueios
      const cards = document.querySelector('.apoio__cards');
      if (cards) {
        const drawCard = document.createElement('button');
        drawCard.className = 'categoria-card';
        drawCard.type = 'button';
        drawCard.innerHTML = `<span class="cat-icone">🚧</span><strong>Marcar via bloqueada</strong><small>Indique ruas/trechos onde caminhões não viram</small>`;
        drawCard.addEventListener('click', () => {
          window.TruckwayBloqueioPendente = true;
          try {
            window.Roteador.ir('mapa');
          } catch (e) {
            /* ignorar falhas de navegação */
          }

          // Se o mapa já estiver carregado, tenta iniciar o desenho imediatamente.
          if (typeof window.TruckwayStartDrawBloqueio === 'function') {
            window.TruckwayStartDrawBloqueio();
          }
        });
        cards.appendChild(drawCard);

        const manageCard = document.createElement('button');
        manageCard.className = 'categoria-card';
        manageCard.type = 'button';
        manageCard.innerHTML = `<span class="cat-icone">🗂️</span><strong>Gerenciar bloqueios</strong><small>Ver / remover trechos bloqueados</small>`;
        manageCard.addEventListener('click', () => {
          const bloqueios = (window.TruckwayBloqueiosGeoJSON && window.TruckwayBloqueiosGeoJSON.features) || [];
          const list = bloqueios.map((b, i) => {
            const first = b.geometry?.coordinates?.[0];
            const coords = first ? `${first[1].toFixed(4)}, ${first[0].toFixed(4)}` : 'sem coords';
            return `<li data-idx="${i}"><strong>Bloqueio ${i+1}</strong> — ${coords} <button class="remover-bloqueio">Remover</button></li>`;
          }).join('') || '<li>(nenhum bloqueio salvo)</li>';

          const modal = document.createElement('div');
          modal.className = 'modal-bloqueios';
          modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);z-index:4000;padding:20px;';
          modal.innerHTML = `<div style="background:#fff;border-radius:8px;max-width:520px;width:100%;padding:18px;box-shadow:0 6px 20px rgba(0,0,0,0.2)"><h3>Bloqueios salvos</h3><ul style="margin:12px 0 18px;padding-left:18px">${list}</ul><div style="text-align:right"><button class="fechar">Fechar</button></div></div>`;
          document.body.appendChild(modal);

          modal.querySelectorAll('.remover-bloqueio').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const li = e.target.closest('li');
              const idx = Number(li.dataset.idx);
              if (confirm('Remover este bloqueio?')) {
                if (typeof window.TruckwayRemoverBloqueio === 'function') window.TruckwayRemoverBloqueio(idx);
                modal.remove();
              }
            });
          });
          // Se os bloqueios mudarem enquanto o modal estiver aberto, atualizar listagem simples a cada 1s
          const interval = setInterval(() => {
            const novos = (window.TruckwayBloqueiosGeoJSON && window.TruckwayBloqueiosGeoJSON.features) || [];
            if (novos.length !== bloqueios.length) modal.remove();
          }, 1000);
          modal.querySelector('.fechar').addEventListener('click', () => { clearInterval(interval); modal.remove(); });

          modal.querySelector('.fechar').addEventListener('click', () => modal.remove());
        });
        cards.appendChild(manageCard);
      }

    }

    window.Roteador.registrarHook('apoio', _hookApoio);
  }

  registrar();
})();
