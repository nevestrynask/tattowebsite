# Ativar o banco de dados e o painel

O site e o painel usam o Supabase (banco PostgreSQL, autenticação e armazenamento de imagens). O navegador recebe apenas a chave publicável; as regras RLS deste projeto limitam cada operação. **Nunca coloque uma chave `service_role` no site.**

## 1. Criar o projeto

1. Crie um projeto em [supabase.com](https://supabase.com/) e guarde a senha do banco.
2. No painel do projeto, abra **SQL Editor**, cole todo o conteúdo de `database.sql` e execute. Isso cria as tabelas, permissões, bucket de imagens e importa as oito peças que já aparecem na galeria.
   Se o banco já estava configurado, rode as migrações necessárias no SQL Editor. Para adicionar a descrição às tatuagens existentes: `alter table public.portfolio add column if not exists description text not null default '';`. Para salvar fotos diferentes na abertura e na apresentação: `alter table public.profile add column if not exists hero_photo_url text not null default ''; alter table public.profile add column if not exists story_photo_url text not null default '';`.
3. Em **Project Settings → API**, copie a **Project URL** e a chave **publishable** (em projetos antigos, a chave `anon` pública).
4. Preencha `supabase-config.js` com esses dois valores. A chave publicável é própria para o navegador; não use `service_role`.

## 2. Criar o acesso administrativo

1. Em **Authentication → Users**, crie o usuário com o e-mail da Duda e uma senha forte. Deixe o cadastro público desativado em **Authentication → Settings**.
2. No SQL Editor, consulte `select id, email from auth.users;` e copie o `id` da conta da Duda.
3. Autorize apenas esse usuário executando `insert into public.admin_users (user_id) values ('COLE-O-UUID-AQUI');`.
4. Abra `admin.html` pelo endereço publicado do site e entre com esse e-mail e senha.

O painel permite ver e atualizar o status de pedidos, definir exceções de disponibilidade, adicionar/editar/excluir peças e alterar nome, apresentação e foto do perfil. Pedidos são guardados quando a pessoa envia o formulário e o site também abre o WhatsApp para combinar o horário.

## 3. Publicar

Envie os arquivos do site para o repositório/hospedagem, incluindo `admin.html`, `admin.css`, `admin.js`, `supabase-config.js` e `database.sql`. O site atual usa caminhos relativos para as fotos existentes, então mantenha a pasta `assets` junto de `index.html`. Depois de preencher a configuração e publicar, teste a página inicial e `/admin.html`.

### Regras da agenda

Por padrão, todos os dias a partir de hoje aparecem disponíveis. Uma data marcada como indisponível no painel fecha apenas aquele dia; **Remover exceção** restaura a disponibilidade padrão. A data escolhida pelo cliente continua sendo uma preferência, nunca uma confirmação de horário.

