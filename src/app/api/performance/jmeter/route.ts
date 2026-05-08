import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type HttpMethod = string;

type JMeterRequest = {
  name: string;
  url: string;
  method: HttpMethod;
  users: number;
  rampUp: number;
  duration: number;
  instruction: string;
  derivedPlan: DerivedJMeterPlan;
  body?: string;
  headers?: Record<string, string>;
};

type DerivedJMeterPlan = {
  category: string;
  testType: string;
  protocol: string;
  users: number;
  rampUp: number;
  duration: number;
  method: HttpMethod;
  requestAnalysis: RequestAnalysis;
  verificationStatus: "metrics_collected" | "login_not_verified";
  verificationMessage: string;
  assertions: string[];
  validations: string[];
  notes: string[];
};

type RequestAnalysis = {
  targetUrl: string;
  path: string;
  bodyFormat: "none" | "json" | "form" | "raw";
  bodyPreview: string;
  detectedFields: string[];
  headers: Record<string, string>;
};

type JtlRow = {
  elapsed: number;
  success: boolean;
};

const COMMON_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS", "TRACE"];
const BODY_METHODS = ["POST", "PUT", "PATCH", "DELETE"];
const CUSTOM_METHOD_PATTERNS = [
  /\b(?:http\s+method|request\s+method|method)\s+([a-z][a-z0-9_-]{1,20})\b/i,
  /\b(?:use|using|send|run)\s+(?:http\s+method\s+|request\s+method\s+)?([a-z][a-z0-9_-]{1,20})\b/i,
];

function xml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cleanNumber(value: unknown, fallback: number, min: number, max: number) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function cleanHeaders(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .map(([key, headerValue]) => [key.trim(), String(headerValue ?? "").trim()])
      .filter(([key, headerValue]) => key.length > 0 && headerValue.length > 0)
      .slice(0, 20),
  );
}

function mergeHeaders(...values: Record<string, string>[]) {
  return values.reduce<Record<string, string>>((headers, current) => {
    for (const [key, value] of Object.entries(current)) {
      headers[key] = value;
    }
    return headers;
  }, {});
}

function firstNumber(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const value = Number(match[1].replace(/,/g, ""));
      if (Number.isFinite(value)) return value;
    }
  }
  return null;
}

function inferDuration(text: string, fallback: number) {
  const hour = text.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  if (hour?.[1]) return Math.round(Number(hour[1]) * 3600);

  const minute = text.match(/(\d+(?:\.\d+)?)\s*(?:minutes?|mins?|m)\b/i);
  if (minute?.[1]) return Math.round(Number(minute[1]) * 60);

  const second = text.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/i);
  if (second?.[1]) return Math.round(Number(second[1]));

  return fallback;
}

function cleanMethod(value: unknown, fallback = "GET"): HttpMethod {
  const method = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");

  if (!method || method.length > 24) return fallback;
  return method;
}

function maskSensitiveBody(body: string) {
  return body
    .replace(
      /("(?:password|passcode|secret|token|accessToken|refreshToken)"\s*:\s*)"[^"]*"/gi,
      '$1"***"',
    )
    .replace(/((?:password|passcode|secret|token|accessToken|refreshToken)=)[^&\s]*/gi, "$1***");
}

