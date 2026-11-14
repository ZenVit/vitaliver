-- Autoriza los pedidos de la landing Vitaliver (origen landing_vitaliver):
-- 1) validate_order_creation_mode deja insertar desde la edge function create-vitaliver-order.
-- 2) queue_new_order_meta_purchase encola el Purchase para la API de conversiones de Meta.
-- Mismo cuerpo que las versiones actuales, solo se agrega el origen nuevo.

CREATE OR REPLACE FUNCTION private.validate_order_creation_mode()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_landing_origins text[] := ARRAY['landing_magnesium_complex', 'landing_limpiador_parabrisas', 'landing_articumina', 'landing_adelfit', 'landing_magnesio_vee', 'landing_vitaliver'];
  v_jwt_role text := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', '');
BEGIN
  IF NEW.is_test IS TRUE OR NEW.order_series = 'TEST' THEN
    IF NEW.order_source IS DISTINCT FROM 'test_mode' OR NEW.origen IS DISTINCT FROM 'prueba' THEN
      RAISE EXCEPTION 'ORDER_AUTOMATIC_CREATION_DISABLED: Invalid test order source';
    END IF;
  ELSIF NEW.order_source = 'landing_web' THEN
    IF v_jwt_role <> 'service_role' OR NOT (NEW.origen = ANY (v_landing_origins)) THEN
      RAISE EXCEPTION 'ORDER_AUTOMATIC_CREATION_DISABLED: Landing orders must come from an authorized edge function.';
    END IF;
  ELSE
    IF NEW.order_source IS DISTINCT FROM 'panel_manual' OR NEW.origen IS DISTINCT FROM 'manual' THEN
      RAISE EXCEPTION 'ORDER_AUTOMATIC_CREATION_DISABLED: Direct or automatic order creation is disabled. All real orders must originate from #order-entry.';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION private.queue_new_order_meta_purchase()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.origen = any (array[
       'landing_nac_resveratrol',
       'landing_bolso_impermeable',
       'landing_magnesium_complex',
       'landing_articumina',
       'landing_adelfit',
       'landing_magnesio_vee',
       'landing_vitaliver'
     ])
     and new.deleted_at is null
     and coalesce(new.is_test, false) = false then
    insert into public.meta_purchase_outbox (order_id, event_id, origin, confirmed_at)
    values (new.id, new.id || ':purchase', new.origen, coalesce(new.created_at, now()))
    on conflict (order_id) do nothing;
  end if;
  return new;
end;
$function$;
