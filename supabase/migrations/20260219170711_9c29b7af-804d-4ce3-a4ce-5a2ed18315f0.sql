
-- ============================================================
-- CLAVICULÁRIO — Schema Completo
-- ============================================================

-- 1. Roles enum
CREATE TYPE public.app_role AS ENUM ('administrador', 'cabo_auxiliar');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  posto_grad TEXT,
  matricula TEXT,
  role app_role NOT NULL DEFAULT 'cabo_auxiliar',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- 4. Chaves table (48 chaves reais)
CREATE TABLE public.chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  departamento TEXT,
  codigo TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'emprestada')),
  militar_responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Viaturas table (apenas 2 viaturas reais)
CREATE TABLE public.viaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero INTEGER NOT NULL UNIQUE,
  prefixo TEXT NOT NULL,
  modelo TEXT NOT NULL,
  placa TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_uso', 'manutencao')),
  militar_responsavel TEXT,
  km_atual INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Visitantes table
CREATE TABLE public.visitantes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  documento TEXT NOT NULL,
  militar_responsavel TEXT NOT NULL,
  local_destino TEXT NOT NULL,
  hora_entrada TIMESTAMPTZ NOT NULL DEFAULT now(),
  hora_saida TIMESTAMPTZ,
  observacoes TEXT,
  cabo_registro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Materiais table
CREATE TABLE public.materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'emprestado')),
  militar_responsavel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Escala dos cabos auxiliares
CREATE TABLE public.escala_cabos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  data DATE NOT NULL,
  cabo_id INTEGER NOT NULL CHECK (cabo_id IN (1, 2)),
  cabo_nome TEXT NOT NULL,
  blocos JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (data, cabo_id)
);

-- 9. Histórico de Chaves
CREATE TABLE public.historico_chaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave_id UUID NOT NULL REFERENCES public.chaves(id),
  chave_nome TEXT NOT NULL,
  militar TEXT NOT NULL,
  matricula TEXT,
  data_retirada TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_devolucao TIMESTAMPTZ,
  cabo_retirada TEXT,
  cabo_devolucao TEXT,
  status TEXT NOT NULL DEFAULT 'em_uso' CHECK (status IN ('em_uso', 'devolvida')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Histórico de Viaturas
CREATE TABLE public.historico_viaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viatura_id UUID NOT NULL REFERENCES public.viaturas(id),
  viatura_prefixo TEXT NOT NULL,
  motorista TEXT NOT NULL,
  matricula TEXT,
  destino TEXT NOT NULL,
  km_saida INTEGER,
  km_retorno INTEGER,
  km_rodado INTEGER GENERATED ALWAYS AS (
    CASE WHEN km_retorno IS NOT NULL AND km_saida IS NOT NULL THEN km_retorno - km_saida ELSE NULL END
  ) STORED,
  autonomia_informada TEXT,
  data_saida TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_retorno TIMESTAMPTZ,
  cabo_saida TEXT,
  cabo_retorno TEXT,
  status TEXT NOT NULL DEFAULT 'em_uso' CHECK (status IN ('em_uso', 'retornada')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. Histórico de Material
CREATE TABLE public.historico_materiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materiais(id),
  material_nome TEXT NOT NULL,
  militar TEXT NOT NULL,
  matricula TEXT,
  data_saida TIMESTAMPTZ NOT NULL DEFAULT now(),
  data_retorno TIMESTAMPTZ,
  cabo_saida TEXT,
  cabo_retorno TEXT,
  status TEXT NOT NULL DEFAULT 'em_uso' CHECK (status IN ('em_uso', 'devolvido')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ENABLE RLS
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escala_cabos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_chaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_viaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_materiais ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS (security definer to avoid recursion)
-- ============================================================

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_administrador()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'administrador')
$$;

CREATE OR REPLACE FUNCTION public.get_cabo_on_duty()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_hour TEXT;
  cabo_nome TEXT;
  bloco JSONB;
  blocos JSONB;
  start_h INTEGER;
  end_h INTEGER;
  curr_h INTEGER;
BEGIN
  curr_h := EXTRACT(HOUR FROM NOW() AT TIME ZONE 'America/Sao_Paulo')::INTEGER;
  
  FOR blocos, cabo_nome IN 
    SELECT e.blocos, e.cabo_nome
    FROM public.escala_cabos e
    WHERE e.data = CURRENT_DATE
    ORDER BY e.cabo_id
  LOOP
    FOR bloco IN SELECT jsonb_array_elements(blocos)
    LOOP
      start_h := (bloco->>'inicio')::TEXT::INTEGER;
      end_h := (bloco->>'fim')::TEXT::INTEGER;
      
      IF start_h < end_h THEN
        IF curr_h >= start_h AND curr_h < end_h THEN
          RETURN cabo_nome;
        END IF;
      ELSE
        -- overnight block
        IF curr_h >= start_h OR curr_h < end_h THEN
          RETURN cabo_nome;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN 'Não identificado';
END;
$$;

-- ============================================================
-- AUTO-UPDATE TIMESTAMP TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chaves_updated_at BEFORE UPDATE ON public.chaves FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_viaturas_updated_at BEFORE UPDATE ON public.viaturas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_materiais_updated_at BEFORE UPDATE ON public.materiais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_escala_cabos_updated_at BEFORE UPDATE ON public.escala_cabos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- TRIGGER: auto-create profile on user signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'cabo_auxiliar')
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'cabo_auxiliar')
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- profiles
CREATE POLICY "Admins veem todos os perfis" ON public.profiles FOR SELECT USING (public.is_administrador() OR auth.uid() = id);
CREATE POLICY "Admins criam perfis" ON public.profiles FOR INSERT WITH CHECK (public.is_administrador());
CREATE POLICY "Admins ou proprio atualiza perfil" ON public.profiles FOR UPDATE USING (public.is_administrador() OR auth.uid() = id);
CREATE POLICY "Admins deletam perfis" ON public.profiles FOR DELETE USING (public.is_administrador());

