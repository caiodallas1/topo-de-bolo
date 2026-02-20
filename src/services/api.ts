import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateCakeTopper(
  imageBase64: string,
  name?: string,
  age?: string
): Promise<string> {
  let userPrompt = `Você é um designer especialista em criar decorações para festas. Um usuário enviou uma imagem para ser transformada em um conjunto de topo de bolo para impressão. Sua tarefa é seguir estes passos com precisão:
1. Identifique os personagens principais e os objetos decorativos importantes na imagem enviada.
2. Recrie cada um desses elementos como uma ilustração digital separada, de alta qualidade e com fundo transparente. O estilo deve ser vibrante, limpo e adequado para impressão (estilo "vetor" ou "cartoon").
3. Adicione a cada ilustração uma borda branca grossa e um contorno fino cinza ao redor, criando um efeito de "corte especial" (die-cut), para facilitar o recorte manual.
4. Organize todas essas ilustrações individuais, já com as bordas, em uma única tela branca de tamanho A4 (proporção 210x297mm).
5. Garanta que os elementos estejam bem distribuídos e não se sobreponham, aproveitando o espaço da folha.
6. O resultado final deve ser UMA ÚNICA imagem desta folha A4 pronta para impressão.`;

  if (name) {
    userPrompt += `\n7. IMPORTANTE: Incorpore o texto "${name}" em um dos elementos principais do topo de bolo (como uma placa, banner ou de forma estilizada). O estilo do texto (fonte, cor, efeitos) deve combinar perfeitamente com a tipografia e o tema da imagem de referência original. Se a imagem original tiver um nome, substitua-o por "${name}" mantendo o mesmo estilo.`;
  }

  if (age) {
    userPrompt += `\n8. IGUALMENTE IMPORTANTE: Encontre onde a idade está representada na imagem de referência (pode ser um número sozinho, ou texto como "5 anos", "2 meses", etc.). Substitua essa idade pelo texto "${age}". É crucial que você mantenha EXATAMENTE o mesmo estilo do original: mesma fonte, mesma cor, mesmos contornos e efeitos.`;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: {
          parts: [
            { text: userPrompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
          ],
        },
        config: {
          responseModalities: ["IMAGE"],
        },
      });

      // Extract the image from the response
      const parts = response.candidates?.[0]?.content?.parts;
      const imagePart = parts?.find((p) => p.inlineData);

      if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        return imagePart.inlineData.data;
      } else {
        throw new Error("A resposta da IA não continha uma imagem válida.");
      }
    } catch (error: any) {
      attempt++;
      console.error(`Tentativa ${attempt} falhou:`, error);
      
      // If it's the last attempt, throw the error
      if (attempt >= maxRetries) {
        throw error;
      }
      
      // Wait before retrying (exponential backoff: 1s, 2s, 4s)
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error("Falha ao gerar imagem após várias tentativas.");
}
