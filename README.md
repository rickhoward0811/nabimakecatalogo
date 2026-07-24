# NABIMAKE — Backend (API)

API do catálogo da NABIMAKE: rotas públicas de produtos/categorias e um painel
admin protegido por **senha única** (sem cadastro de usuário).

## Rotas

### Públicas
- `GET /api/produtos` — lista produtos ativos (com nome da categoria)
- `GET /api/categorias` — lista categorias

### Admin (login + token)
- `POST /api/admin/login` — body: `{ "senha": "..." }` → retorna `{ token }`
- `GET /api/admin/produtos` — lista todos os produtos (ativos e inativos)
- `POST /api/admin/produtos` — cria produto
- `PUT /api/admin/produtos/:id` — edita produto
- `DELETE /api/admin/produtos/:id` — remove produto

Rotas de admin exigem o header:
```
Authorization: Bearer <token retornado no login>
```

## Rodar localmente

```bash
npm install
cp .env.example .env
# edite o .env com sua DATABASE_URL local ou do Railway, e defina ADMIN_PASSWORD e JWT_SECRET
npm run dev
```

## Deploy no Railway

1. Crie um novo serviço no Railway a partir deste repositório/pasta.
2. Adicione um banco Postgres ao projeto (Railway cria a variável `DATABASE_URL` automaticamente — só precisa referenciá-la no serviço da API).
3. Nas variáveis de ambiente do serviço da API, defina:
   - `DATABASE_URL` (referencie a do Postgres do Railway)
   - `ADMIN_PASSWORD` (a senha do painel admin)
   - `JWT_SECRET` (uma string aleatória longa)
   - `FRONTEND_URL` (a URL da Vercel, depois que o frontend estiver no ar)
   - `NODE_ENV=production`
4. Rode o `schema-nabimake.sql` (da Etapa 2) no banco do Railway, se ainda não rodou.
5. Deploy. O Railway detecta o `npm start` automaticamente.
