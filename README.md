# Painel Estação Futuro

Dashboard estático (HTML + CSS + JS, sem build) com os dados combinados das 3 planilhas de inscrição do programa Estação Futuro.

## Rodar localmente

Sirva a pasta com qualquer servidor estático (precisa ser via HTTP, não `file://`, por causa do `fetch('data.json')`):

```bash
npx serve .
```

## Arquivos

- `index.html` — estrutura da página
- `style.css` — estilos (tokens de cor para tema claro/escuro)
- `script.js` — carrega `data.json`, calcula os indicadores e desenha os gráficos (Chart.js via CDN)
- `data.json` — dados combinados das 3 planilhas originais
