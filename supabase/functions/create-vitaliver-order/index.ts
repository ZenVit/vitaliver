// Pedidos de la landing Vitaliver Gotas (zenvit.github.io/vitaliver).
// Copia de create-articumina-order: pedidos_web no acepta INSERT del rol anon, así que el
// formulario envía acá y la función guarda con la service role. El INSERT dispara el aviso de Telegram.
// Producto, precios y origen se fijan en el servidor: el navegador solo elige la cantidad.

const PRODUCT_NAME = "VITALIVER";
const ORIGIN = "landing_vitaliver";
// Precio TOTAL por combo.
const BUNDLES: Record<number, number> = { 1: 159000, 2: 259000, 3: 320000 };
const DEPARTMENTS = ["Asunción", "Central"];
// Descuento de la ventana "antes de irte" de la landing. El monto lo fija el servidor:
// el navegador solo avisa que la persona lo aceptó (descuento: "salida").
const EXIT_DISCOUNT: Record<number, number> = { 1: 10000, 2: 20000, 3: 20000 };

const headers = {
  // Formulario público: la seguridad está en la validación, no en el Origin.
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function reply(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), { status, headers });
}

// 20000 → "20.000"
const gs = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

function clean(value: unknown, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return reply({ error: "Método no permitido." }, 405);

  const raw = await req.text();
  if (raw.length > 30000) return reply({ error: "Solicitud demasiado grande." }, 413);

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw);
  } catch {
    return reply({ error: "Solicitud inválida." }, 400);
  }

  // Honeypot del formulario.
  if (clean(body.website, 100)) return reply({ ok: true }, 200);

  const cantidad = Number(body.cantidad);
  const nombre = clean(body.nombre, 120).replace(/\s+/g, " ");
  let telefono = clean(body.telefono, 30).replace(/\D/g, "");
  if (telefono.startsWith("595")) telefono = "0" + telefono.slice(3);
  if (/^9\d{8}$/.test(telefono)) telefono = "0" + telefono;
  const ciudad = clean(body.ciudad, 100);
  const direccion = clean(body.direccion, 500);
  const deptoElegido = clean(body.departamento, 60);
  const interior = !DEPARTMENTS.includes(deptoElegido);

  if (!(cantidad in BUNDLES)) return reply({ error: "Elegí una cantidad válida." }, 400);
  if (nombre.length < 3 || !/^09\d{8}$/.test(telefono) || ciudad.length < 2 || direccion.length < 3) {
    return reply({ error: "Completá correctamente los datos obligatorios." }, 400);
  }

  const id = "PY" + String(Date.now()).slice(-6) + String(Math.floor(10 + Math.random() * 90));
  const precioLista = BUNDLES[cantidad];
  const descuento = clean(body.descuento, 20) === "salida" ? EXIT_DISCOUNT[cantidad] || 0 : 0;
  const total = precioLista - descuento;
  const maps = clean(body.ubicacion_maps, 500);

  const row = {
    id,
    producto: PRODUCT_NAME,
    precio: Math.round(total / cantidad),
    cantidad,
    subtotal: total,
    total_pagar: total,
    costo_envio: 0,
    ganancia: 0,
    nombre,
    telefono,
    correo: "No informado",
    ci: "No informado",
    departamento: interior ? "Interior" : deptoElegido,
    ciudad,
    direccion,
    referencia: clean(body.referencia, 1500) || "Sin referencia",
    ...(descuento ? {
      observaciones: `Descuento web "antes de irte": Gs. ${gs(descuento)} (precio normal Gs. ${gs(precioLista)}).`,
    } : {}),
    ubicacion_maps: maps || "No informado",
    maps_url: maps,
    tipo_entrega: interior ? "Transportadora" : "Delivery a domicilio",
    requiere_pago_anticipado: false,
    tipo_pago: "contra_entrega",
    zona_cliente: interior ? "interior" : "asuncion_central",
    datos_confirmados: true,
    estado: "Pendiente",
    origen: ORIGIN,
    // Habilita la excepción de private.validate_order_creation_mode.
    order_source: "landing_web",
    ip: clean(req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") || "No informado", 80),
    user_agent: clean(req.headers.get("user-agent") || body.user_agent, 400),
    utm_source: clean(body.utm_source, 160),
    utm_medium: clean(body.utm_medium, 160),
    utm_campaign: clean(body.utm_campaign, 200),
    fbclid: clean(body.fbclid, 300),
    landing_url: clean(body.landing_url, 500) || null,
    meta_fbp: clean(body.meta_fbp, 200) || null,
    meta_fbc: clean(body.meta_fbc, 300) || null,
    created_at: new Date().toISOString(),
  };

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRole) {
    console.error("create-vitaliver-order: falta configuración de Supabase");
    return reply({ error: "No pudimos registrar tu pedido. Intentá nuevamente." }, 500);
  }

  // DEV no tiene todas las columnas que sí tiene PROD: si PostgREST no conoce una
  // columna (PGRST204) se quita del pedido y se reintenta.
  const payload: Record<string, unknown> = { ...row };
  const required = new Set(["id", "producto", "precio", "cantidad", "subtotal", "nombre", "telefono", "ciudad", "direccion", "estado", "origen", "order_source"]);
  for (let attempt = 0; attempt < 20; attempt++) {
    const insert = await fetch(`${supabaseUrl}/rest/v1/pedidos_web`, {
      method: "POST",
      headers: {
        apikey: serviceRole,
        Authorization: `Bearer ${serviceRole}`,
        "Content-Type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify(payload),
    });
    if (insert.ok) return reply({ ok: true, orderId: id, total, descuento }, 201);

    const detail = await insert.text();
    const missing = detail.match(/Could not find the '([a-z0-9_]+)' column/)?.[1];
    if (insert.status === 400 && missing && missing in payload && !required.has(missing)) {
      delete payload[missing];
      continue;
    }
    console.error("create-vitaliver-order insert", insert.status, detail);
    return reply({ error: "No pudimos registrar tu pedido. Intentá nuevamente." }, 500);
  }

  console.error("create-vitaliver-order: demasiadas columnas desconocidas");
  return reply({ error: "No pudimos registrar tu pedido. Intentá nuevamente." }, 500);
});
