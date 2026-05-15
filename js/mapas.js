let mapa = null;

function renderizarMapa() {
    const container = document.getElementById('mapa-container');

    // Só roda se a div existir e o mapa ainda não tiver sido criado
    if (!container || mapa) return;

    const coords = [-22.2568, -45.7036];

    mapa = L.map('mapa-container', {
        zoomControl: false
    }).setView(coords, 15);

    // Zoom no canto inferior
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '©OSM'
    }).addTo(mapa);

    // Pin no Inatel
    L.marker(coords).addTo(mapa)
        .bindPopup('<b>Truckway</b><br>Inatel')
        .openPopup();
}

// Verifica se a página de mapa está ativa para carregar o Leaflet
setInterval(() => {
    if (!document.getElementById('mapa-container')) {
        mapa = null; // Reseta se sair da aba
    } else {
        renderizarMapa();
    }
}, 500);