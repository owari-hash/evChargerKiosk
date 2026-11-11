/**
 * Partner API reference shown on /partners. Planned v1 — the endpoints are not
 * live yet; the page says so. Keep this in step with the partner API doc.
 */

export const API_BASE = 'https://eplug.mn/partner-api/v1';
export const SANDBOX_BASE = 'https://sandbox.eplug.mn/partner-api/v1';

export type HttpMethod = 'GET' | 'POST' | 'DELETE';

export interface Param {
  name: string;
  in: 'path' | 'query' | 'body' | 'form';
  type: string;
  required?: boolean;
  desc: string;
}

export interface Endpoint {
  id: string;
  method: HttpMethod;
  path: string;
  title: string;
  summary: string;
  scope?: string;
  /** Path with example values filled in, for the code samples. */
  example: string;
  params?: Param[];
  /** JSON body (or form string for the token call). */
  body?: string;
  form?: boolean;
  response: string;
  notes?: string[];
  /** The token call itself needs no bearer token. */
  noAuth?: boolean;
}

export interface Table {
  head: string[];
  rows: string[][];
}

export interface Section {
  id: string;
  title: string;
  icon: string;
  lead: string;
  paragraphs?: string[];
  table?: Table;
  endpoints?: Endpoint[];
  after?: { paragraphs?: string[]; table?: Table };
}

const ICON = {
  book: 'M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm2 14h12',
  key: 'M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm-3 3v11m0-4h3m-3-3h2',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0ZM4 21a8 8 0 0 1 16 0',
  wallet: 'M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4M21 11h-5a2 2 0 0 0 0 4h5v-4Z',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Zm0-9.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  sync: 'M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5',
  alert: 'M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
  shield: 'M12 3 4 6v6c0 5 3.4 8.6 8 9 4.6-.4 8-4 8-9V6l-8-3Z',
};

