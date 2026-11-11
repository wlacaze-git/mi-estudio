// Edge Function: procesar-foto
// Recibe una imagen (data URL) o un texto y un modo, y devuelve JSON.
// Proveedor: OpenAI si existe OPENAI_API_KEY; si no, Gemini.
// Las claves se configuran como secretos en Supabase, nunca en la app.
//
// Modos: "horario" | "apunte" | "preguntas" | "explicacion"

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY") || "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-4.1-mini";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY") || "";
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";
const PROVIDER = OPENAI_KEY ? "openai" : "gemini";
const MODEL = PROVIDER === "openai" ? OPENAI_MODEL : GEMINI_MODEL;

const PROJECT_URL = (Deno.env.get("SUPABASE_URL") || "https://ownqsuajfdckytssajiq.supabase.co").replace(/\/$/, "");
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  || Deno.env.get("SUPABASE_ANON_KEY")
  || "sb_publishable_rMWlFgo6GMlFBLL29qAkNg_nlo3e6Ce";

const PROMPTS: Record<string, string> = {
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
  preguntas: `A partir del contenido (foto o texto), generá preguntas de multiple choice para estudiar.
- Exactamente la cantidad pedida.
- 4 opciones por pregunta, una sola correcta (índice 0 a 3).
- Una explicación breve de por qué es correcta.
- Dificultad adecuada para secundaria. No inventes datos que no estén en el contenido.`,
  explicacion: `Explicá el tema (de la foto o del texto) para una estudiante de secundaria.
- Claro, paso a paso, con un ejemplo cotidiano.
- Máximo 250 palabras.
- Si la foto es un ejercicio, resolvelo explicando el razonamiento.`,
};

const SCHEMAS: Record<string, unknown> = {
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

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

function parseJson(text: string) {
  const clean = String(text || "").replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { texto: clean };
  }
}

async function fetchWithTimeout(url: string, options: RequestInit, ms: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ------------------------- Auth (JWT + JWKS) -------------------------

type Jwk = Record<string, unknown>;
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function getJwks(force = false): Promise<Jwk[]> {
  const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < 10 * 60 * 1000;
  if (!force && fresh) return jwksCache!.keys;
  const res = await fetch(`${PROJECT_URL}/auth/v1/.well-known/jwks.json`, {
    headers: { apikey: PUBLISHABLE_KEY },
  });
  if (!res.ok) {
    if (jwksCache) return jwksCache.keys;
    throw new Error("No se pudo validar la sesión");
  }
  const data = await res.json();
  jwksCache = { keys: Array.isArray(data.keys) ? data.keys : [], fetchedAt: Date.now() };
  return jwksCache.keys;
}

async function verifyJwt(token: string): Promise<boolean> {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const header = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(parts[1])));
    if (header.alg !== "ES256" || !header.kid) return false;
    if (payload.role !== "authenticated") return false;
    if (!payload.exp || Number(payload.exp) * 1000 < Date.now()) return false;
    if (payload.iss && payload.iss !== `${PROJECT_URL}/auth/v1`) return false;

    let keys = await getJwks();
    let jwk = keys.find((key) => key.kid === header.kid);
    if (!jwk) {
      keys = await getJwks(true);
      jwk = keys.find((key) => key.kid === header.kid);
    }
    if (!jwk) return false;

    const key = await crypto.subtle.importKey(
      "jwk",
      jwk as JsonWebKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      base64UrlToBytes(parts[2]),
      new TextEncoder().encode(`${parts[0]}.${parts[1]}`),
    );
  } catch {
    return false;
  }
}

// ------------------------- Proveedores -------------------------

type ProviderResult = { text?: string; error?: string; status?: number };

async function callOpenAI(prompt: string, inputText: string, image: string, schema: unknown): Promise<ProviderResult> {
  const content: Array<Record<string, unknown>> = [{
    type: "text",
    text: `${prompt}\n\nDevolvé SOLO un JSON válido, con esta forma:\n${JSON.stringify(schema)}`,
  }];
  if (inputText) content.push({ type: "text", text: `Contenido:\n${inputText.slice(0, 12000)}` });
  if (image) content.push({ type: "image_url", image_url: { url: image } });

  try {
    const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: "system", content: "Sos un asistente de estudio. Respondés únicamente con JSON válido, en español." },
          { role: "user", content },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
        max_tokens: 3000,
      }),
    }, 60000);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data?.error?.message || `Error de OpenAI (${res.status})`, status: res.status };
    }
    return { text: data?.choices?.[0]?.message?.content || "" };
  } catch {
    return { error: "timeout" };
  }
}

