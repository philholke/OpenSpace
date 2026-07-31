import Anthropic from "@anthropic-ai/sdk";
import type {
  ContentBlockParam,
  MessageCreateParamsStreaming,
} from "@anthropic-ai/sdk/resources/messages/messages";
import type { Scheme } from "@/features/scheme/types";
import {
  areaCheck,
  normaliseUnit,
  type DigitiseEvent,
  type ReadFindings,
  type TraceFindings,
} from "@/features/ingest/digitise";

/**
 * The digitiser agent. POST a floorplan (PDF or image) as multipart form
 * data; the response streams newline-delimited DigitiseEvent JSON — the four
 * working steps with real details, then the digitised Scheme.
 *
 * Two vision passes on the same drawing: read + establish scale (with honest
 * provenance — printed dimensions beat scale bars beat stated areas beat
 * priors), then trace geometry in real mm. The final check is computed here,
 * not asked of the model: shoelace area against the stated area.
 */

export const maxDuration = 300;

const MODEL = "claude-opus-5";
const MAX_FILE_BYTES = 20 * 1024 * 1024;

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
type ImageType = (typeof IMAGE_TYPES)[number];

const READ_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    drawingType: {
      type: "string",
      description:
        "What kind of drawing this is, briefly — e.g. 'lease plan', 'technical drawing', 'hand sketch'.",
    },
    unitName: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "The unit's name/number as printed on the drawing, or null.",
    },
    address: {
      anyOf: [{ type: "string" }, { type: "null" }],
      description: "Street address if printed.",
    },
    statedAreaM2: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description:
        "Floor area stated on the drawing, converted to m² (convert from sq ft if needed), or null.",
    },
    dimensionStrings: {
      type: "array",
      items: { type: "string" },
      description: "Printed dimension annotations found, verbatim (e.g. '14400', '7.6m').",
    },
    scaleMethod: {
      type: "string",
      description:
        "One sentence on how real-world scale was established (which dimensions/scale bar/area were used).",
    },
    scaleSource: {
      type: "string",
      enum: ["measured", "derived", "inferred"],
      description:
        "measured = printed dimension strings; derived = scale bar or stated area; inferred = object priors (door widths etc).",
    },
    scaleConfidence: { type: "string", enum: ["high", "medium", "low"] },
    readSummary: {
      type: "string",
      description: "One short line describing the drawing (for a progress log).",
    },
  },
  required: [
    "drawingType",
    "unitName",
    "address",
    "statedAreaM2",
    "dimensionStrings",
    "scaleMethod",
    "scaleSource",
    "scaleConfidence",
    "readSummary",
  ],
} as const;

const TRACE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    boundary: {
      type: "array",
      description:
        "The unit's boundary polygon in plan order, real-world millimetres. Major corners only.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: { x: { type: "number" }, y: { type: "number" } },
        required: ["x", "y"],
      },
    },
    openings: {
      type: "array",
      description: "Doors and windows on the boundary walls only.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          x: { type: "number", description: "Centre of the opening, mm." },
          y: { type: "number" },
          width: { type: "number", description: "Clear width along the wall, mm." },
          kind: { type: "string", enum: ["door", "double-door", "window"] },
        },
        required: ["x", "y", "width", "kind"],
      },
    },
    columns: {
      type: "array",
      description: "Free-standing structural columns inside the unit.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          x: { type: "number", description: "Centre, mm." },
          y: { type: "number" },
          size: { type: "number", description: "Square size, mm." },
        },
        required: ["x", "y", "size"],
      },
    },
    ceilingHeightMm: {
      anyOf: [{ type: "number" }, { type: "null" }],
      description: "Ceiling height in mm if stated on the drawing, else null.",
    },
    traceSummary: {
      type: "string",
      description: "One short line on what was traced (for a progress log).",
    },
  },
  required: ["boundary", "openings", "columns", "ceilingHeightMm", "traceSummary"],
} as const;

const SYSTEM = `You are the OpenSpace digitiser: you turn floorplan drawings (landlord PDFs, lease plans, surveys, sketches) into true-to-scale geometry for a space-planning tool.

Coordinate convention: real-world millimetres, x increases to the right (east), y increases downward (south), matching the drawing as viewed. Report positions as they appear on the page.

Be honest about scale. Establish it from, in order of preference: (1) printed dimension strings — cross-check at least two where possible; (2) a scale bar or stated drawing scale; (3) a stated floor area; (4) object priors (single doors ≈ 900 mm). Report which you used, and report lower confidence rather than false precision.`;

function fileBlock(media: string, base64: string): ContentBlockParam {
  if (media === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
    };
  }
  return {
    type: "image",
    source: { type: "base64", media_type: media as ImageType, data: base64 },
  };
}