export const SECTIONS: Section[] = [
  {
    id: 'intro',
    title: 'Танилцуулга',
    icon: ICON.book,
    lead:
      'Eplug Partner API нь түнш байгууллагад жолоочийн мэдээлэл, хэтэвчний үлдэгдэл, станцын төлөвийг Eplug-ээс олгосон токеноор аюулгүйгээр татаж, өөрийн системтэйгээ синк хийх боломж олгоно.',
    table: {
      head: ['Зүйл', 'Утга'],
      rows: [
        ['Үндсэн URL', API_BASE],
        ['Туршилтын орчин', SANDBOX_BASE],
        ['Формат', 'JSON, UTF-8'],
        ['Нэвтрэлт', 'OAuth 2.0 client credentials → Bearer токен'],
        ['Огноо', 'ISO 8601, UTC — 2026-11-11T08:30:00Z'],
        ['Мөнгөн дүн', 'Бүхэл төгрөг (MNT): 25000 = 25,000₮'],
      ],
    },
  },
  {
    id: 'auth',
    title: 'Нэвтрэлт ба токен',
    icon: ICON.key,
    lead:
      'Гэрээ байгуулахад Eplug танд client_id болон client_secret олгоно. Тэдгээрээр 1 цагийн хугацаатай access token авч, хүсэлт бүрийн Authorization толгойд илгээнэ.',
    endpoints: [
      {
        id: 'token',
        method: 'POST',
        path: '/oauth/token',
        title: 'Токен авах',
        summary: 'client_id, client_secret-ээр 1 цагийн хугацаатай access token авна.',
        example: '/oauth/token',
        noAuth: true,
        form: true,
        params: [
          { name: 'grant_type', in: 'form', type: 'string', required: true, desc: 'Үргэлж client_credentials' },
          { name: 'client_id', in: 'form', type: 'string', required: true, desc: 'Eplug-ээс олгосон дугаар' },
          { name: 'client_secret', in: 'form', type: 'string', required: true, desc: 'Нууц түлхүүр — зөвхөн сервер дээр' },
          { name: 'scope', in: 'form', type: 'string', desc: 'Зайгаар тусгаарласан scope-ууд' },
        ],
        body: 'grant_type=client_credentials&client_id=ptn_7f3a9c&client_secret=sk_live_xxxxxxxx&scope=stations:read drivers:read wallet:read',
        response: `{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "stations:read drivers:read wallet:read"
}`,
        notes: ['Токен дуусахад API 401 token_expired буцаана. Дуусахаас 5 минутын өмнө шинэчлэхийг зөвлөж байна.'],
      },
    ],
    after: {
      paragraphs: ['Гэрээгээр зөвшөөрсөн scope-оос илүүг авах боломжгүй.'],
      table: {
        head: ['Scope', 'Юу хийх боломж олгох'],
        rows: [
          ['stations:read', 'Станц, холбогчийн төлөв, тариф унших'],
          ['drivers:link', 'Жолоочийг түншийн системтэй холбох'],
          ['drivers:read', 'Холбогдсон жолоочийн профайл унших'],
          ['wallet:read', 'Холбогдсон жолоочийн үлдэгдэл, гүйлгээ унших'],
          ['sessions:read', 'Холбогдсон жолоочийн цэнэглэлтийн түүх унших'],
        ],
      },
    },
  },
  {
    id: 'links',
    title: 'Жолооч холбох',
    icon: ICON.link,
    lead:
      'Жолоочийн мэдээлэл, үлдэгдлийг зөвхөн тухайн жолооч SMS кодоор зөвшөөрсний дараа уншина. Зөвшөөрлийн дараа driverId авч, цаашдын хүсэлтэд ашиглана.',
    endpoints: [
      {
        id: 'link-create',
        method: 'POST',
        path: '/links',
        title: 'Холбох хүсэлт үүсгэх',
        summary: 'Жолоочийн утас руу 6 оронтой баталгаажуулах код илгээнэ.',
        scope: 'drivers:link',
        example: '/links',
        params: [
          { name: 'phone', in: 'body', type: 'string', required: true, desc: 'Жолоочийн Eplug-д бүртгэлтэй утас' },
          { name: 'scopes', in: 'body', type: 'string[]', required: true, desc: 'Жолоочоос асуух эрхүүд' },
        ],
        body: `{ "phone": "+97699112233", "scopes": ["drivers:read", "wallet:read"] }`,
        response: `{
  "linkId": "lnk_01J9Z8K2",
  "expiresAt": "2026-11-11T08:40:00Z",
  "sentTo": "+976 99** **33"
}`,
        notes: ['Нэг утасны дугаарт цагт 5 удаа хүсэлт илгээх боломжтой.'],
      },
      {
        id: 'link-verify',
        method: 'POST',
        path: '/links/{linkId}/verify',
        title: 'Кодоор баталгаажуулах',
        summary: 'Жолоочийн өгсөн кодыг шалгаж driverId буцаана.',
        scope: 'drivers:link',
        example: '/links/lnk_01J9Z8K2/verify',
        params: [
          { name: 'linkId', in: 'path', type: 'string', required: true, desc: 'Холбох хүсэлтийн дугаар' },
          { name: 'code', in: 'body', type: 'string', required: true, desc: 'SMS-ээр ирсэн 6 оронтой код' },
        ],
        body: `{ "code": "482913" }`,
        response: `{
  "driverId": "drv_6650a1b2c3d4e5f6",
  "scopes": ["drivers:read", "wallet:read"],
  "linkedAt": "2026-11-11T08:31:12Z"
}`,
        notes: ['Код 10 минут хүчинтэй. 5 удаа буруу оруулбал хүсэлт цуцлагдана.'],
      },
      {
        id: 'link-delete',
        method: 'DELETE',
        path: '/links/{driverId}',
        title: 'Холболт цуцлах',
        summary: 'Жолоочийн холболтыг цуцална. Жолооч өөрөө Eplug апп-аас мөн цуцалж болно.',
        scope: 'drivers:link',
        example: '/links/drv_6650a1b2c3d4e5f6',
        params: [{ name: 'driverId', in: 'path', type: 'string', required: true, desc: 'Жолоочийн дугаар' }],
        response: `{ "ok": true }`,
      },
    ],
  },
  {
    id: 'drivers',
    title: 'Жолооч',
    icon: ICON.user,
    lead: 'Холбогдсон жолоочийн профайл. Имэйл, бүтэн утас, PIN, цэнэглэх картын дугаарыг хэзээ ч өгөхгүй.',
    endpoints: [
      {
        id: 'driver-get',
        method: 'GET',
        path: '/drivers/{driverId}',
        title: 'Жолоочийн мэдээлэл',
        summary: 'Нэр, нууцлагдсан утас, машины мэдээлэл, төлөв.',
        scope: 'drivers:read',
        example: '/drivers/drv_6650a1b2c3d4e5f6',
        params: [{ name: 'driverId', in: 'path', type: 'string', required: true, desc: 'Жолоочийн дугаар' }],
        response: `{
  "driverId": "drv_6650a1b2c3d4e5f6",
  "name": "Бат-Эрдэнэ",
  "phone": "+976 99** **33",
  "vehicle": { "brand": "BYD", "model": "Atto 3" },
  "memberSince": "2025-03-14T02:10:00Z",
  "status": "active",
  "updatedAt": "2026-11-10T11:42:05Z"
}`,
        notes: ['status = closed бол жолооч бүртгэлээ хаасан — түүний өгөгдлийг 30 хоногт устгана.'],
      },
    ],
  },
  {
    id: 'wallet',
    title: 'Хэтэвч',
    icon: ICON.wallet,
    lead: 'Жолоочийн хэтэвчний үлдэгдэл болон гүйлгээний түүх. v1-д зөвхөн унших боломжтой.',
    endpoints: [
      {
        id: 'wallet-get',
        method: 'GET',
        path: '/drivers/{driverId}/wallet',
        title: 'Үлдэгдэл',
        summary: 'Одоогийн үлдэгдэл, цэнэглэлт эхлүүлэхэд хүрэлцэх эсэх.',
        scope: 'wallet:read',
        example: '/drivers/drv_6650a1b2c3d4e5f6/wallet',
        params: [{ name: 'driverId', in: 'path', type: 'string', required: true, desc: 'Жолоочийн дугаар' }],
        response: `{
  "driverId": "drv_6650a1b2c3d4e5f6",
  "balance": 48500,
  "currency": "MNT",
  "canStartCharging": true,
  "updatedAt": "2026-11-11T07:58:40Z"
}`,
      },
      {
        id: 'wallet-entries',
        method: 'GET',
        path: '/drivers/{driverId}/wallet/entries',
        title: 'Гүйлгээний түүх',
        summary: 'Орлого (+), зарлага (−) гүйлгээнүүд, шинэ нь эхэндээ.',
        scope: 'wallet:read',
        example: '/drivers/drv_6650a1b2c3d4e5f6/wallet/entries?since=2026-11-01T00:00:00Z&limit=100',
        params: [
          { name: 'driverId', in: 'path', type: 'string', required: true, desc: 'Жолоочийн дугаар' },
          { name: 'since', in: 'query', type: 'datetime', desc: 'Энэ огнооноос хойших' },
          { name: 'limit', in: 'query', type: 'integer', desc: '1–200, анхдагч 50' },
          { name: 'cursor', in: 'query', type: 'string', desc: 'Дараагийн хуудас' },
        ],
        response: `{
  "entries": [
    {
      "id": "we_9f2c1a",
      "type": "CHARGE",
      "amount": -12750,
      "balanceAfter": 48500,
      "stationId": "6650f3a9e1b2c3d4e5f60718",
      "sessionId": 18342,
      "createdAt": "2026-11-11T07:58:40Z"
    },
    {
      "id": "we_9f2b77",
      "type": "TOPUP",
      "amount": 50000,
      "balanceAfter": 61250,
      "method": "QPAY",
      "createdAt": "2026-11-10T19:02:11Z"
    }
  ],
  "nextCursor": null
}`,
        notes: ['type: TOPUP (цэнэглэлт), CHARGE (цэнэглэлтийн төлбөр), REFUND (буцаалт), ADJUSTMENT (операторын засвар).'],
      },
    ],
  },
  {
    id: 'stations',
    title: 'Станц',
    icon: ICON.pin,
    lead: 'Станцын мэдээлэл нийтийнх — жолоочийн зөвшөөрөл шаардахгүй. Холбогчийн төлөв бодит цагийнх.',
    endpoints: [
      {
        id: 'stations-list',
        method: 'GET',
        path: '/stations',
        title: 'Станцын жагсаалт',
        summary: 'Бүх станц, байршил, төлөв, тариф.',
        scope: 'stations:read',
        example: '/stations?updatedSince=2026-11-11T00:00:00Z&limit=100',
        params: [
          { name: 'updatedSince', in: 'query', type: 'datetime', desc: 'Энэ цагаас хойш өөрчлөгдсөн' },
          { name: 'lat, lng', in: 'query', type: 'number', desc: 'Байршлаас зайгаар эрэмбэлэх' },
          { name: 'limit', in: 'query', type: 'integer', desc: '1–500, анхдагч 200' },
        ],
        response: `{
  "stations": [
    {
      "stationId": "6650f3a9e1b2c3d4e5f60718",
      "name": "Зайсан Хилл Комплекс Баруун",
      "availability": "busy",
      "availableConnectors": 0,
      "totalConnectors": 2,
      "tariffPerKwh": 550,
      "waitMinutes": 18,
      "updatedAt": "2026-11-11T08:29:51Z"
    }
  ]
}`,
      },
      {
        id: 'station-get',
        method: 'GET',
        path: '/stations/{stationId}',
        title: 'Станцын дэлгэрэнгүй',
        summary: 'Холбогч бүрийн төрөл, хүчин чадал, төлөв, үлдсэн хугацаа.',
        scope: 'stations:read',
        example: '/stations/6650f3a9e1b2c3d4e5f60718',
        params: [{ name: 'stationId', in: 'path', type: 'string', required: true, desc: 'Станцын дугаар' }],
        response: `{
  "stationId": "6650f3a9e1b2c3d4e5f60718",
  "name": "Зайсан Хилл Комплекс Баруун",
  "address": "Dunjingarav 14, 11-р хороо, Улаанбаатар",
  "location": { "lat": 47.8864, "lng": 106.9057 },
  "availability": "busy",
  "maxPowerKw": 60,
  "tariffPerKwh": 550,
  "waitMinutes": 18,
  "connectors": [
    { "connectorId": 1, "type": "CCS2", "powerKw": 60, "status": "Charging", "minutesLeft": 18 },
    { "connectorId": 2, "type": "GBT", "powerKw": 60, "status": "Charging", "minutesLeft": 41 }
  ],
  "updatedAt": "2026-11-11T08:29:51Z"
}`,
        notes: [
          'availability: available, busy, offline, unknown.',
          'waitMinutes зөвхөн busy үед; minutesLeft — цэнэглэж буй машин дуусахад үлдсэн минут (ойролцоо).',
        ],
      },
    ],
  },
  {
    id: 'sync',
    title: 'Синк хийх',
    icon: ICON.sync,
    lead:
      'Нэг удаа бүрэн татаад, дараа нь зөвхөн өөрчлөгдсөн зүйлийг cursor-оор татна. hasMore: true бол тэр дороо дахин дуудна.',
    endpoints: [
      {
        id: 'changes',
        method: 'GET',
        path: '/changes',
        title: 'Өөрчлөлтийн урсгал',
        summary: 'Станц, жолооч, хэтэвчний өөрчлөлтүүд дарааллаар.',
        scope: 'stations:read',
        example: '/changes?cursor=c_00001a7f&limit=200',
        params: [
          { name: 'cursor', in: 'query', type: 'string', desc: 'Сүүлд хадгалсан nextCursor; хоосон бол эхнээс' },
          { name: 'limit', in: 'query', type: 'integer', desc: '1–500, анхдагч 200' },
        ],
        response: `{
  "changes": [
    { "kind": "station", "id": "6650f3a9e1b2c3d4e5f60718", "op": "updated", "at": "2026-11-11T08:29:51Z" },
    { "kind": "wallet", "id": "drv_6650a1b2c3d4e5f6", "op": "updated", "at": "2026-11-11T07:58:40Z", "data": { "balance": 48500 } },
    { "kind": "driver", "id": "drv_77ab0c", "op": "unlinked", "at": "2026-11-11T07:40:02Z" }
  ],
  "nextCursor": "c_00001a92",
  "hasMore": false
}`,
        notes: ['Cursor 7 хоног хүчинтэй; хуучирвал 410 cursor_expired — бүрэн синкээс эхэлнэ.'],
      },
    ],
    after: {
      table: {
        head: ['Өгөгдөл', 'Зөвлөх давтамж'],
        rows: [
          ['Станцын төлөв', '30 секунд тутам'],
          ['Хэтэвчний үлдэгдэл', '30–60 секунд тутам'],
          ['Жолоочийн профайл', '/changes-т ирэхэд л'],
          ['Бүрэн дахин синк', 'Өдөрт 1 удаа, шөнө'],
        ],
      },
    },
  },
  {
    id: 'errors',
    title: 'Алдаа ба хязгаар',
    icon: ICON.alert,
    lead:
      'Алдаа бүр { "error": { "code", "message", "requestId" } } бүтэцтэй. Хязгаар: түнш бүрт минутад 600 хүсэлт.',
    table: {
      head: ['HTTP', 'Код', 'Юу хийх'],
      rows: [
        ['400', 'invalid_request', 'Хүсэлтээ засна'],
        ['400', 'invalid_code', 'Жолоочоос кодоо дахин асууна'],
        ['401', 'token_expired', 'Шинэ токен аваад дахин илгээнэ'],
        ['401', 'invalid_client', 'client_id / secret-ээ шалгана'],
        ['403', 'insufficient_scope', 'Зөвшөөрсөн scope-оор токен авна'],
        ['403', 'link_revoked', 'Тухайн жолоочийн өгөгдлийг устгана'],
        ['404', 'not_found', 'ID-гаа шалгана'],
        ['410', 'cursor_expired', 'Бүрэн синкээс эхэлнэ'],
        ['429', 'rate_limited', 'Retry-After секунд хүлээнэ'],
        ['5xx', 'server_error', '1, 2, 4, 8 секундын зайтай дахин оролдоно'],
      ],
    },
  },
  {
    id: 'security',
    title: 'Аюулгүй байдал',
    icon: ICON.shield,
    lead: 'Түнш бүр дараах шаардлагыг хангана.',
    paragraphs: [
      'Зөвхөн HTTPS (TLS 1.2+).',
      'client_secret, токеноо сервер дээр шифрлэж хадгална — апп, вэб, логт бичихгүй.',
      'Хүсэлт зөвхөн гэрээнд бүртгүүлсэн IP хаягаас ирнэ.',
      'client_secret-ээ 90 хоног тутам сольно.',
      'Холболт цуцлагдсан жолоочийн өгөгдлийг 30 хоногт устгана.',
    ],
  },
];

/** The "systems you can exchange data with" grid on the intro. */
export const MODULES = [
  { id: 'stations', title: 'Станц', body: 'Байршил, холбогчийн төлөв, тариф, хүлээх хугацаа', icon: ICON.pin },
  { id: 'drivers', title: 'Жолооч', body: 'Зөвшөөрсөн жолоочийн профайл, машин', icon: ICON.user },
  { id: 'wallet', title: 'Хэтэвч', body: 'Үлдэгдэл, гүйлгээний түүх', icon: ICON.wallet },
  { id: 'sync', title: 'Синк', body: 'Өөрчлөлтийг cursor-оор татах', icon: ICON.sync },
];
