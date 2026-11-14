/**
 * Eplug Partner API Client-Side Sandbox & Simulator Engine
 *
 * IMPORTANT: This simulator runs entirely in memory on the client side.
 * It NEVER writes or reads from the real database or triggers real OCPP commands.
 * All data is static/ephemeral for developer testing.
 */

export interface SimConnector {
  connectorId: number;
  connectorType: string;
  status: 'Available' | 'Preparing' | 'Charging' | 'SuspendedEV' | 'Finishing' | 'Faulted';
  maxKw: number;
}

export interface SimStation {
  cpId: string;
  name: string;
  location: string;
  address: string;
  isOnline: boolean;
  vendor: string;
  model: string;
  connectors: SimConnector[];
}

export interface SimActiveSession {
  transactionId: number;
  cpId: string;
  stationName: string;
  connectorId: number;
  idTag: string;
  startTimestamp: string;
  elapsedSeconds: number;
  currentKwh: number;
  powerKw: number;
  voltageV: number;
  currentA: number;
  batterySoc: number; // 0-100%
  lastMeterUpdate: string;
}

export interface SimCompletedSession {
  transactionId: number;
  cpId: string;
  stationName: string;
  connectorId: number;
  idTag: string;
  startTimestamp: string;
  stopTimestamp: string;
  energyKwh: number;
  durationMin: number;
  stopReason: string;
}

export interface SimApiEvent {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  summary: string;
}

export interface SimState {
  token: string | null;
  refreshToken: string | null;
  merchant: {
    id: string;
    name: string;
    code: string;
    username: string;
    allowedStations: string[];
    allowedScopes: string[];
    isActive: boolean;
  };
  stations: SimStation[];
  activeSessions: SimActiveSession[];
  completedSessions: SimCompletedSession[];
  events: SimApiEvent[];
}

export const INITIAL_SIM_STATE: SimState = {
  token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sandbox_demo_token_valid',
  refreshToken: 'sb-refresh-8849-mock-uuid',
  merchant: {
    id: '6736342898fbb934821a',
    name: 'Түнш Тест Мерчант ХХК',
    code: 'sandbox-partner',
    username: 'partner_test',
    allowedStations: ['CP-SIM-01', 'CP-SIM-02'],
    allowedScopes: ['stations:read', 'stations:write', 'sessions:read', 'sessions:write'],
    isActive: true,
  },
  stations: [
    {
      cpId: 'CP-SIM-01',
      name: 'Eplug Titan 120kW Fast Charger (Талбай)',
      location: 'Сүхбаатар дүүрэг',
      address: 'Сүхбаатарын талбай 1, Төв талбай',
      isOnline: true,
      vendor: 'StarCharge',
      model: 'Titan DC 120kW',
      connectors: [
        {
          connectorId: 1,
          connectorType: 'GBT_DC',
          status: 'Available',
          maxKw: 120,
        },
        {
          connectorId: 2,
          connectorType: 'CCS2',
          status: 'Available',
          maxKw: 120,
        },
      ],
    },
    {
      cpId: 'CP-SIM-02',
      name: 'Eplug Ultra 160kW Charger (Зайсан)',
      location: 'Хан-Уул дүүрэг',
      address: 'Зайсан хилл цогцолбор B1',
      isOnline: true,
      vendor: 'Sinexcel',
      model: 'Fast 160kW',
      connectors: [
        {
          connectorId: 1,
          connectorType: 'CCS2',
          status: 'Available',
          maxKw: 160,
        },
      ],
    },
  ],
  activeSessions: [],
  completedSessions: [],
  events: [],
};

let nextTxId = 9101;

/**
 * Executes a simulated REST API call completely in-memory.
 */
