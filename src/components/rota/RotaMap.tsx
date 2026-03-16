import React from 'react'
import { RotaRow } from '@/types/rota'

interface RotaMapProps {
  rows: RotaRow[]
}

export function RotaMap({ rows }: RotaMapProps) {
  const markers = rows
    .filter((r) => r.client.latitude && r.client.longitude)
    .map((r, i) => ({
      lat: parseFloat(r.client.latitude as string),
      lng: parseFloat(r.client.longitude as string),
      name: r.client['NOME CLIENTE'],
      address: r.client.ENDEREÇO || '',
      index: i + 1,
    }))
    .filter((m) => !isNaN(m.lat) && !isNaN(m.lng))

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
          background-color: #2563eb;
          color: white;
          border-radius: 50%;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const markers = ${JSON.stringify(markers)};
        const map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const bounds = [];
        markers.forEach(m => {
          const icon = L.divIcon({
            className: 'custom-marker',
            html: m.index,
            iconSize: [28, 28],
            iconAnchor: [14, 14]
          });
          const marker = L.marker([m.lat, m.lng], { icon }).addTo(map);
          marker.bindPopup('<b>#' + m.index + ' - ' + m.name + '</b><br/>' + m.address);
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

  if (markers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-card border rounded-md p-8 text-center text-muted-foreground mt-2">
        <p>Nenhum cliente com coordenadas registradas nesta visualização.</p>
      </div>
    )
  }

  return (
    <div className="flex-1 rounded-md border bg-card overflow-hidden shadow-sm mt-2 relative">
      <iframe
        srcDoc={html}
        className="w-full h-full border-0 absolute inset-0"
        title="Mapa de Rotas"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  )
}
