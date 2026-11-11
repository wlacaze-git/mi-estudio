// Edge Function: procesar-foto
// Recibe una imagen (data URL o base64) y un modo, llama a Gemini y devuelve JSON.
// La clave GEMINI_API_KEY se configura como secreto en Supabase, nunca en la app.
//
// Modos: "horario" | "apunte" | "preguntas" | "explicacion"
// Deploy: Supabase → Edge Functions → Create function → nombre "procesar-foto" → pegar → Deploy.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";

const PROMPTS = {
  horario: `Sos un asistente que lee la foto de un horario escolar.
Extraé SOLO las clases de lunes a viernes.
- dia: 1 = lunes, 2 = martes, 3 = miércoles, 4 = jueves, 5 = viernes.
- inicio y fin en formato HH:MM (24 horas).
- materia y profesor tal como aparecen; si no se leen, dejá cadena vacía.
- No inventes clases ni horarios. Si la foto no es un horario, devolvé la lista vacía.`,
  apunte: `Sos un asistente que lee la foto de un apunte escolar (cuaderno, pizarrón o libro).
1. Transcribí el texto lo más fiel posible, en español, corrigiendo solo errores evidentes de OCR.
2. Hacé un resumen claro de 3 a 6 puntos.
3. Listá los temas principales (para estudiar y armar preguntas).
Si la foto no tiene texto legible, explicá brevemente qué se ve en "texto".`,
  preguntas: `A partir del contenido de la foto, generá preguntas de multiple choice para estudiar.
- Exactamente la cantidad pedida.
- 4 opciones por pregunta, una sola correcta (índice 0 a 3).
- Una explicación breve de por qué es correcta.
- Dificultad adecuada para secundaria. No inventes datos que no estén en la imagen.`,
  explicacion: `Explicá el tema de la foto para una estudiante de secundaria.
- Claro, paso a paso, con un ejemplo cotidiano.
- Máximo 250 palabras.
- Si la foto es un ejercicio, resolvelo explicando el razonamiento.`,
};

const SCHEMAS = {
  horario: {
    type: "object",
    properties: {
      clases: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dia: { type: "integer" },
            inicio: { type: "string" },
            fin: { type: "string" },
            materia: { type: "string" },
            profesor: { type: "string" },
          },
          required: ["dia", "inicio", "fin", "materia"],
        },
      },
    },
    required: ["clases"],
  },
  apunte: {
    type: "object",
    properties: {
      texto: { type: "string" },
      resumen: { type: "string" },
      temas: { type: "array", items: { type: "string" } },
    },
    required: ["texto", "resumen", "temas"],
  },
  preguntas: {
    type: "object",
    properties: {
      preguntas: {
        type: "array",
        items: {
          type: "object",
          properties: {
            enunciado: { type: "string" },
            opciones: { type: "array", items: { type: "string" } },
            correcta: { type: "integer" },
            explicacion: { type: "string" },
          },
          required: ["enunciado", "opciones", "correcta", "explicacion"],
        },
      },
    },
    required: ["preguntas"],
  },
  explicacion: {
    type: "object",
    properties: { explicacion: { type: "string" } },
    required: ["explicacion"],
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function parseJson(text) {
  const clean = String(text || "").replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { texto: clean };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const body = await req.json();
    const image = body.image;
    const mode = body.mode || "apunte";
    const count = Math.min(Math.max(Number(body.count) || 10, 3), 20);

    if (!image || typeof image !== "string") return json({ error: "Falta la imagen" }, 400);
    if (!PROMPTS[mode]) return json({ error: "Modo inválido" }, 400);

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return json({ error: "Falta configurar GEMINI_API_KEY en Supabase" }, 500);

    const match = image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
    const mimeType = match ? match[1] : "image/jpeg";
    const data = match ? match[2] : image;
    if (data.length > 12_000_000) return json({ error: "La imagen es demasiado grande" }, 413);

    const prompt = mode === "preguntas"
      ? `${PROMPTS[mode]}\nGenerá exactamente ${count} preguntas.`
      : PROMPTS[mode];

    const payload = {
      contents: [{
        role: "user",
        parts: [
          { text: prompt },
          { inlineData: { mimeType, data } },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: SCHEMAS[mode],
      },
    };

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify(payload),
      },
    );

    const response = await res.json().catch(() => ({}));
    if (!res.ok) {
      const message = response?.error?.message || `Error de Gemini (${res.status})`;
      const friendly = res.status === 429
        ? "La IA está saturada en este momento. Probá de nuevo en un minuto."
        : message;
      return json({ error: friendly }, 502);
    }

    const text = (response?.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("");
    if (!text) return json({ error: "La IA no devolvió contenido" }, 502);

    const parsed = parseJson(text);
    return json({ ...parsed, mode, model: MODEL }, 200);
  } catch (error) {
    return json({ error: String(error?.message || error) }, 500);
  }
});