async function callGemini(prompt: string, inputText: string, image: string, schema: unknown): Promise<ProviderResult> {
  const match = image ? image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/) : null;
  const mimeType = match ? match[1] : "image/jpeg";
  const data = match ? match[2] : image;

  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (inputText) parts.push({ text: `Contenido:\n${inputText.slice(0, 12000)}` });
  if (image) parts.push({ inlineData: { mimeType, data } });

  const payload = {
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: schema,
    },
  };

  try {
    const res = await fetchWithTimeout(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": GEMINI_KEY },
        body: JSON.stringify(payload),
      },
      60000,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: data?.error?.message || `Error de Gemini (${res.status})`, status: res.status };
    }
    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((part: { text?: string }) => part.text || "")
      .join("");
    return { text };
  } catch {
    return { error: "timeout" };
  }
}

function friendlyError(status: number | undefined, message: string) {
  if (/timeout|abort/i.test(message)) return "La IA tardó demasiado. Probá de nuevo en un minuto.";
  if (status === 401) return "La clave de OpenAI no es válida o venció.";
  if (status === 429) return "OpenAI está sin cuota o con demasiadas solicitudes.";
  if (status === 404) return "El modelo de OpenAI configurado no existe.";
  if (/high demand|overloaded|try again later|temporar/i.test(message)) {
    return "La IA está con mucha demanda ahora. Probá de nuevo en un minuto.";
  }
  return message || "La IA no respondió.";
}

// ------------------------- Handler -------------------------

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("models")) {
      if (PROVIDER === "openai") {
        if (!OPENAI_KEY) return json({ error: "Falta configurar OPENAI_API_KEY" }, 500);
        const res = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        });
        const data = await res.json().catch(() => ({}));
        const names = Array.isArray(data?.data) ? data.data.map((item: { id?: string }) => item.id) : [];
        return json({ provider: "openai", models: names }, res.status);
      }
      if (!GEMINI_KEY) return json({ error: "Falta configurar GEMINI_API_KEY" }, 500);
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: { "x-goog-api-key": GEMINI_KEY },
      });
      const data = await res.json().catch(() => ({}));
      const names = Array.isArray(data?.models) ? data.models.map((item: { name?: string }) => item.name) : [];
      return json({ provider: "gemini", models: names }, res.status);
    }
    return json({ ok: true, provider: PROVIDER, model: MODEL }, 200);
  }

  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!(await verifyJwt(token))) {
    return json({ error: "Entrá con tu cuenta para usar la IA" }, 401);
  }

  try {
    const body = await req.json();
    const image = typeof body.image === "string" ? body.image : "";
    const inputText = typeof body.text === "string" ? body.text.trim() : "";
    const mode = String(body.mode || "apunte");
    const count = Math.min(Math.max(Number(body.count) || 10, 3), 20);
    const prompt = PROMPTS[mode];
    const schema = SCHEMAS[mode];

    if (!image && !inputText) return json({ error: "Falta la imagen o el texto" }, 400);
    if (mode === "horario" && !image) return json({ error: "El horario necesita una foto" }, 400);
    if (!prompt || !schema) return json({ error: "Modo inválido" }, 400);
    if (!image && !inputText) return json({ error: "Falta contenido" }, 400);

    const fullPrompt = mode === "preguntas"
      ? `${prompt}\nGenerá exactamente ${count} preguntas.`
      : prompt;

    const result = PROVIDER === "openai"
      ? await callOpenAI(fullPrompt, inputText, image, schema)
      : await callGemini(fullPrompt, inputText, image, schema);

    if (result.error) {
      return json({ error: friendlyError(result.status, result.error) }, 502);
    }
    if (!result.text) return json({ error: "La IA no devolvió contenido" }, 502);

    const parsed = parseJson(result.text);
    return json({ ...parsed, mode, provider: PROVIDER, model: MODEL }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
}

export default { fetch: handler };
