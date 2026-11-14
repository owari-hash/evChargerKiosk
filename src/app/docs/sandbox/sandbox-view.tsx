'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import {
  INITIAL_SIM_STATE,
  executeSimApi,
  type SimState,
  type SimActiveSession,
} from './sandbox-engine';

interface PresetCall {
  label: string;
  method: 'GET' | 'POST';
  path: string;
  needsAuth: boolean;
  body?: any;
  hint: string;
}

const PRESETS: PresetCall[] = [
  {
    label: '1. Login (Нэвтрэх)',
    method: 'POST',
    path: '/api/partner/auth/login',
    needsAuth: false,
    body: {
      username: 'partner_test',
      password: 'test1234',
    },
    hint: 'Нэвтрэх нэр, нууц үгээр 2 цагийн хугацаатай access token үүсгэж авна.',
  },
  {
    label: '2. Profile (Миний эрх)',
    method: 'GET',
    path: '/api/partner/me',
    needsAuth: true,
    hint: 'Одоогийн токеноор мерчантын нэр, зөвшөөрөгдсөн станц болон scope эрхийг харна.',
  },
  {
    label: '3. Stations (Станцууд)',
    method: 'GET',
    path: '/api/partner/stations',
    needsAuth: true,
    hint: 'Зөвшөөрөгдсөн цэнэглэгч станцуудын онлайн төлөв, холбогч буунуудын бэлэн байдлыг авна.',
  },
  {
    label: '4. Start Session (Цэнэглэлт эхлүүлэх)',
    method: 'POST',
    path: '/api/partner/sessions/start',
    needsAuth: true,
    body: {
      cpId: 'CP-SIM-01',
      connectorId: 1,
      idTag: 'TEST-RFID-01',
    },
    hint: 'CP-SIM-01 станцын 1-р буун дээр цэнэглэлт алсаас эхлүүлнэ.',
  },
  {
    label: '5. Active Sessions (Идэвхтэй сесс)',
    method: 'GET',
    path: '/api/partner/sessions/active',
    needsAuth: true,
    hint: 'Одоо яг явагдаж буй цэнэглэлтүүдийн кВтц зарцуулалт болон өнгөрсөн хугацааг харна.',
  },
  {
    label: '6. Stop Session (Цэнэглэлт зогсоох)',
    method: 'POST',
    path: '/api/partner/sessions/stop',
    needsAuth: true,
    body: {
      transactionId: 9101,
    },
    hint: 'Явагдаж буй цэнэглэлтийн сессийг зогсоож тоолуурыг хаана.',
  },
  {
    label: '7. Session Detail (Сессийн тайлан)',
    method: 'GET',
    path: '/api/partner/sessions/9101',
    needsAuth: true,
    hint: 'Тухайн цэнэглэлтийн нийт цэнэглэсэн кВтц, зарцуулсан минут болон зогссон шалтгааныг авна.',
  },
];

