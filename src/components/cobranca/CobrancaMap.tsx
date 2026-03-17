import React from 'react'
import { ClientDebt } from '@/types/cobranca'

interface CobrancaMapProps {
  data: ClientDebt[]
  selectedItems: Set<string>
  showAll?: boolean
}

export function CobrancaMap({
  data,
  selectedItems,
  showAll = false,
}: CobrancaMapProps) {
  const selectedClientsMap = new Map()

  data.forEach((client) => {
    let hasSelected = false
    let status = 'SEM DÉBITO'
    let isMotoqueiro = false

    const isMotoRoute = client.routeGroup?.toLowerCase().includes('moto')

    client.orders.forEach((order) => {
      order.installments.forEach((inst, index) => {
        const uniqueId = `${client.clientId || '0'}-${order.orderId || '0'}-${inst.id || '0'}-${index}`
        if (
          showAll ||
          selectedItems.has(uniqueId) ||
          isMotoRoute ||
          inst.formaCobranca === 'MOTOQUEIRO'
        ) {
          hasSelected = true
          if (inst.formaCobranca === 'MOTOQUEIRO') {
            isMotoqueiro = true
          }
          if (inst.status === 'VENCIDO') status = 'VENCIDO'
          else if (inst.status === 'A VENCER' && status !== 'VENCIDO')
            status = 'A VENCER'
        }
      })
    })

    if (hasSelected && client.latitude && client.longitude) {
      selectedClientsMap.set(client.clientId, {
        lat: parseFloat(client.latitude),
        lng: parseFloat(client.longitude),
        name: client.clientName,
        address: client.address || '',
        neighborhood: client.neighborhood || '',
        city: client.city || '',
        debtValue: client.totalDebt,
        code: client.clientId,
        status,
        isMotoqueiro,
      })
    }
  })

  const markers = Array.from(selectedClientsMap.values()).map((c) => {
    let color = 'black'
    let textColor = 'white'

    if (c.isMotoqueiro) {
      color = 'black'
      textColor = 'white'
    } else if (c.status === 'VENCIDO') {
      color = '#ef4444' // Red
      textColor = 'white'
    } else if (c.status === 'A VENCER') {
      color = '#22c55e' // Green
      textColor = 'white'
    }

    return { ...c, color, textColor }
  })

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
        const map = L.map('map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19
        }).addTo(map);

        const bounds = [];
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

  if (markers.length === 0) {
    return (
      <div className="mt-2 flex h-[500px] flex-col items-center justify-center rounded-md border bg-card p-8 text-center text-muted-foreground">
        <p>Nenhum cliente com coordenadas registradas para a seleção atual.</p>
      </div>
    )
  }

  return (
    <div className="relative mt-2 min-h-[600px] flex-1 overflow-hidden rounded-md border bg-card shadow-sm">
      <iframe
        srcDoc={html}
        className="absolute inset-0 h-full w-full border-0"
        title="Mapa de Cobrança"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  )
}
