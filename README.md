# Pracinha

Um mini-espaço social onde conversas acontecem naturalmente. Sem seguidores, sem algoritmos, sem pressão.

## 🌟 Características

- **Feed de assuntos** - Compartilhe pensamentos, ideias e conversas
- **Status updates** - Mostre o que está ouvindo, comendo, lendo, assistindo ou fazendo
- **Meu Cantinho** - Espaço personalizado com suas fotos e perfil
- **Páginas personalizadas** - Sistema de páginas com suporte a sub-páginas
- **Tema claro/escuro** - Alternância de temas com persistência
- **Multi-idioma** - Suporte para português e inglês
- **Design responsivo** - Funciona em desktop e mobile

## 🚀 Tecnologias

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (autenticação, banco de dados, storage)
- **Hosting**: GitHub Pages
- **Design**: CSS Grid, Flexbox, variáveis CSS

## 📦 Estrutura do projeto

```
pracinha/
├── index.html          # Página principal
├── admin.html          # Painel de administração
├── recover-account.html # Recuperação de conta
├── manifest.json       # Manifesto PWA
├── sw.js              # Service Worker
├── src/
│   ├── css/           # Estilos
│   ├── js/            # JavaScript
│   ├── components/    # Componentes reutilizáveis
│   └── assets/        # Imagens e recursos
└── supabase/          # Configurações do Supabase
```

## 🔧 Configuração

1. Clone o repositório
2. Configure o projeto Supabase:
   - Crie um projeto em [supabase.com](https://supabase.com)
   - Configure as tabelas necessárias (veja arquivos SQL em `database/`)
   - Configure as variáveis de ambiente em `src/js/supabase-client.js`
3. Configure o CORS no Supabase para permitir o domínio do GitHub Pages

## 📝 Desenvolvimento

O projeto usa JavaScript vanilla sem frameworks. Para desenvolvimento local:

1. Abra `index.html` diretamente no navegador
2. Use um servidor local para testar funcionalidades que requerem HTTPS (como Service Worker)

## 🎨 Personalização

- **Cores**: Modifique as variáveis CSS em `src/css/main.css`
- **Fontes**: Adicione ou remova fontes no Google Fonts link em `index.html`
- **Layout**: Ajuste o grid system em `src/css/main.css`

## 📄 Licença

Feito com ❤️ por Juan Rocha.