export function SandboxView() {
  const [state, setState] = useState<SimState>(INITIAL_SIM_STATE);
  const [method, setMethod] = useState<'GET' | 'POST' | 'DELETE'>('POST');
  const [path, setPath] = useState('/api/partner/auth/login');
  const [useAuth, setUseAuth] = useState(false);
  const [requestBodyText, setRequestBodyText] = useState(
    JSON.stringify(PRESETS[0].body, null, 2),
  );
  const [lastResponse, setLastResponse] = useState<{
    status: number;
    durationMs: number;
    data: any;
  }>({
    status: 200,
    durationMs: 42,
    data: {
      message: 'Sandbox бэлэн байна. Зүүн талын эсвэл доорх командуудыг сонгоод хүсэлт илгээнэ үү.',
      safetyNotice: 'Энэ симулятор нь өгөгдлийн санд ямар ч бичилт хийхгүй, зөвхөн санах ойд түр ажиллана.',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [copiedRes, setCopiedRes] = useState(false);
  const [presetIndex, setPresetIndex] = useState(0);

  // Background ticker for live charging animation
  useEffect(() => {
    const timer = setInterval(() => {
      setState((prev) => {
        if (prev.activeSessions.length === 0) return prev;
        const updatedSessions = prev.activeSessions.map((s) => {
          const addedSec = 1;
          const kwhIncrement = (s.powerKw / 3600) * addedSec;
          const nextKwh = s.currentKwh + kwhIncrement;
          const nextSoc = Math.min(98, s.batterySoc + (nextKwh > 5 ? 1 : 0));
          return {
            ...s,
            elapsedSeconds: s.elapsedSeconds + addedSec,
            currentKwh: nextKwh,
            batterySoc: nextSoc,
            lastMeterUpdate: new Date().toISOString(),
          };
        });
        return {
          ...prev,
          activeSessions: updatedSessions,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function applyPreset(p: PresetCall, idx: number) {
    setPresetIndex(idx);
    setMethod(p.method);
    setPath(p.path);
    setUseAuth(p.needsAuth);
    if (p.body) {
      // If stopping session and an active session exists, prefill its transaction ID!
      if (p.path.includes('sessions/stop') && state.activeSessions.length > 0) {
        setRequestBodyText(
          JSON.stringify({ transactionId: state.activeSessions[0].transactionId }, null, 2),
        );
      } else {
        setRequestBodyText(JSON.stringify(p.body, null, 2));
      }
    } else {
      setRequestBodyText('');
    }

    // Dynamic path for session detail
    if (p.path.includes('sessions/9101') && state.activeSessions.length > 0) {
      setPath(`/api/partner/sessions/${state.activeSessions[0].transactionId}`);
    } else if (p.path.includes('sessions/9101') && state.completedSessions.length > 0) {
      setPath(`/api/partner/sessions/${state.completedSessions[0].transactionId}`);
    }
  }

  async function handleSend() {
    setIsLoading(true);

    let parsedBody: any = undefined;
    if (method === 'POST' && requestBodyText.trim()) {
      try {
        parsedBody = JSON.parse(requestBodyText);
      } catch {
        setIsLoading(false);
        setLastResponse({
          status: 400,
          durationMs: 5,
          data: { error: 'Request body JSON бүтэц алдаатай байна' },
        });
        return;
      }
    }

    // Simulated short network delay (40-90ms)
    await new Promise((r) => setTimeout(r, Math.floor(Math.random() * 50) + 40));

    const authHeader = useAuth ? `Bearer ${state.token || 'invalid_token'}` : undefined;

    const result = executeSimApi(state, {
      method,
      path,
      authHeader,
      body: parsedBody,
    });

    setState(result.nextState);
    setLastResponse({
      status: result.status,
      durationMs: result.event.durationMs,
      data: result.data,
    });
    setIsLoading(false);
  }

  function handleReset() {
    setState(INITIAL_SIM_STATE);
    setLastResponse({
      status: 200,
      durationMs: 12,
      data: { message: 'Симуляторын бүх төлөв анхны хэвэндээ орлоо.' },
    });
  }

  async function handleCopyResponse() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(lastResponse.data, null, 2));
      setCopiedRes(true);
      setTimeout(() => setCopiedRes(false), 2000);
    } catch {
      // ignore
    }
  }

  const primaryStation = state.stations[0];
  const activeSessionOnPlug1 = state.activeSessions.find(
    (s) => s.cpId === primaryStation.cpId && s.connectorId === 1,
  );

  return (
    <div id="docs-root" className="min-h-screen bg-background text-foreground font-sans flex flex-col">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER: Back to Docs, Status & Reset                           */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-13 max-w-[1700px] items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-3 overflow-hidden">
            <Link
              href="/docs"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground shadow-xs hover:bg-surface-muted hover:border-brand/40 transition active:scale-95"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m7 7-7-7 7-7" />
              </svg>
              <span>Docs руу буцах</span>
            </Link>

            <span className="h-4 w-px bg-border hidden sm:inline" />

            <div className="flex items-center gap-2">
              <Image
                src="/eplug-mark.png"
                alt="Eplug"
                width={24}
                height={24}
                className="size-6 rounded-md shadow-xs shrink-0"
              />
              <span className="font-bold text-sm text-foreground tracking-tight">
                Partner API Sandbox
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Safe In-Memory Badge */}
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>In-Memory (DB бичилтгүй аюулгүй горим)</span>
            </span>

            {/* Reset simulator */}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-surface hover:bg-surface-muted text-foreground transition active:scale-95 shadow-xs"
              title="Симуляторын бүх станц, сессийг эхний төлөв рүү буцаах"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5 text-muted">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M8 16H3v5" />
              </svg>
              <span>Сэргээх (Reset)</span>
            </button>
          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* 2. MAIN 2-PANE WORKSPACE                                              */}
      {/* ===================================================================== */}
      <div className="flex-1 max-w-[1700px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
        {/* =================================================================== */}
        {/* LEFT PANE: INTERACTIVE API CLIENT (col-span-7)                      */}
        {/* =================================================================== */}
        <section className="lg:col-span-7 border-r border-border p-4 sm:p-6 flex flex-col space-y-5 bg-background">
          {/* Quick preset selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">
                Шуурхай турших командууд (Quick Presets)
              </span>
              <span className="text-[11px] text-muted font-mono">1-товшилтоор бөглөнө</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p, idx) => (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p, idx)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition text-left ${
                    presetIndex === idx
                      ? 'bg-brand text-white border-brand shadow-xs'
                      : 'bg-surface hover:bg-surface-muted text-foreground border-border'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted leading-relaxed">
              {PRESETS[presetIndex].hint}
            </p>
          </div>

          {/* Request Builder Card */}
          <div className="rounded-xl border border-border bg-surface p-4 space-y-3.5 shadow-xs">
            {/* Method + URL Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex items-center rounded-lg border border-border bg-surface-muted overflow-hidden">
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  className="bg-transparent px-3 py-2 text-xs font-mono font-bold text-foreground outline-none cursor-pointer"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="DELETE">DELETE</option>
                </select>
              </div>

              <div className="flex-1 flex items-center rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand">
                <span className="text-muted shrink-0 mr-1">https://eplug.mn</span>
                <input
                  type="text"
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  placeholder="/api/partner/..."
                  className="w-full bg-transparent outline-none text-foreground font-semibold"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={isLoading}
                className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-strong transition active:scale-95 disabled:opacity-50"
              >
                {isLoading ? (
                  <span className="inline-block size-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-3.5">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
                <span>Илгээх (Send)</span>
              </button>
            </div>

            {/* Auth Header Toggle */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={useAuth}
                  onChange={(e) => setUseAuth(e.target.checked)}
                  className="size-3.5 rounded text-brand focus:ring-brand cursor-pointer"
                />
                <span className="font-semibold text-foreground">Authorization Bearer Token хавсаргах</span>
              </label>

              <span className="font-mono text-[11px] text-muted truncate max-w-xs">
                {state.token ? 'Токен: Идэвхтэй' : 'Токен: Байхгүй (401 буцна)'}
              </span>
            </div>

            {/* Request Body (For POST) */}
            {method === 'POST' && (
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between text-xs text-muted">
                  <span className="font-semibold">Request Body (JSON)</span>
                  <span className="font-mono text-[11px]">application/json</span>
                </div>
                <textarea
                  rows={4}
                  value={requestBodyText}
                  onChange={(e) => setRequestBodyText(e.target.value)}
                  className="w-full rounded-lg border border-border bg-[#0a0f1d] p-3 font-mono text-xs text-emerald-300 outline-none focus:border-brand focus:ring-1 focus:ring-brand resize-y"
                  placeholder='{\n  "key": "value"\n}'
                />
              </div>
            )}
          </div>

          {/* Response Viewer */}
          <div className="flex-1 flex flex-col rounded-xl border border-border bg-[#090e18] overflow-hidden shadow-lg min-h-[260px]">
            {/* Response status bar */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2.5 bg-slate-900/80">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Response
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                    lastResponse.status === 200
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : lastResponse.status === 400
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {lastResponse.status} {lastResponse.status === 200 ? 'OK' : 'Error'}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {lastResponse.durationMs}ms
                </span>
              </div>

              <button
                onClick={handleCopyResponse}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono transition"
                title="JSON хуулах"
              >
                {copiedRes ? (
                  <span className="text-emerald-400 font-bold">Хуулагдлаа!</span>
                ) : (
                  <>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3">
                      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                    </svg>
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
            </div>

            {/* Response JSON preview */}
            <div className="flex-1 p-4 overflow-auto">
              <pre className="font-mono text-xs sm:text-[13px] leading-relaxed text-slate-200">
                <code>{JSON.stringify(lastResponse.data, null, 2)}</code>
              </pre>
            </div>
          </div>
        </section>

        {/* =================================================================== */}
        {/* RIGHT PANE: VISUAL STATION SIMULATOR (col-span-5)                   */}
        {/* =================================================================== */}
        <section className="lg:col-span-5 p-4 sm:p-6 bg-surface-muted/30 flex flex-col space-y-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-brand">
              Бодит цагийн симулятор (Live Station Visualizer)
            </span>
            <h2 className="mt-1 text-xl font-bold tracking-tight text-foreground">
              {primaryStation.name}
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Код: <span className="font-mono font-bold text-foreground">{primaryStation.cpId}</span> • загвар: {primaryStation.model} • OCPP холболт: <span className="text-emerald-600 font-semibold">Online</span>
            </p>
          </div>

          {/* Visual Chargers Cards */}
          <div className="space-y-4">
            {/* PLUG 1 (GBT DC) */}
            <div
              className={`rounded-2xl border p-5 transition-all shadow-sm ${
                activeSessionOnPlug1
                  ? 'border-brand/50 bg-brand/5 shadow-brand/10'
                  : 'border-border bg-surface'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`flex size-9 items-center justify-center rounded-xl ${
                      activeSessionOnPlug1
                        ? 'bg-brand text-white shadow-md shadow-brand/40 animate-pulse'
                        : 'bg-emerald-500/10 text-emerald-600'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Холбогч 1: GBT DC (120 kW)
                    </h3>
                    <p className="text-[11px] text-muted">
                      {activeSessionOnPlug1 ? 'Цэнэглэлт явагдаж байна' : 'Бэлэн (Машин холбогдсон)'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold ${
                    activeSessionOnPlug1
                      ? 'bg-brand text-white shadow-xs'
                      : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30'
                  }`}
                >
                  {activeSessionOnPlug1 ? 'CHARGING' : 'AVAILABLE'}
                </span>
              </div>

              {/* Live Charging Telemetry Gauges */}
              {activeSessionOnPlug1 ? (
                <div className="mt-4 pt-4 border-t border-border space-y-4">
                  {/* Battery SoC & Charging animation */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-muted">Машины батерей (SoC):</span>
                      <span className="text-brand font-mono font-bold">
                        {activeSessionOnPlug1.batterySoc}%
                      </span>
                    </div>
                    <div className="h-3 rounded-full bg-surface-muted overflow-hidden border border-border p-0.5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-brand transition-all duration-500"
                        style={{ width: `${activeSessionOnPlug1.batterySoc}%` }}
                      />
                    </div>
                  </div>

                  {/* 4 Telemetry Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div className="rounded-lg bg-surface border border-border p-2">
                      <div className="text-[10px] text-muted font-medium">Чадал</div>
                      <div className="text-xs font-mono font-bold text-foreground">
                        {activeSessionOnPlug1.powerKw} kW
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface border border-border p-2">
                      <div className="text-[10px] text-muted font-medium">Эрчим хүч</div>
                      <div className="text-xs font-mono font-bold text-brand">
                        {activeSessionOnPlug1.currentKwh.toFixed(2)} kWh
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface border border-border p-2">
                      <div className="text-[10px] text-muted font-medium">Хугацаа</div>
                      <div className="text-xs font-mono font-bold text-foreground">
                        {Math.floor(activeSessionOnPlug1.elapsedSeconds / 60)}:
                        {(activeSessionOnPlug1.elapsedSeconds % 60).toString().padStart(2, '0')}
                      </div>
                    </div>
                    <div className="rounded-lg bg-surface border border-border p-2">
                      <div className="text-[10px] text-muted font-medium">Сесс дугаар</div>
                      <div className="text-xs font-mono font-bold text-foreground">
                        #{activeSessionOnPlug1.transactionId}
                      </div>
                    </div>
                  </div>

                  {/* Stop shortcut */}
                  <button
                    onClick={() => {
                      applyPreset(PRESETS[5], 5);
                      // Auto-fill body
                      setRequestBodyText(
                        JSON.stringify({ transactionId: activeSessionOnPlug1.transactionId }, null, 2),
                      );
                    }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 py-2 text-xs font-bold transition active:scale-98"
                  >
                    <span>🛑 Энэ сессийг зогсоох API дуудах (/sessions/stop)</span>
                  </button>
                </div>
              ) : (
                <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted">
                    Машин холбогдсон бэлэн төлөвтэй байна.
                  </span>
                  <button
                    onClick={() => {
                      applyPreset(PRESETS[3], 3);
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand/20 text-brand border border-brand/30 text-xs font-bold transition active:scale-95"
                  >
                    <span>⚡ Цэнэглэлт эхлүүлэх API</span>
                  </button>
                </div>
              )}
            </div>

            {/* PLUG 2 (CCS2 DC) */}
            <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex size-9 items-center justify-center rounded-xl bg-surface-muted text-muted">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-foreground">
                      Холбогч 2: CCS2 DC (120 kW)
                    </h3>
                    <p className="text-[11px] text-muted">Бэлэн (Машин холбогдоогүй)</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-surface-muted text-muted">
                  AVAILABLE
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Simulated API Activity Log / Ticker */}
          <div className="rounded-2xl border border-border bg-[#0b1120] text-slate-200 p-4 space-y-2.5 shadow-md flex-1 min-h-[220px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                API Дуудалтын бодит цагийн лог (Live Ticker)
              </span>
              <span className="text-[10px] font-mono text-emerald-400">
                ● Түр санах ойд (No DB)
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] max-h-52 overflow-y-auto">
              {state.events.length === 0 ? (
                <div className="py-6 text-center text-slate-500 font-sans text-xs">
                  Одоогоор ямар ч API дуудагдаагүй байна. Зүүн талын "Илгээх" товчийг дарж шалгана уу.
                </div>
              ) : (
                state.events.map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-start justify-between gap-2 p-1.5 rounded bg-slate-900/60 border border-slate-800/80"
                  >
                    <div className="flex items-baseline gap-2 truncate">
                      <span className="text-slate-500 text-[10px]">{ev.timestamp}</span>
                      <span
                        className={`font-bold ${
                          ev.method === 'POST' ? 'text-emerald-400' : 'text-sky-400'
                        }`}
                      >
                        {ev.method}
                      </span>
                      <span className="text-slate-300 truncate">{ev.path}</span>
                    </div>

                    <div className="shrink-0 flex items-center gap-1.5">
                      <span
                        className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                          ev.status === 200
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}
                      >
                        {ev.status}
                      </span>
                      <span className="text-slate-500 text-[10px]">{ev.durationMs}ms</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

