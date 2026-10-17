-- FASE 12.9 — Execute no SQL Editor do Supabase como administrador do projeto.
-- Não altera os pedidos, funções de checkout ou a política pública para anon.
BEGIN;

-- O painel usa o papel authenticated; a permissão de anon não se aplica a ele.
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT (id, name, variation, price, available)
ON public.products TO authenticated;

-- Concede UPDATE exclusivamente nas duas colunas editáveis.
GRANT UPDATE (price, available) ON public.products TO authenticated;

-- A leitura e alteração só passam pelo RLS quando o UID está em admin_users.
CREATE POLICY "Admins can read products"
ON public.products FOR SELECT TO authenticated
USING ((SELECT public.is_admin()));

CREATE POLICY "Admins can update product pricing and availability"
ON public.products FOR UPDATE TO authenticated
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

COMMIT;

-- Após executar, confirme no painel com o login administrativo.
-- Usuários autenticados não administradores não devem receber produtos nesta consulta.
