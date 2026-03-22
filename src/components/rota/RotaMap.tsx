import React from 'react'
import { RotaRow } from '@/types/rota'

interface RotaMapProps {
  rows: RotaRow[]
  userLocation?: { lat: number; lng: number } | null
}

export function RotaMap({ rows, userLocation }: RotaMapProps) {
  const markers = rows
    .filter((r) => r.client.latitude && r.client.longitude)
    .map((r, i) => {
      let color = 'white'
      let textColor = 'black'

      if (r.is_completed) {
        color = '#22c55e' // Green
        textColor = 'white'
      } else if (r.has_pendency || r.debito > 0) {
        color = '#ef4444' // Red
        textColor = 'white'
      }

      return {
        lat: parseFloat(r.client.latitude as string),
        lng: parseFloat(r.client.longitude as string),
        name: r.client['NOME CLIENTE'],
        address: r.client.ENDEREÇO || '',
        neighborhood: r.client.BAIRRO || '',
        city: r.client.MUNICÍPIO || '',
        code: r.client.CODIGO,
        debtValue: r.debito || 0,
        color,
        textColor,
      }
    })
    .filter((m) => !isNaN(m.lat) && !isNaN(m.lng))

  // prettier-ignore
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        body, html, #map { margin: 0; padding: 0; height: 100%; width: 100%; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
        .custom-marker {
          border-radius: 50%;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 11px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        .user-location-marker {
          border-radius: 50%;
          background-color: #ccff00; /* Neon Yellow */
          border: 3px solid white;
          box-shadow: 0 0 12px #ccff00, 0 2px 6px rgba(0,0,0,0.4);
        }
        .popup-nav-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 10px;
          padding: 8px 12px;
          background-color: #fef2f2;
          color: red;
          border: 1px solid #fca5a5;
          text-decoration: none;
          border-radius: 4px;
          font-weight: bold;
          font-size: 12px;
          text-align: center;
          width: 100%;
          box-sizing: border-box;
          transition: background-color 0.2s;
        }
        .popup-nav-btn:hover {
          background-color: #fee2e2;
        }
        .popup-nav-btn svg {
          width: 14px;
          height: 14px;
          fill: currentColor;
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const markers = ${JSON.stringify(markers)};
        const userLoc = ${userLocation ? JSON.stringify(userLocation) : 'null'};
        
        const map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const bounds = [];
        
        if (userLoc) {
          const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });
          const userMarker = L.marker([userLoc.lat, userLoc.lng], { icon: userIcon, zIndexOffset: 1000 }).addTo(map);
          userMarker.bindPopup('<b style="font-size: 14px;">Minha Localização</b>');
          bounds.push([userLoc.lat, userLoc.lng]);
        }

        markers.forEach(m => {
          const icon = L.divIcon({
            className: 'custom-marker',
            html: m.code,
            iconSize: [32, 32],
            iconAnchor: [16, 16]
          });
          const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
          
          marker.on('add', function() {
            const el = marker.getElement();
            if(el) {
              el.style.backgroundColor = m.color;
              el.style.color = m.textColor;
              if (m.color === 'white') el.style.border = '2px solid black';
            }
          });

          const navUrl = 'https://www.google.com/maps/search/?api=1&query=' + m.lat + ',' + m.lng;
          const formattedDebt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(m.debtValue);
          
          let addressFull = m.address;
          if (m.neighborhood) addressFull += ', ' + m.neighborhood;
          if (m.city) addressFull += ' - ' + m.city;

          const popupContent = '<b>#' + m.code + ' - ' + m.name + '</b><br/>' + 
                               addressFull + '<br/>' +
                               '<strong style="color:#ef4444; display:block; margin-top:4px;">Débito: ' + formattedDebt + '</strong>' +
                               '<a href="' + navUrl + '" target="_blank" class="popup-nav-btn">' +
                               '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M215.7 499.2C267 435 384 279.4 384 192C384 86 298 0 192 0S0 86 0 192c0 87.4 117 243 168.3 307.2c12.3 15.3 35.1 15.3 47.4 0zM192 128a64 64 0 1 1 0 128 64 64 0 1 1 0-128z"/></svg>' +
                               'Iniciar Navegação</a>';
                               
          marker.bindPopup(popupContent);
          bounds.push([m.lat, m.lng]);
        });

        if (bounds.length > 0) {
          map.fitBounds(bounds, { padding: [50, 50] });
        } else {
          map.setView([-15.7801, -47.9292], 4);
        }
      </script>
    </body>
    </html>
  `

  if (markers.length === 0 && !userLocation) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-card border rounded-md p-8 text-center text-muted-foreground mt-2">
        <p>Nenhum cliente ou localização registrada nesta visualização.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 rounded-md border bg-card overflow-hidden shadow-sm mt-2 relative min-h-[500px]">
      <iframe
        srcDoc={html}
        className="w-full h-full border-0 absolute inset-0"
        title="Mapa de Rotas"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