async function structuredPass<T>(
  client: Anthropic,
  block: ContentBlockParam,
  instruction: string,
  schema: Record<string, unknown>,
): Promise<T> {
  const params: MessageCreateParamsStreaming = {
    model: MODEL,
    max_tokens: 32000,
    stream: true,
    system: SYSTEM,
    output_config: {
      format: { type: "json_schema", schema },
    },
    messages: [
      { role: "user", content: [block, { type: "text", text: instruction }] },
    ],
  };
  const stream = client.messages.stream(params);
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") {
    throw new Error("The model declined to process this drawing.");
  }
  if (message.stop_reason === "max_tokens") {
    throw new Error("The drawing was too complex to trace in one pass.");
  }
  const text = message.content.find((b) => b.type === "text");
  if (!text) throw new Error("The model returned no geometry.");
  return JSON.parse(text.text) as T;
}

export async function POST(request: Request): Promise<Response> {
  const encoder = new TextEncoder();

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "ANTHROPIC_API_KEY is not configured. Add it to app/.env.local and restart the dev server." },
      { status: 500 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json({ error: "No file uploaded." }, { status: 400 });
  }
  const media = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (media !== "application/pdf" && !IMAGE_TYPES.includes(media as ImageType)) {
    return Response.json(
      { error: `Unsupported file type "${file.type || "unknown"}" — upload a PDF, PNG, JPG or WebP.` },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: "File is larger than 20 MB — export a smaller PDF or image." },
      { status: 400 },
    );
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const block = fileBlock(media, base64);
  const client = new Anthropic();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: DigitiseEvent) =>
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        // ── Pass 1: read the drawing, establish scale ────────────────
        emit({ type: "step", id: "read", status: "active" });
        const read = await structuredPass<ReadFindings>(
          client,
          block,
          `Read this drawing and establish its real-world scale. Do not trace geometry yet — identify what the drawing is, any printed unit name/address/area, the dimension annotations present, and how scale should be established for it.`,
          READ_SCHEMA,
        );
        emit({ type: "step", id: "read", status: "done", detail: read.readSummary });
        emit({
          type: "step",
          id: "scale",
          status: "done",
          detail: `${read.scaleMethod} — ${read.scaleSource}, ${read.scaleConfidence} confidence`,
        });

        // ── Pass 2: trace the geometry in mm ─────────────────────────
        emit({ type: "step", id: "trace", status: "active" });
        const trace = await structuredPass<TraceFindings>(
          client,
          block,
          `Now trace this unit's geometry in real-world millimetres, using the scale you established: ${read.scaleMethod} (${read.scaleSource}, ${read.scaleConfidence} confidence).${
            read.dimensionStrings.length
              ? ` Dimension annotations on the drawing: ${read.dimensionStrings.join(", ")}.`
              : ""
          }${read.statedAreaM2 ? ` The stated floor area is ~${read.statedAreaM2} m² — your traced boundary should enclose roughly this area.` : ""}

Trace:
- boundary: the internal face of the unit's perimeter walls (the leasable interior), major corners only (aim for 4–12 vertices), orthogonal corners where the drawing is orthogonal. Ignore internal partitions and furniture.
- openings: every door and window that sits ON a perimeter wall, as centre point + clear width. Skip internal doors.
- columns: free-standing structural columns inside the unit only.

This is a planning instrument, not a construction document — roughly right beats falsely precise, but keep proportions faithful to the drawing.`,
          TRACE_SCHEMA,
        );
        emit({
          type: "step",
          id: "trace",
          status: "done",
          detail: `${trace.boundary.length} corners · ${trace.columns.length} column${trace.columns.length === 1 ? "" : "s"} · ${trace.openings.length} opening${trace.openings.length === 1 ? "" : "s"}`,
        });

        // ── Check: computed here, not asked of the model ─────────────
        emit({ type: "step", id: "check", status: "active" });
        const fallbackName = file.name.replace(/\.[^.]+$/, "") || "Uploaded unit";
        const { unit, areaM2 } = normaliseUnit(read, trace, fallbackName);
        const check = areaCheck(areaM2, read.statedAreaM2);
        if (!check.withinTolerance && unit.scale.confidence === "high") {
          unit.scale = { ...unit.scale, confidence: "medium" };
        }
        emit({ type: "step", id: "check", status: "done", detail: check.detail });

        const scheme: Scheme = {
          name: `${unit.name} — Scheme A`,
          currency: "S$",
          unit,
          rooms: [],
          items: [],
          references: [],
        };
        emit({ type: "result", scheme });
      } catch (err) {
        const message =
          err instanceof Anthropic.AuthenticationError
            ? "The Anthropic API key was rejected — check ANTHROPIC_API_KEY in app/.env.local."
            : err instanceof Anthropic.RateLimitError
              ? "Rate limited by the Anthropic API — wait a moment and try again."
              : err instanceof Error
                ? err.message
                : "The digitiser failed unexpectedly.";
        emit({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
