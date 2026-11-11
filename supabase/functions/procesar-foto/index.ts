// Edge Function: procesar-foto
// Recibe una imagen (data URL) o un texto y un modo, llama a Gemini y devuelve JSON.
// La clave GEMINI_API_KEY se configura como secreto en Supabase, nunca en la app.
//
// Modos: "horario" | "apunte" | "preguntas" | "explicacion"
// Formato nuevo de Supabase Edge Functions (export default con fetch).

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.8-flash";

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
  explicacion: `Explicá el tema de la foto para una estudiante de secundaria.
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

async function fetchWithTimeout(url: string, options: RequestInit, ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

const PROJECT_URL = (Deno.env.get("SUPABASE_URL") || "https://ownqsuajfdckytssajiq.supabase.co").replace(/\/$/, "");
const PUBLISHABLE_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")
  || Deno.env.get("SUPABASE_ANON_KEY")
  || "sb_publishable_rMWlFgo6GMlFBLL29qAkNg_nlo3e6Ce";

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
      jwk,
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

async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method === "GET") {
    const url = new URL(req.url);
    if (url.searchParams.get("models")) {
      const key = Deno.env.get("GEMINI_API_KEY");
      if (!key) return json({ error: "Falta configurar GEMINI_API_KEY" }, 500);
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
        headers: { "x-goog-api-key": key },
      });
      const data = await res.json().catch(() => ({}));
      return json(data, res.status);
    }
    return json({ ok: true, model: MODEL }, 200);
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

    if (!image && !inputText) return json({ error: "Falta la imagen o el texto" }, 400);
    if (mode === "horario" && !image) return json({ error: "El horario necesita una foto" }, 400);
    if (!prompt) return json({ error: "Modo inválido" }, 400);

    const key = Deno.env.get("GEMINI_API_KEY");
    if (!key) return json({ error: "Falta configurar GEMINI_API_KEY en Supabase" }, 500);

    const match = image
      ? image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/)
      : null;
    const mimeType = match ? match[1] : "image/jpeg";
    const data = match ? match[2] : image;

    if (data && data.length > 12_000_000) return json({ error: "La imagen es demasiado grande" }, 413);

    const fullPrompt = mode === "preguntas"
      ? `${prompt}\nGenerá exactamente ${count} preguntas.`
      : prompt;

    const parts: Array<Record<string, unknown>> = [{ text: fullPrompt }];
    if (inputText) parts.push({ text: `Contenido para generar las preguntas:\n${inputText.slice(0, 15000)}` });
    if (image) parts.push({ inlineData: { mimeType, data } });

    const payload = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: SCHEMAS[mode],
      },
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
    const delays = [0];
    let res: Response | undefined;
    let response: any = {};
    for (let attempt = 0; attempt < delays.length; attempt += 1) {
      if (delays[attempt]) await new Promise((resolve) => setTimeout(resolve, delays[attempt]));
      try {
        res = await fetchWithTimeout(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(payload),
        }, 60000);
        response = await res.json().catch(() => ({}));
      } catch {
        response = { error: { message: "timeout" } };
        break;
      }
      console.log("gemini", MODEL, res.status);
      if (res.ok) break;
      const message = response?.error?.message || "";
      const overloaded = res.status === 429 || res.status === 503
        || /high demand|overloaded|try again later|temporar/i.test(message);
      if (!overloaded || attempt === delays.length - 1) break;
    }

    if (!res || !res.ok) {
      const message = response?.error?.message || `Error de Gemini (${res ? res.status : "sin respuesta"})`;
      const friendly = /timeout|abort/i.test(message)
        ? "La IA tardó demasiado. Probá de nuevo en un minuto."
        : /high demand|overloaded|try again later|temporar/i.test(message)
          || (res && (res.status === 429 || res.status === 503))
          ? "La IA está con mucha demanda ahora. Probá de nuevo en un minuto."
          : message;
      return json({ error: friendly }, 502);
    }

    const resultText = (response?.candidates?.[0]?.content?.parts || [])
      .map((part: { text?: string }) => part.text || "")
      .join("");
    if (!resultText) return json({ error: "La IA no devolvió contenido" }, 502);

    const parsed = parseJson(resultText);
    return json({ ...parsed, mode, model: MODEL }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message }, 500);
  }
}

export default { fetch: handler };