function inferEndpointUrl(baseUrl: string, instruction: string) {
  const fullUrl = instruction.match(/\bhttps?:\/\/[^\s"'<>]+/i)?.[0];
  if (fullUrl) return fullUrl.replace(/[),.;]+$/, "");

  const pathMatch =
    instruction.match(/\b(?:endpoint|path|url|route)\s*(?:is|=|:|to)?\s*(\/[^\s"'<>]+)/i) ??
    instruction.match(/\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|TRACE)\s+(\/[^\s"'<>]+)/i) ??
    instruction.match(/\s(\/api\/[^\s"'<>]+)/i);

  if (!pathMatch?.[1]) return baseUrl;

  const target = new URL(baseUrl);
  return `${target.origin}${pathMatch[1].replace(/[),.;]+$/, "")}`;
}

function tryExtractJsonBody(instruction: string) {
  const start = instruction.indexOf("{");
  const end = instruction.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  const candidate = instruction.slice(start, end + 1);
  try {
    return JSON.stringify(JSON.parse(candidate));
  } catch {
    return null;
  }
}

function valueFromPatterns(instruction: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = instruction.match(pattern);
    if (match?.[1]) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

function inferBodyFields(instruction: string) {
  const fields: Record<string, string> = {};

  const username = valueFromPatterns(instruction, [
    /\b(?:username|user name|user)\s*(?:is|=|:)?\s*["']?([^\s"',;]+)["']?/i,
    /\blogin\s+as\s+["']?([^\s"',;]+)["']?/i,
  ]);
  const email = valueFromPatterns(instruction, [
    /\bemail\s*(?:is|=|:)?\s*["']?([^\s"',;]+@[^\s"',;]+)["']?/i,
  ]);
  const password = valueFromPatterns(instruction, [
    /\b(?:wrong|invalid|correct)?\s*password\s*(?:is|=|:)?\s*["']?([^\s"',;]+)["']?/i,
    /\bpasscode\s*(?:is|=|:)?\s*["']?([^\s"',;]+)["']?/i,
  ]);

  if (username) fields.username = username;
  if (email) fields.email = email;
  if (password) fields.password = password;

  return fields;
}

function inferHeaders(instruction: string) {
  const headers: Record<string, string> = {};
  const bearer = valueFromPatterns(instruction, [
    /\bbearer\s+token\s*(?:is|=|:)?\s*["']?([^\s"',;]+)["']?/i,
    /\btoken\s*(?:is|=|:)?\s*["']?([^\s"',;]+)["']?/i,
  ]);
  const apiKey = valueFromPatterns(instruction, [
    /\bapi\s*key\s*(?:is|=|:)?\s*["']?([^\s"',;]+)["']?/i,
  ]);

  if (bearer) headers.Authorization = `Bearer ${bearer}`;
  if (apiKey) headers["x-api-key"] = apiKey;

  return headers;
}

function inferRequestFromPrompt(raw: Record<string, unknown>, baseUrl: string, method: HttpMethod) {
  const instruction = String(raw.instruction ?? "").trim();
  const explicitBody = String(raw.body ?? "").trim();
  const targetUrl = inferEndpointUrl(baseUrl, instruction);
  const target = new URL(targetUrl);
  let body = explicitBody;
  let bodyFormat: RequestAnalysis["bodyFormat"] = body ? "raw" : "none";
  const detectedFields: string[] = [];
  const inferredHeaders = inferHeaders(instruction);
  const headers = mergeHeaders(cleanHeaders(raw.headers), inferredHeaders);

  const jsonBody = tryExtractJsonBody(instruction);
  if (!body && jsonBody) {
    body = jsonBody;
    bodyFormat = "json";
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    detectedFields.push(...Object.keys(JSON.parse(jsonBody)));
  }

  const fields = inferBodyFields(instruction);
  if (!body && Object.keys(fields).length > 0) {
    body = JSON.stringify(fields);
    bodyFormat = "json";
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
    detectedFields.push(...Object.keys(fields));
  }

  if (body && bodyFormat === "raw" && /^[\w.-]+=[^&]+(?:&[\w.-]+=[^&]+)*$/.test(body)) {
    bodyFormat = "form";
    headers["Content-Type"] = headers["Content-Type"] ?? "application/x-www-form-urlencoded";
  }

  if (body && BODY_METHODS.includes(method)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  return {
    targetUrl,
    body,
    headers,
    analysis: {
      targetUrl,
      path: `${target.pathname || "/"}${target.search}`,
      bodyFormat,
      bodyPreview: body ? maskSensitiveBody(body).slice(0, 500) : "No request body detected",
      detectedFields: [...new Set(detectedFields)],
      headers: Object.fromEntries(
        Object.entries(headers).map(([key, value]) => [
          key,
          /authorization|token|key|secret/i.test(key) ? "***" : value,
        ]),
      ),
    },
  };
}

function inferMethod(text: string, fallback: HttpMethod) {
  const pushMentioned = /\bpush\b/i.test(text);
  if (pushMentioned) {
    return {
      method: "PUT",
      note: "PUSH was requested, but PUSH is not a standard HTTP request method. Using PUT for update-style traffic; HTTP/2 server push needs a dedicated JMeter setup or plugin.",
    };
  }

  const commonMethod = COMMON_METHODS.find((item) => new RegExp(`\\b${item}\\b`, "i").test(text));
  if (commonMethod) return { method: commonMethod };

  const customMethod = CUSTOM_METHOD_PATTERNS.map((pattern) => text.match(pattern)?.[1]).find(
    Boolean,
  );
  if (customMethod) {
    const method = cleanMethod(customMethod, fallback);
    return {
      method,
      note: COMMON_METHODS.includes(method)
        ? undefined
        : `Custom HTTP method inferred: ${method}. JMeter will send it as requested, but the target server must support that method.`,
    };
  }

  return { method: fallback };
}

function inferJMeterPlan(
  raw: Record<string, unknown>,
  fallbackMethod: HttpMethod,
  requestAnalysis: RequestAnalysis,
): DerivedJMeterPlan {
  const instruction = String(raw.instruction ?? "").trim();
  const text = instruction.toLowerCase();

  let testType = "Load Testing";
  let users = 10;
  let rampUp = 10;
  let duration = 60;
  const notes: string[] = [];
  const assertions = ["HTTP status code must be below 500", "Sampler must complete successfully"];
  const validations = ["Response time", "Throughput", "Error rate", "Server stability"];
  const loginRequested = /login|log in|sign in|signin|authentication|auth|password|credential/.test(
    text,
  );

  if (/stress|break|limit|failure point|beyond limit/.test(text)) {
    testType = "Stress Testing";
    users = 500;
    rampUp = 60;
    duration = 180;
    notes.push("Stress profile inferred: higher concurrency to identify failure behavior.");
  } else if (/spike|sudden|instant|traffic increase|burst/.test(text)) {
    testType = "Spike Testing";
    users = 300;
    rampUp = 1;
    duration = 90;
    notes.push("Spike profile inferred: short ramp-up for sudden traffic simulation.");
  } else if (/soak|endurance|hours?|days?|memory leak|long run/.test(text)) {
    testType = "Endurance / Soak Testing";
    users = 100;
    rampUp = 120;
    duration = 900;
    notes.push("Soak profile inferred. Duration is capped for local execution safety.");
  } else if (/scalability|scale|increase users|100 users|500 users|1000 users|5,000/.test(text)) {
    testType = "Scalability Testing";
    users = 200;
    rampUp = 120;
    duration = 300;
    notes.push(
      "Scalability profile inferred as a representative ramp. Multi-stage scaling can be added next.",
    );
  }

  if (/api|rest|soap|graphql|json|xml|endpoint|bearer|jwt|token|header/.test(text)) {
    validations.push("Headers", "Tokens", "API response payload");
  }

  if (loginRequested) {
    validations.push("Login HTTP traffic only");
    assertions.push("Login success assertion required before credentials can be marked valid");
    notes.push(
      "Login mentioned: JMeter completion does not prove credentials are valid. It only measures the configured HTTP request unless a login API request and success assertion are provided.",
    );
  }

  if (/login|search|checkout|admin|portal|csrf|cookie|session/.test(text)) {
    validations.push("Cookies", "Redirects", "Session handling");
    notes.push(
      "Web flow inferred. JMeter simulates HTTP traffic; complex browser behavior may need recorded selectors or a browser tool.",
    );
  }

  if (/database|jdbc|mysql|postgres|oracle|sql server/.test(text)) {
    notes.push(
      "Database testing requested. JDBC execution needs database connection details and is not run by this HTTP-only plan.",
    );
  }
  if (/ftp|smtp|imap|pop3|tcp|ldap|jms|rabbitmq|activemq|websocket|grpc|mqtt/.test(text)) {
    notes.push(
      "A non-HTTP protocol was mentioned. This run prepares an HTTP/API plan; that protocol needs extra JMeter plugins or connection settings.",
    );
  }
  if (/ci\/cd|jenkins|gitlab|github actions|azure devops/.test(text)) {
    notes.push(
      "CI/CD integration requested. Command-line JMeter output is generated and can be wired into a pipeline.",
    );
  }
  if (/ai|anomaly|bottleneck|predict|summary|report/.test(text)) {
    notes.push(
      "AI report behavior requested. The system summarizes JMeter metrics into a concise report.",
    );
  }

  const explicitUsers = firstNumber(instruction, [
    /([\d,]+)\s*(?:users?|vus?|virtual users?)/i,
    /simulate\s*([\d,]+)/i,
  ]);
  if (explicitUsers) users = explicitUsers;
  if (explicitUsers && explicitUsers > 500) {
    notes.push(
      "Requested users exceeded the local safety cap, so this run is capped at 500 users.",
    );
  }

  const explicitRamp = firstNumber(instruction, [
    /ramp(?:-|\s*)up\s*(?:time)?\s*(?:to|of|=|:)?\s*([\d,]+)/i,
    /ramp\s*(?:to|=|:)?\s*([\d,]+)/i,
  ]);
  if (explicitRamp) rampUp = explicitRamp;

  duration = inferDuration(instruction, duration);
  if (duration > 1800) {
    notes.push(
      "Requested duration exceeded the local safety cap, so this run is capped at 30 minutes.",
    );
  }
  const inferredMethod = inferMethod(instruction, fallbackMethod);
  let method = inferredMethod.method;
  if (inferredMethod.note) notes.push(inferredMethod.note);
  if (loginRequested && method === "GET" && requestAnalysis.bodyFormat !== "none") {
    method = "POST";
    notes.push("Login body detected, so POST was selected for the JMeter sampler.");
  }
  if (BODY_METHODS.includes(method)) {
    notes.push(
      requestAnalysis.bodyFormat === "none"
        ? `${method} inferred. Add a request body or parameters when the endpoint requires submitted data.`
        : `${method} inferred with a ${requestAnalysis.bodyFormat} request body from the prompt.`,
    );
  }

  return {
    category: /api|rest|soap|graphql|endpoint/i.test(instruction)
      ? "API Testing"
      : /login|search|checkout|admin|portal|web/i.test(instruction)
        ? "Web Application Testing"
        : "Performance Testing",
    testType,
    protocol: "HTTP/HTTPS",
    users: cleanNumber(users, 10, 1, 500),
    rampUp: cleanNumber(rampUp, 10, 1, 3600),
    duration: cleanNumber(duration, 60, 5, 1800),
    method,
    requestAnalysis,
    verificationStatus: loginRequested ? "login_not_verified" : "metrics_collected",
    verificationMessage: loginRequested
      ? "JMeter collected HTTP performance metrics, but it did not verify whether the login credentials were accepted. Add the real login endpoint, request body, and a success or failure assertion to validate wrong-password behavior."
      : "JMeter completed the request and collected performance metrics.",
    assertions,
    validations: [...new Set(validations)],
    notes,
  };
}

function cleanPayload(body: unknown): JMeterRequest | string {
  if (!body || typeof body !== "object") return "Invalid payload";
  const raw = body as Record<string, unknown>;
  const url = String(raw.url ?? "").trim();

  if (!url) return "Target URL is required";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Target URL must be a valid absolute URL";
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return "Only http and https URLs are supported";
  }

  const method = cleanMethod(raw.method, "GET");
  const initialAnalysis = inferRequestFromPrompt(raw, url, method);
  const derivedPlan = inferJMeterPlan(raw, method, initialAnalysis.analysis);
  const finalAnalysis =
    derivedPlan.method === method
      ? initialAnalysis
      : inferRequestFromPrompt(raw, initialAnalysis.targetUrl, derivedPlan.method);
  derivedPlan.requestAnalysis = finalAnalysis.analysis;

  return {
    name: String(raw.name ?? "SQA Portal JMeter Test")
      .trim()
      .slice(0, 80),
    url: finalAnalysis.targetUrl,
    method: derivedPlan.method,
    users: derivedPlan.users,
    rampUp: derivedPlan.rampUp,
    duration: derivedPlan.duration,
    instruction: String(raw.instruction ?? "").trim(),
    derivedPlan,
    body: finalAnalysis.body,
    headers: finalAnalysis.headers,
  };
}

function buildHeaderManager(headers: Record<string, string>) {
  const entries = Object.entries(headers);
  if (entries.length === 0) return "";

  return `
        <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="Headers" enabled="true">
          <collectionProp name="HeaderManager.headers">
            ${entries
              .map(
                ([name, value]) => `
            <elementProp name="${xml(name)}" elementType="Header">
              <stringProp name="Header.name">${xml(name)}</stringProp>
              <stringProp name="Header.value">${xml(value)}</stringProp>
            </elementProp>`,
              )
              .join("")}
          </collectionProp>
        </HeaderManager>
        <hashTree />`;
}

function buildJmx(request: JMeterRequest) {
  const target = new URL(request.url);
  const pathWithSearch = `${target.pathname || "/"}${target.search}`;
  const body = request.body ?? "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="${xml(request.name)}" enabled="true">
      <stringProp name="TestPlan.comments">${xml(
        `Generated by SQA Test Studio. ${request.derivedPlan.testType}. Instruction: ${request.instruction || "No instruction provided."}`,
      )}</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
        <collectionProp name="Arguments.arguments" />
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="${xml(
        request.derivedPlan.testType,
      )}" enabled="true">
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
        <elementProp name="ThreadGroup.main_controller" elementType="LoopController">
          <boolProp name="LoopController.continue_forever">true</boolProp>
          <intProp name="LoopController.loops">-1</intProp>
        </elementProp>
        <stringProp name="ThreadGroup.num_threads">${request.users}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${request.rampUp}</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.duration">${request.duration}</stringProp>
        <stringProp name="ThreadGroup.delay">0</stringProp>
      </ThreadGroup>
      <hashTree>
        ${buildHeaderManager(request.headers ?? {})}
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="${xml(
          `${request.method} ${target.host}${pathWithSearch}`,
        )}" enabled="true">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
              ${
                body
                  ? `<elementProp name="" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">${xml(body)}</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>`
                  : ""
              }
            </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.domain">${xml(target.hostname)}</stringProp>
          <stringProp name="HTTPSampler.port">${xml(target.port)}</stringProp>
          <stringProp name="HTTPSampler.protocol">${xml(target.protocol.replace(":", ""))}</stringProp>
          <stringProp name="HTTPSampler.path">${xml(pathWithSearch)}</stringProp>
          <stringProp name="HTTPSampler.method">${request.method}</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.auto_redirects">false</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
          <boolProp name="HTTPSampler.DO_MULTIPART_POST">false</boolProp>
          <stringProp name="HTTPSampler.embedded_url_re"></stringProp>
          <stringProp name="HTTPSampler.connect_timeout"></stringProp>
          <stringProp name="HTTPSampler.response_timeout"></stringProp>
        </HTTPSamplerProxy>
        <hashTree />
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>`;
}

async function findJMeterExecutable() {
  const pathEntries = (process.env.PATH ?? "").split(path.delimiter).filter(Boolean);
  const names =
    process.platform === "win32" ? ["jmeter.bat", "jmeter.cmd", "jmeter.exe"] : ["jmeter"];

  for (const entry of pathEntries) {
    for (const name of names) {
      const candidate = path.join(entry, name);
      try {
        await access(candidate, constants.X_OK);
        return candidate;
      } catch {
        // Keep looking through PATH.
      }
    }
  }

  return null;
}

async function runJMeter(planPath: string, resultPath: string) {
  const executable = await findJMeterExecutable().catch(() => null);
  if (!executable) {
    throw new Error("jmeter command was not found on PATH");
  }

  return new Promise<{ code: number | null; stderr: string; stdout: string }>((resolve, reject) => {
    const args = ["-n", "-t", planPath, "-l", resultPath];
    const isWindowsScript = process.platform === "win32" && /\.(bat|cmd)$/i.test(executable);
    const child = spawn(executable, args, {
      shell: isWindowsScript,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr?.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

function jmeterSetupResponse(message: string, planPath: string) {
  return NextResponse.json(
    {
      status: "setup_required",
      message:
        "JMeter is not available on this machine. Install Apache JMeter and make sure the jmeter command is on PATH.",
      detail: message,
      planPath,
    },
    { status: 503 },
  );
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

function percentile(values: number[], percent: number) {
  if (values.length === 0) return 0;
  const index = Math.ceil((percent / 100) * values.length) - 1;
  return values[Math.max(0, Math.min(values.length - 1, index))];
}

function parseJtl(csv: string) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return null;

  const header = parseCsvLine(lines[0]);
  const elapsedIndex = header.indexOf("elapsed");
  const successIndex = header.indexOf("success");
  const timestampIndex = header.indexOf("timeStamp");

  if (elapsedIndex === -1 || successIndex === -1) return null;

  const rows: JtlRow[] = [];
  const timestamps: number[] = [];

  for (const line of lines.slice(1)) {
    const values = parseCsvLine(line);
    const elapsed = Number(values[elapsedIndex]);
    if (!Number.isFinite(elapsed)) continue;
    rows.push({ elapsed, success: values[successIndex] === "true" });

    if (timestampIndex !== -1) {
      const timestamp = Number(values[timestampIndex]);
      if (Number.isFinite(timestamp)) timestamps.push(timestamp);
    }
  }

  if (rows.length === 0) return null;

  const elapsed = rows.map((row) => row.elapsed).sort((a, b) => a - b);
  const failures = rows.filter((row) => !row.success).length;
  const durationMs =
    timestamps.length > 1 ? Math.max(...timestamps) - Math.min(...timestamps) : undefined;

  return {
    samples: rows.length,
    failures,
    errorRate: Number(((failures / rows.length) * 100).toFixed(2)),
    averageMs: Math.round(elapsed.reduce((sum, value) => sum + value, 0) / elapsed.length),
    p90Ms: percentile(elapsed, 90),
    p95Ms: percentile(elapsed, 95),
    p99Ms: percentile(elapsed, 99),
    throughput: durationMs
      ? Number((rows.length / Math.max(1, durationMs / 1000)).toFixed(2))
      : null,
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const payload = cleanPayload(body);

  if (typeof payload === "string") {
    return new Response(payload, { status: 400 });
  }

  const runId = randomUUID();
  const runDir = path.join(tmpdir(), "sqa-portal-jmeter", runId);
  const planPath = path.join(runDir, "test-plan.jmx");
  const resultPath = path.join(runDir, "results.jtl");

  await mkdir(runDir, { recursive: true });
  await writeFile(planPath, buildJmx(payload), "utf8");

  try {
    const result = await runJMeter(planPath, resultPath);
    if (result.code !== 0) {
      return NextResponse.json(
        {
          status: "failed",
          message: "JMeter finished with an error.",
          stderr: result.stderr.trim(),
          stdout: result.stdout.trim(),
          planPath,
        },
        { status: 500 },
      );
    }

    const summary = parseJtl(await readFile(resultPath, "utf8"));
    if (!summary) {
      return NextResponse.json(
        {
          status: "failed",
          message: "JMeter ran, but the results file could not be parsed.",
          planPath,
          resultPath,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      status: "completed",
      runId,
      planPath,
      resultPath,
      request: payload,
      derivedPlan: payload.derivedPlan,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start JMeter";
    return jmeterSetupResponse(message, planPath);
  }
}