-- user_roles
CREATE POLICY "Admins gerenciam roles" ON public.user_roles FOR ALL USING (public.is_administrador());
CREATE POLICY "Usuario ve proprio role" ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- chaves - todos autenticados veem
CREATE POLICY "Autenticados veem chaves" ON public.chaves FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins gerenciam chaves" ON public.chaves FOR INSERT WITH CHECK (public.is_administrador());
CREATE POLICY "Autenticados atualizam chaves" ON public.chaves FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins deletam chaves" ON public.chaves FOR DELETE USING (public.is_administrador());

-- viaturas
CREATE POLICY "Autenticados veem viaturas" ON public.viaturas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins gerenciam viaturas" ON public.viaturas FOR INSERT WITH CHECK (public.is_administrador());
CREATE POLICY "Autenticados atualizam viaturas" ON public.viaturas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins deletam viaturas" ON public.viaturas FOR DELETE USING (public.is_administrador());

-- visitantes
CREATE POLICY "Autenticados gerenciam visitantes" ON public.visitantes FOR ALL USING (auth.role() = 'authenticated');

-- materiais
CREATE POLICY "Autenticados veem materiais" ON public.materiais FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins gerenciam materiais" ON public.materiais FOR INSERT WITH CHECK (public.is_administrador());
CREATE POLICY "Autenticados atualizam materiais" ON public.materiais FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins deletam materiais" ON public.materiais FOR DELETE USING (public.is_administrador());

-- escala_cabos
CREATE POLICY "Autenticados veem escala" ON public.escala_cabos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admins gerenciam escala" ON public.escala_cabos FOR INSERT WITH CHECK (public.is_administrador());
CREATE POLICY "Admins atualizam escala" ON public.escala_cabos FOR UPDATE USING (public.is_administrador());
CREATE POLICY "Admins deletam escala" ON public.escala_cabos FOR DELETE USING (public.is_administrador());

-- historico_chaves
CREATE POLICY "Autenticados veem historico chaves" ON public.historico_chaves FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados criam historico chaves" ON public.historico_chaves FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados atualizam historico chaves" ON public.historico_chaves FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins deletam historico chaves" ON public.historico_chaves FOR DELETE USING (public.is_administrador());

-- historico_viaturas
CREATE POLICY "Autenticados veem historico viaturas" ON public.historico_viaturas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados criam historico viaturas" ON public.historico_viaturas FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados atualizam historico viaturas" ON public.historico_viaturas FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins deletam historico viaturas" ON public.historico_viaturas FOR DELETE USING (public.is_administrador());

-- historico_materiais
CREATE POLICY "Autenticados veem historico materiais" ON public.historico_materiais FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Autenticados criam historico materiais" ON public.historico_materiais FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Autenticados atualizam historico materiais" ON public.historico_materiais FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Admins deletam historico materiais" ON public.historico_materiais FOR DELETE USING (public.is_administrador());

