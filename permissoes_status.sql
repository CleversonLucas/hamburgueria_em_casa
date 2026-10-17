-- FASE 12.7 — Executar uma única vez no SQL Editor (administrador do projeto).
-- Restringe a alteração de pedidos à coluna status e aos usuários em admin_users.
begin;

create policy "Admins can update order status"
on public.orders
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

-- Sem UPDATE na tabela inteira: apenas a coluna status.
grant update (status) on public.orders to authenticated;

commit;

-- Conferência opcional:
-- select policyname, cmd, roles from pg_policies
-- where schemaname='public' and tablename='orders';
-- select has_column_privilege('authenticated','public.orders','status','UPDATE');
