# Vitaliver Gotas

Landing estática hecha con la misma plantilla que ZenVit/articumina (copiada de MagnesioVEE, la versión más nueva). Incluye el checkout en ventana con departamentos y ciudades de Paraguay, el mapa opcional, los combos, el descuento "antes de irte", el pago al recibir, el botón de WhatsApp, el Pixel con CAPI y las visitas en vivo para el panel.

## Precios
- 1 frasco: Gs. 139.000
- 2 frascos: Gs. 219.000 (ahorro Gs. 59.000)
- 3 frascos: Gs. 289.000 (ahorro Gs. 128.000)
- Descuento "antes de irte": Gs. 10.000 (1 frasco) y Gs. 20.000 (combos).

Costo del proveedor (Naturalcaps): Gs. 42.000. Precio sugerido: Gs. 119.200. La competencia (Tienda 360) lo vende a Gs. 129.000.
Si cambiás los precios, cambialos en dos lugares: `CONFIG.offers` en `index.html` y `BUNDLES` en `supabase/functions/create-vitaliver-order/index.ts`.

## Pedidos
El formulario envía el pedido a la edge function `create-vitaliver-order` (Supabase PROD). La función lo guarda en `pedidos_web` con producto `VITALIVER` y origen `landing_vitaliver`, usando los precios fijados en el servidor. El INSERT avisa por Telegram con el mismo disparador que las otras landings. Si la función falla, la página ofrece mandar el pedido por WhatsApp.

### Pasos en el servidor
Estado (14/11/2026): los tres están aplicados en PROD (migración `landing_vitaliver_origin`, función `create-vitaliver-order` v1 y `meta-purchase-worker` v29). Falta probar un pedido real de punta a punta.

1. **Migración** `supabase/migrations/20261114120000_landing_vitaliver_origin.sql`: agrega `landing_vitaliver` a `private.validate_order_creation_mode` (sin esto el panel rechaza el pedido) y a `private.queue_new_order_meta_purchase` (Purchase por CAPI). Es el mismo cuerpo que la versión de PROD del 14/11/2026, con el origen nuevo agregado.
2. **Edge function** `supabase/functions/create-vitaliver-order/index.ts`: se despliega con `verify_jwt = false`, igual que `create-magnesio-vee-order`.
3. **meta-purchase-worker** (hoy v28): sumar al mapa `PRODUCTS`:
   `landing_vitaliver: { id: 'VITALIVER-30ML', name: 'Vitaliver Gotas - 30 ml', sourceUrl: 'https://zenvit.github.io/vitaliver/' },`


## Meta y visitas
Pixel VENTA CAPI (2141006803281667): PageView, ViewContent, InitiateCheckout, Contact y Purchase, con eventID `<pedido>:purchase`. `zv-visitas.js` alimenta la Vista en tiempo real (`data-landing="landing_vitaliver"`). `track-visitor` ya acepta `zenvit.github.io` y no necesita cambios.

## Contenido
Los datos salen de la etiqueta (`Anuncios/Vitaliver/WhatsApp Image 2026-11-03 at 08.08.30.jpeg`): 30 porciones de 1 ml (15 gotas). Cada porción aporta vitamina B6 1,3 mg (100% VD), vitamina B12 2,4 µg (100% VD), alicina 3 mg y trans-resveratrol 10 mg. Ingredientes: inulina, pectina, trans-resveratrol, ajo en polvo, B6 y B12. Puede contener soja, pescado, crustáceos, piñón y huevo. No contiene gluten.
Los textos propios de la página no prometen curas, adelgazamiento ni resultados. No hay reseñas, contadores ni "personas viendo" inventados.
Los creativos del proveedor (Drive "CREATIVOS LISTOS", copiados en `Anuncios/Vitaliver/drive/`) ya no se usan en la página. Traían frases como "desinflama el hígado" o "100% efectivo". Falta cotejar las propiedades con la inscripción ante DINAVISA.

## Imágenes
Todo está en `img/`, en WebP 4:5:
- **Galería** (`vitaliver-01` a `08`): 1080, 560 y miniatura. Tiene flechas, deslizamiento y teclado.
- **Banners** (`vlb-*`): 1080×1350 y 560×700. Salen de `imgnuevo/`, la carpeta de PNG originales, que no se sube. Los 8 PNG (15,6 MB) quedaron en 1,4 MB.
- **Combos**: `combo-1/2/3.webp` para las opciones del pedido.

| Archivo | Original en imgnuevo/ | Dónde aparece |
|---|---|---|
| vlb-para-que-sirve | Vitaliver Gotas_ Bienestar en Cada Gota-1 (igual a `3`) | Banner después de la ficha |
| vlb-bienestar | Bienestar desde adentro con Vitaliver Gotas-2 | Secuencia, 1.ª |
| vlb-frasco-mano | Imagen de ChatGPT 14 nov 2026, 13_26_17 | Secuencia, 2.ª |
| vlb-15-gotas | Vitaliver Gotas_ Bienestar Diario-4 | Secuencia, 3.ª |
| vlb-formula | Infografía Vitaliver_ Fórmula Natural en Gotas-3 | Secuencia, 4.ª |
| vlb-conoce-formula | 9dc7aec7-….png (dice "NutriLi Labs") | Secuencia, 5.ª |
| vlb-beneficios | 499b9e0a-….png (dice "NutriLi Labs") | Secuencia, 6.ª |
| vlb-combos | Promoción Vitaliver Gotas ZenVit Store-5 | Placa de combos (con precios) |

`vlb-combos` muestra los precios (139.000 / 219.000 / 289.000). Si cambiás los precios, hay que rehacer esa imagen.

## Desarrollo y publicación
Sin dependencias: `python -m http.server 4173` en esta carpeta. Todo lo del producto está en `CONFIG` dentro de `index.html`. Se publica con GitHub Pages desde el repo `ZenVit/vitaliver`, rama `main`, raíz `/`. Está publicada desde el 14/11/2026 en https://zenvit.github.io/vitaliver/