-- ============================================================
-- SEED: 48 Chaves Reais
-- ============================================================
INSERT INTO public.chaves (numero, nome, departamento, codigo) VALUES
(1,  'Imediato',                          'Comando',             'CH-001'),
(2,  'Comandante',                         'Comando',             'CH-002'),
(3,  'Divisão de Armamento',               'Armamento',           'CH-003'),
(4,  'Escoteria FAB',                      'FAB',                 'CH-004'),
(5,  'Oficina SV / HV',                    'Manutenção',          'CH-005'),
(6,  'Oficina MV',                         'Manutenção',          'CH-006'),
(7,  'PPU',                                'Operações',           'CH-007'),
(8,  'Vestiário CB / MN',                  'Apoio',               'CH-008'),
(9,  'Divisão de Serviços Gerais',         'Serviços Gerais',     'CH-009'),
(10, 'Departamento de Operações',          'Operações',           'CH-010'),
(11, 'Briefing',                           'Operações',           'CH-011'),
(12, 'Divisão de Fator Humano',            'Fator Humano',        'CH-012'),
(13, 'Departamento de Segurança de Aviação','Segurança de Aviação','CH-013'),
(14, 'Vestiário 2º SG / 3º SG',           'Apoio',               'CH-014'),
(15, 'Paiol Seção Salvamento',             'Salvamento',          'CH-015'),
(16, 'Paiol Sobrevivência',                'Salvamento',          'CH-016'),
(17, 'Oficina Infláveis',                  'Manutenção',          'CH-017'),
(18, 'Sala Estar SO / 1º SG',             'Apoio',               'CH-018'),
(19, 'Divisão Controle da Qualidade',      'Qualidade',           'CH-019'),
(20, 'Divisão Planejamento',               'Planejamento',        'CH-020'),
(21, 'Chefe Departamento Manutenção',      'Manutenção',          'CH-021'),
(22, 'Divisão Informática',                'TI',                  'CH-022'),
(23, 'Divisão Pessoal',                    'Pessoal',             'CH-023'),
(24, 'Divisão Suprimentos',                'Suprimentos',         'CH-024'),
(25, 'SECOM',                              'Comunicações',        'CH-025'),
(26, 'Seção Inteligência',                 'Inteligência',        'CH-026'),
(27, 'Paiol Material Comum',               'Logística',           'CH-027'),
(28, 'Paiol Tintas',                       'Logística',           'CH-028'),
(29, 'Praça Dármanes',                     'Apoio',               'CH-029'),
(30, 'Vestiário Oficiais',                 'Apoio',               'CH-030'),
(31, 'Dormitório Serviço Contramestre',    'Apoio',               'CH-031'),
(32, 'Divisão Pista',                      'Pista',               'CH-032'),
(33, 'Divisão Aviônica',                   'Aviônica',            'CH-033'),
(34, 'Seção Baterias',                     'Manutenção',          'CH-034'),
(35, 'Sala Conversor',                     'Infraestrutura',      'CH-035'),
(36, 'Vestiário Feminino Oficiais',        'Apoio',               'CH-036'),
(37, 'Cisterna',                           'Infraestrutura',      'CH-037'),
(38, 'Portão Retaguarda',                  'Segurança',           'CH-038'),
(39, 'Paiol Mestre',                       'Logística',           'CH-039'),
(40, 'Paiol Mestre 2',                     'Logística',           'CH-040'),
(41, 'Sala Compressor',                    'Infraestrutura',      'CH-041'),
(42, 'POG1 (Paiol Óleos e Graxas 1)',      'Logística',           'CH-042'),
(43, 'POG2 (Paiol Óleos e Graxas 2)',      'Logística',           'CH-043'),
(44, 'Paiol Cabo',                         'Logística',           'CH-044'),
(45, 'Chave Viatura 01 — Ford Ka',         'Transporte',          'CH-045'),
(46, 'Chave Viatura 02 — L200',            'Transporte',          'CH-046'),
(47, 'Trator Reboque',                     'Transporte',          'CH-047'),
(48, 'Paiol Refrigeração',                 'Infraestrutura',      'CH-048');

-- ============================================================
-- SEED: 2 Viaturas Reais
-- ============================================================
INSERT INTO public.viaturas (numero, prefixo, modelo) VALUES
(1, 'VTR-01', 'Ford Ka'),
(2, 'VTR-02', 'L200');