export function executeSimApi(
  state: SimState,
  request: {
    method: 'GET' | 'POST' | 'DELETE';
    path: string;
    authHeader?: string;
    body?: any;
  },
): {
  status: number;
  data: any;
  nextState: SimState;
  event: SimApiEvent;
} {
  const normalizedPath = request.path.trim().split('?')[0];
  const queryStr = request.path.includes('?') ? request.path.split('?')[1] : '';
  const queryParams = new URLSearchParams(queryStr);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('mn-MN', { hour12: false });

  // Clone state for pure update
  const next: SimState = JSON.parse(JSON.stringify(state));

  const authPassed = Boolean(
    request.authHeader?.includes('Bearer') &&
      request.authHeader.split('Bearer ')[1]?.trim().length > 10,
  );

  let status = 200;
  let data: any = {};
  let summary = '';

  // 1. POST /api/partner/auth/login
  if (request.method === 'POST' && normalizedPath.endsWith('/auth/login')) {
    const { username, password } = request.body || {};
    if (!username || !password) {
      status = 400;
      data = { error: 'Хэрэглэгчийн нэр, нууц үг оруулна уу' };
      summary = 'Login Failed: Missing credentials';
    } else {
      next.token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sandbox_token_${Date.now()}`;
      next.refreshToken = `sb-refresh-${Math.random().toString(36).substring(2, 9)}`;
      status = 200;
      data = {
        accessToken: next.token,
        refreshToken: next.refreshToken,
        tokenType: 'Bearer',
        expiresIn: 7200,
        merchant: {
          id: next.merchant.id,
          name: next.merchant.name,
          code: next.merchant.code,
          username: username,
          allowedStations: next.merchant.allowedStations,
          allowedScopes: next.merchant.allowedScopes,
        },
      };
      summary = `Login Success: Issued token for "${username}"`;
    }
  }

  // 2. POST /api/partner/auth/refresh
  else if (request.method === 'POST' && normalizedPath.endsWith('/auth/refresh')) {
    const { refreshToken } = request.body || {};
    if (!refreshToken) {
      status = 400;
      data = { error: 'refreshToken заавал шаардлагатай' };
      summary = 'Token Refresh Failed: missing refreshToken';
    } else {
      next.token = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sandbox_token_rotated_${Date.now()}`;
      next.refreshToken = `sb-refresh-${Math.random().toString(36).substring(2, 9)}`;
      status = 200;
      data = {
        accessToken: next.token,
        refreshToken: next.refreshToken,
        tokenType: 'Bearer',
        expiresIn: 7200,
      };
      summary = 'Token Rotated successfully';
    }
  }

  // 3. POST /api/partner/auth/revoke
  else if (request.method === 'POST' && normalizedPath.endsWith('/auth/revoke')) {
    next.token = null;
    next.refreshToken = null;
    status = 200;
    data = { message: 'Токен амжилттай хүчингүй боллоо' };
    summary = 'Token Revoked';
  }

  // 4. GET /api/partner/me
  else if (request.method === 'GET' && normalizedPath.endsWith('/me')) {
    if (!authPassed) {
      status = 401;
      data = { error: 'Токен хүчингүй байна эсвэл Authorization толгой дутуу' };
      summary = 'Auth error (401 Unauthorized)';
    } else {
      status = 200;
      data = {
        ...next.merchant,
        ipWhitelist: ['203.0.113.10'],
        telemetry: {
          totalRequests: next.events.length + 1,
          lastActiveAt: now.toISOString(),
        },
      };
      summary = `Profile retrieved for ${next.merchant.name}`;
    }
  }

  // 5. GET /api/partner/stations (List)
  else if (request.method === 'GET' && normalizedPath.endsWith('/stations')) {
    if (!authPassed) {
      status = 401;
      data = { error: 'Токен хүчингүй байна' };
      summary = 'Auth error (401 Unauthorized)';
    } else {
      const filterStatus = queryParams.get('status');
      let resList = next.stations;
      if (filterStatus === 'online') {
        resList = resList.filter((s) => s.isOnline);
      } else if (filterStatus === 'offline') {
        resList = resList.filter((s) => !s.isOnline);
      }
      status = 200;
      data = resList;
      summary = `Stations list: ${resList.length} chargers returned`;
    }
  }

  // 6. GET /api/partner/stations/:cpId (Single)
  else if (request.method === 'GET' && normalizedPath.includes('/stations/')) {
    if (!authPassed) {
      status = 401;
      data = { error: 'Токен хүчингүй байна' };
      summary = 'Auth error (401 Unauthorized)';
    } else {
      const parts = normalizedPath.split('/stations/');
      const cpId = parts[1]?.trim();
      const station = next.stations.find(
        (s) => s.cpId.toLowerCase() === cpId?.toLowerCase(),
      );
      if (!station) {
        status = 404;
        data = { error: `Станц олдсонгүй: ${cpId}` };
        summary = `Station not found: ${cpId}`;
      } else {
        status = 200;
        data = station;
        summary = `Station details: ${station.name}`;
      }
    }
  }

  // 7. POST /api/partner/sessions/start
  else if (request.method === 'POST' && normalizedPath.endsWith('/sessions/start')) {
    if (!authPassed) {
      status = 401;
      data = { error: 'Токен хүчингүй байна' };
      summary = 'Auth error (401 Unauthorized)';
    } else {
      const { cpId, connectorId, idTag } = request.body || {};
      const targetStation = next.stations.find(
        (s) => s.cpId.toLowerCase() === cpId?.toLowerCase(),
      );

      if (!targetStation) {
        status = 404;
        data = { error: `Станц олдсонгүй: ${cpId}` };
        summary = `Start failed: station ${cpId} not found`;
      } else {
        const conn = targetStation.connectors.find((c) => c.connectorId === Number(connectorId));
        if (!conn) {
          status = 400;
          data = { error: `Холбогч буу #${connectorId} олдсонгүй` };
          summary = `Start failed: connector ${connectorId} not found`;
        } else if (conn.status === 'Charging') {
          status = 400;
          data = { error: `Буу #${connectorId} дээр цэнэглэлт явагдаж байна` };
          summary = `Start failed: connector ${connectorId} already charging`;
        } else {
          // Transition connector status to Charging!
          conn.status = 'Charging';
          const newTxId = nextTxId++;
          const usedTag = idTag || `SIM-TAG-${next.merchant.code}`;

          const newSession: SimActiveSession = {
            transactionId: newTxId,
            cpId: targetStation.cpId,
            stationName: targetStation.name,
            connectorId: conn.connectorId,
            idTag: usedTag,
            startTimestamp: now.toISOString(),
            elapsedSeconds: 1,
            currentKwh: 0.12,
            powerKw: Math.min(120, conn.maxKw * 0.96),
            voltageV: 420.5,
            currentA: Math.round(((conn.maxKw * 0.96 * 1000) / 420.5) * 10) / 10,
            batterySoc: 32,
            lastMeterUpdate: now.toISOString(),
          };

          next.activeSessions.push(newSession);

          status = 200;
          data = {
            status: 'Accepted',
            transactionId: newTxId,
            cpId: targetStation.cpId,
            connectorId: conn.connectorId,
            idTag: usedTag,
            startedAt: now.toISOString(),
          };
          summary = `Session #${newTxId} started on ${targetStation.cpId} plug #${conn.connectorId}`;
        }
      }
    }
  }

  // 8. POST /api/partner/sessions/stop
  else if (request.method === 'POST' && normalizedPath.endsWith('/sessions/stop')) {
    if (!authPassed) {
      status = 401;
      data = { error: 'Токен хүчингүй байна' };
      summary = 'Auth error (401 Unauthorized)';
    } else {
      const { transactionId } = request.body || {};
      const txNum = Number(transactionId);
      const sessionIndex = next.activeSessions.findIndex(
        (s) => s.transactionId === txNum,
      );

      if (sessionIndex === -1) {
        status = 404;
        data = { error: `Идэвхтэй сесс олдсонгүй: #${transactionId}` };
        summary = `Stop failed: tx #${transactionId} not active`;
      } else {
        const session = next.activeSessions[sessionIndex];
        // Free the connector back to Available
        const targetStation = next.stations.find((s) => s.cpId === session.cpId);
        if (targetStation) {
          const conn = targetStation.connectors.find(
            (c) => c.connectorId === session.connectorId,
          );
          if (conn) conn.status = 'Available';
        }

        // Move to completed
        const durationMin = Math.max(1, Math.round(session.elapsedSeconds / 60));
        const finalKwh = Math.round(session.currentKwh * 100) / 100;

        next.completedSessions.push({
          transactionId: session.transactionId,
          cpId: session.cpId,
          stationName: session.stationName,
          connectorId: session.connectorId,
          idTag: session.idTag,
          startTimestamp: session.startTimestamp,
          stopTimestamp: now.toISOString(),
          energyKwh: finalKwh,
          durationMin,
          stopReason: 'Remote',
        });

        // Remove from active
        next.activeSessions.splice(sessionIndex, 1);

        status = 200;
        data = {
          status: 'Accepted',
          transactionId: txNum,
          stoppedAt: now.toISOString(),
        };
        summary = `Session #${txNum} stopped. Energy delivered: ${finalKwh} kWh (${durationMin} min)`;
      }
    }
  }

  // 9. GET /api/partner/sessions/active
  else if (request.method === 'GET' && normalizedPath.endsWith('/sessions/active')) {
    if (!authPassed) {
      status = 401;
      data = { error: 'Токен хүчингүй байна' };
      summary = 'Auth error (401 Unauthorized)';
    } else {
      status = 200;
      data = next.activeSessions.map((s) => ({
        transactionId: s.transactionId,
        cpId: s.cpId,
        stationName: s.stationName,
        connectorId: s.connectorId,
        idTag: s.idTag,
        startTimestamp: s.startTimestamp,
        elapsedMinutes: Math.floor(s.elapsedSeconds / 60),
        currentKwh: Math.round(s.currentKwh * 100) / 100,
        lastMeterUpdate: s.lastMeterUpdate,
      }));
      summary = `Active sessions query: ${next.activeSessions.length} in progress`;
    }
  }

  // 10. GET /api/partner/sessions/:id
  else if (request.method === 'GET' && normalizedPath.includes('/sessions/')) {
    if (!authPassed) {
      status = 401;
      data = { error: 'Токен хүчингүй байна' };
      summary = 'Auth error (401 Unauthorized)';
    } else {
      const parts = normalizedPath.split('/sessions/');
      const txNum = Number(parts[1]?.trim());

      // Check active or completed
      const active = next.activeSessions.find((s) => s.transactionId === txNum);
      const completed = next.completedSessions.find((s) => s.transactionId === txNum);

      if (active) {
        status = 200;
        data = {
          transactionId: active.transactionId,
          cpId: active.cpId,
          stationName: active.stationName,
          connectorId: active.connectorId,
          idTag: active.idTag,
          startTimestamp: active.startTimestamp,
          stopTimestamp: null,
          energyKwh: Math.round(active.currentKwh * 100) / 100,
          durationMin: Math.floor(active.elapsedSeconds / 60),
          stopReason: null,
          status: 'In-Progress',
        };
        summary = `Session #${txNum} detail: Active (${Math.round(active.currentKwh)} kWh)`;
      } else if (completed) {
        status = 200;
        data = completed;
        summary = `Session #${txNum} detail: Completed (${completed.energyKwh} kWh)`;
      } else {
        status = 404;
        data = { error: `Сесс олдсонгүй: #${txNum}` };
        summary = `Session not found: #${txNum}`;
      }
    }
  } else {
    status = 404;
    data = { error: 'Not Found' };
    summary = '404 Not Found';
  }

  const event: SimApiEvent = {
    id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: timeStr,
    method: request.method,
    path: request.path,
    status,
    durationMs: Math.floor(Math.random() * 45) + 35, // Simulated 35-80ms realistic network latency
    summary,
  };

  next.events = [event, ...next.events].slice(0, 30);

  return {
    status,
    data,
    nextState: next,
    event,
  };
}

