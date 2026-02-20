# Gerador de Topo de Bolo IA

Este projeto é um gerador de topos de bolo utilizando IA (Gemini Nano Banana).

## Como fazer deploy no Vercel

1.  Crie um novo projeto no [Vercel](https://vercel.com).
2.  Importe este repositório.
3.  Nas configurações do projeto ("Project Settings"), vá em **Environment Variables**.
4.  Adicione a seguinte variável:
    *   **Name:** `GEMINI_API_KEY`
    *   **Value:** Sua chave da API do Google Gemini (obtenha em [aistudio.google.com](https://aistudio.google.com/)).
5.  Faça o deploy!

## Desenvolvimento Local

1.  Instale as dependências:
    ```bash
    npm install
    ```
2.  Crie um arquivo `.env` na raiz do projeto com sua chave da API:
    ```env
    GEMINI_API_KEY=sua_chave_aqui
    ```
3.  Inicie o servidor de desenvolvimento:
    ```bash
    npm run dev
    ```
