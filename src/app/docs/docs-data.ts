export type HttpMethod = 'GET' | 'POST' | 'DELETE' | 'PATCH';

export interface ParamDef {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: string;
}

export interface FieldDef {
  name: string;
  type: string;
  description: string;
}

export interface CodeSnippets {
  curl: string;
  nodejs: string;
  python: string;
}

export interface ResponseSample {
  status: number;
  title: string;
  description: string;
  body: any;
}

export interface DocItem {
  id: string;
  type: 'guide' | 'endpoint';
  category: string;
  categoryLabel: string;
  title: string;
  summary: string;
  badge?: string;
  method?: HttpMethod;
  path?: string;
  scope?: string;
  authRequired?: boolean;
  description: string;
  paragraphs?: string[];
  keyPoints?: string[];
  table?: {
    head: string[];
    rows: string[][];
  };
  pathParams?: ParamDef[];
  queryParams?: ParamDef[];
  bodyParams?: ParamDef[];
  responseFields?: FieldDef[];
  codeSnippets?: CodeSnippets;
  responses?: ResponseSample[];
}

export const BASE_URL = 'https://eplug.mn/api/partner';

export const DOC_ITEMS: DocItem[] = [
  // ---------------------------------------------------------------------------
  // 1. GUIDES & OVERVIEW
  // ---------------------------------------------------------------------------
  {
    id: 'overview',
    type: 'guide',
    category: 'getting-started',
    categoryLabel: 'Эхлэх (Getting Started)',
    title: 'Ерөнхий танилцуулга',
    summary: 'Eplug Partner API нь түнш байгууллага, паркийн систем, аппликейшнуудад зориулсан RESTful интерфэйс юм.',
    description:
      'Eplug Partner API-г ашиглан байгууллагууд өөрсдийн системээс цэнэглэх станцуудын бодит цагийн төлөвийг авах, бууны бэлэн байдлыг шалгах, алсаас цэнэглэлт эхлүүлэх болон зогсоох, зарцуулсан кВтц болон төлбөрийн мэдээллийг синхрончлох боломжтой.',
    paragraphs: [
      'Систем нь орчин үеийн REST архитектуртай бөгөөд JSON өгөгдлийн формат, OAuth2 Bearer token баталгаажуулалт, Refresh token rotation зарчмыг ашигладаг.',
      'Мерчант бүрт Eplug админаас эрх, IP whitelist болон зөвшөөрөгдсөн станцын хамрах хүрээг нарийвчлан тохируулж өгдөг.',
    ],
    table: {
      head: ['Үзүүлэлт', 'Утга', 'Тайлбар'],
      rows: [
        ['Үндсэн URL', 'https://eplug.mn/api/partner', 'Production орчны үндсэн хаяг'],
        ['Хөгжүүлэлтийн URL', 'http://localhost:3000/api/partner', 'Локал тест хийх хаяг'],
        ['Өгөгдлийн формат', 'JSON (application/json)', 'UTF-8 тэмдэгтийн кодчилол'],
        ['Нэвтрэлтийн төрөл', 'Bearer Token', 'Authorization: Bearer <accessToken>'],
        ['Access Token хугацаа', '2 цаг (7,200 сек)', 'Хугацаа дуусахад автоматаар шинэчилнэ'],
        ['Refresh Token хугацаа', '30 хоног', 'Rotation горимоор солигдоно'],
      ],
    },
    codeSnippets: {
      curl: `# Серверийн эрүүл мэндийн шалгалт эсвэл OpenAPI татах
curl -X GET "https://eplug.mn/api/partner/docs/openapi.json" \\
  -H "Accept: application/json"`,
      nodejs: `// OpenAPI схемийг татаж авах жишээ
const res = await fetch('https://eplug.mn/api/partner/docs/openapi.json');
const openapiSpec = await res.json();
console.log('API Version:', openapiSpec.info.version);`,
      python: `import requests

res = requests.get('https://eplug.mn/api/partner/docs/openapi.json')
spec = res.json()
print("API Title:", spec["info"]["title"])`,
    },
    responses: [
      {
        status: 200,
        title: 'OpenAPI Schema Available',
        description: 'OpenAPI 3.0.3 баримтжуулалтын JSON бүтэц амжилттай буцаана.',
        body: {
          openapi: '3.0.3',
          info: {
            title: 'Eplug Partner API',
            version: '1.0.0',
            description: 'Eplug EV Charging Station Partner & Merchant API',
          },
          paths: {
            '/auth/login': {},
            '/stations': {},
            '/sessions/start': {},
          },
        },
      },
    ],
  },
  {
    id: 'authentication',
    type: 'guide',
    category: 'getting-started',
    categoryLabel: 'Эхлэх (Getting Started)',
    title: 'Нэвтрэлт & Токен авах',
    summary: 'Мерчант нь нэвтрэх нэр, нууц үгээр Access Token болон Refresh Token авч хүсэлт илгээнэ.',
    description:
      'Аюулгүй байдлыг хангах үүднээс Eplug Partner API нь богино хугацаат Access Token (2 цаг) болон урт хугацаат Refresh Token (30 хоног) ашигладаг. Refresh хийх бүрт хуучин токен хүчингүй болж, шинэ токен олгогдох (Token Rotation) зарчмаар ажилладаг.',
    paragraphs: [
      '1. Анх `/auth/login` endpoint руу мерчантын username, password-оор нэвтэрч `accessToken`, `refreshToken` авна.',
      '2. Цаашид бүх хамгаалагдсан хүсэлтийн HTTP Header-т `Authorization: Bearer <accessToken>` хэлбэрээр илгээнэ.',
      '3. Хэрэв хүсэлт `401 Unauthorized` буцаавал `/auth/refresh` дуудаж шинэ `accessToken` болон шинэ `refreshToken` авна.',
      '4. Хэрэв токен алдагдсан эсвэл гарахаар бол `/auth/revoke` дуудаж хүчингүй болгоно.',
    ],
    codeSnippets: {
      curl: `# Нэвтэрч токен авах жишээ
curl -X POST "https://eplug.mn/api/partner/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "partner_fleet",
    "password": "SecurePassword123!"
  }'`,
      nodejs: `// Node.js: Токен авах ба сэргээх
const loginRes = await fetch('https://eplug.mn/api/partner/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'partner_fleet',
    password: 'SecurePassword123!'
  })
});
const { accessToken, refreshToken } = await loginRes.json();
console.log('Access Token:', accessToken);`,
      python: `import requests

res = requests.post(
    "https://eplug.mn/api/partner/auth/login",
    json={"username": "partner_fleet", "password": "SecurePassword123!"}
)
data = res.json()
access_token = data["accessToken"]
refresh_token = data["refreshToken"]`,
    },
    responses: [
      {
        status: 200,
        title: 'Амжилттай нэвтэрсэн',
        description: 'Access Token болон Refresh Token үүсгэгдэн буцна.',
        body: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: '8f92a10c-39b1-4f12-881b-872f2e719324',
          tokenType: 'Bearer',
          expiresIn: 7200,
          merchant: {
            id: '6736342898fbb934821a',
            name: 'Монгол Флит ХХК',
            code: 'mongol-fleet',
            username: 'partner_fleet',
            allowedStations: ['CP001', 'CP002'],
            allowedScopes: ['stations:read', 'sessions:read', 'sessions:write'],
          },
        },
      },
    ],
  },
  {
    id: 'security',
    type: 'guide',
    category: 'getting-started',
    categoryLabel: 'Эхлэх (Getting Started)',
    title: 'Аюулгүй байдал & Хяналт',
    summary: 'IP Whitelisting, Scopes болон станцын хандалтын хязгаарлалт.',
    description:
      'Мерчант бүрийн хувьд админ самбараас аюулгүй байдлын 3 давхар хамгаалалт тохируулах боломжтой.',
    paragraphs: [
      '• IP Whitelist: Хэрэв мерчант дээр IP хаягууд бүртгэгдсэн бол зөвхөн тухайн IP-аас ирсэн хүсэлтийг зөвшөөрнө. Зөвшөөрөгдөөгүй IP-аас хандвал 403 Forbidden алдаа буцаана.',
      '• Нарийвчилсан эрх (Scopes): stations:read, stations:write, sessions:read, sessions:write зэрэг scope-уудаар үйлдлийг хязгаарлана.',
      '• Станцын хамрах хүрээ: Мерчант зөвхөн гэрээ хийсэн станцууддаа (allowedStations) хандах эрхтэй бөгөөд бусад станцын өгөгдөл нууцлагдана.',
      '• Автомат Лог ба Хяналт: Бүх хүсэлтийн IP, URL, хугацаа, параметр, үр дүнг систем автоматаар бүртгэж, Eplug админд харуулна.',
    ],
    table: {
      head: ['Scope нэр', 'Тайлбар', 'Шаардагдах endpoint'],
      rows: [
        ['stations:read', 'Станцын жагсаалт, төлөв харах', 'GET /stations, GET /stations/:cpId'],
        ['stations:write', 'Станцын тохиргоо өөрчлөх', 'Ирээдүйн өргөтгөл'],
        ['sessions:read', 'Идэвхтэй болон дууссан цэнэглэлт харах', 'GET /sessions/active, GET /sessions/:id'],
        ['sessions:write', 'Алсаас цэнэглэлт эхлүүлэх, зогсоох', 'POST /sessions/start, POST /sessions/stop'],
      ],
    },
  },
  {
    id: 'errors',
    type: 'guide',
    category: 'getting-started',
    categoryLabel: 'Эхлэх (Getting Started)',
    title: 'Алдааны кодууд',
    summary: 'API хүсэлтийн алдааны бүтэц болон HTTP status кодуудын жагсаалт.',
    description:
      'Алдаа гарсан тохиолдолд API нь стандарт HTTP status code болон JSON форматаар алдааны тайлбарыг буцаана.',
    table: {
      head: ['Status', 'Нэр', 'Тайлбар'],
      rows: [
        ['200 OK', 'Success', 'Хүсэлт амжилттай биелсэн.'],
        ['400 Bad Request', 'Invalid Payload', 'Шаардлагатай параметр дутуу эсвэл буруу утгатай.'],
        ['401 Unauthorized', 'Auth Failed', 'Токен байхгүй, хүчингүй болсон эсвэл хугацаа дууссан.'],
        ['403 Forbidden', 'Access Denied', 'Мерчант идэвхгүй, IP зөвшөөрөгдөөгүй эсвэл scope хүрэлцэхгүй.'],
        ['404 Not Found', 'Not Found', 'Хүссэн станц эсвэл сесс олдсонгүй.'],
        ['429 Too Many Requests', 'Rate Limit', 'Нэг минутад зөвшөөрөгдсөн хүсэлтийн тоо хэтэрсэн.'],
        ['500 Internal Error', 'Server Error', 'Серверийн дотоод алдаа.'],
      ],
    },
    codeSnippets: {
      curl: `# Алдааны хариу жишээ:
{
  "error": "Энэ станц дээр үйлдэл хийх эрхгүй байна",
  "code": "FORBIDDEN_STATION"
}`,
      nodejs: `if (!res.ok) {
  const err = await res.json();
  console.error(\`HTTP \${res.status}: \${err.error}\`);
}`,
      python: `if not res.ok:
    err = res.json()
    print(f"Error {res.status_code}: {err.get('error')}")`,
    },
    responses: [
      {
        status: 400,
        title: '400 Bad Request',
        description: 'Параметр дутуу эсвэл буруу төрөлтэй үед буцна.',
        body: {
          error: 'cpId болон connectorId заавал шаардлагатай',
        },
      },
      {
        status: 401,
        title: '401 Unauthorized',
        description: 'Токен хүчингүй болсон үед буцна.',
        body: {
          error: 'Токен хүчингүй байна. Дахин нэвтэрнэ үү',
        },
      },
      {
        status: 403,
        title: '403 Forbidden',
        description: 'IP зөвшөөрөгдөөгүй эсвэл станцын эрх хүрэлцэхгүй үед буцна.',
        body: {
          error: 'Зөвшөөрөгдөөгүй IP хаяг (203.0.113.195)',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATION ENDPOINTS
  // ---------------------------------------------------------------------------
  {
    id: 'post-auth-login',
    type: 'endpoint',
    category: 'auth',
    categoryLabel: 'Нэвтрэлт (Authentication)',
    title: 'Нэвтэрч токен авах',
    summary: 'Мерчантын нэвтрэх нэр болон нууц үгээр 2 цагийн хугацаатай access token авна.',
    method: 'POST',
    path: '/api/partner/auth/login',
    authRequired: false,
    description:
      'Eplug админаас олгосон мерчантын нэвтрэх нэр (username) болон нууц үг (password)-ийг илгээн нэвтэрнэ. Амжилттай болбол 2 цагийн хугацаатай JWT accessToken болон 30 хоногийн хугацаатай refreshToken олгогдоно.',
    bodyParams: [
      {
        name: 'username',
        type: 'string',
        required: true,
        description: 'Мерчантын нэвтрэх нэр (жишээ: partner_fleet)',
        example: 'partner_fleet',
      },
      {
        name: 'password',
        type: 'string',
        required: true,
        description: 'Мерчантын нууц үг',
        example: 'SecurePartnerPass2026!',
      },
    ],
    responseFields: [
      { name: 'accessToken', type: 'string', description: 'Хамгаалагдсан API дуудахад ашиглах JWT токен (2 цаг)' },
      { name: 'refreshToken', type: 'string', description: 'Токен шинэчлэхэд ашиглах UUID токен (30 хоног)' },
      { name: 'tokenType', type: 'string', description: 'Токены төрөл: "Bearer"' },
      { name: 'expiresIn', type: 'number', description: 'Токены хүчинтэй секунд: 7200' },
      { name: 'merchant', type: 'object', description: 'Мерчантын дэлгэрэнгүй мэдээлэл болон эрхүүд' },
    ],
    codeSnippets: {
      curl: `curl -X POST "https://eplug.mn/api/partner/auth/login" \\
  -H "Content-Type: application/json" \\
  -d '{
    "username": "partner_fleet",
    "password": "SecurePartnerPass2026!"
  }'`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'partner_fleet',
    password: 'SecurePartnerPass2026!'
  })
});
const data = await res.json();
console.log('Access Token:', data.accessToken);`,
      python: `import requests

res = requests.post(
    "https://eplug.mn/api/partner/auth/login",
    json={
        "username": "partner_fleet",
        "password": "SecurePartnerPass2026!"
    }
)
data = res.json()
print("Token:", data["accessToken"])`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Амжилттай',
        description: 'Нэвтрэлт амжилттай болж токенууд үүсгэгдлээ.',
        body: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: '8f92a10c-39b1-4f12-881b-872f2e719324',
          tokenType: 'Bearer',
          expiresIn: 7200,
          merchant: {
            id: '6736342898fbb934821a',
            name: 'Таван Богд Флит ХХК',
            code: 'tavan-bogd-fleet',
            username: 'partner_fleet',
            allowedStations: ['CP001', 'CP002'],
            allowedScopes: ['stations:read', 'sessions:read', 'sessions:write'],
          },
        },
      },
      {
        status: 401,
        title: '401 Unauthorized',
        description: 'Хэрэглэгчийн нэр эсвэл нууц үг буруу үед.',
        body: {
          error: 'Хэрэглэгчийн нэр эсвэл нууц үг буруу байна',
        },
      },
    ],
  },
  {
    id: 'post-auth-refresh',
    type: 'endpoint',
    category: 'auth',
    categoryLabel: 'Нэвтрэлт (Authentication)',
    title: 'Токен шинэчлэх (Refresh)',
    summary: 'Хугацаа дууссан access token-ийг refresh token ашиглан автоматаар сунгана.',
    method: 'POST',
    path: '/api/partner/auth/refresh',
    authRequired: false,
    description:
      'Access token-ийн хугацаа (2 цаг) дууссан үед энэхүү endpoint-ийг дуудаж шинэ access token болон шинэ refresh token авна. Хуучин refresh token нь автоматаар хүчингүй болж солигддог (Token Rotation).',
    bodyParams: [
      {
        name: 'refreshToken',
        type: 'string',
        required: true,
        description: 'Анх нэвтрэхэд олгогдсон эсвэл өмнөх refresh-ээр авсан refresh token',
        example: '8f92a10c-39b1-4f12-881b-872f2e719324',
      },
    ],
    responseFields: [
      { name: 'accessToken', type: 'string', description: 'Шинэ 2 цагийн хугацаатай JWT токен' },
      { name: 'refreshToken', type: 'string', description: 'Шинээр үүссэн 30 хоногийн refresh token' },
      { name: 'tokenType', type: 'string', description: 'Токены төрөл: "Bearer"' },
      { name: 'expiresIn', type: 'number', description: '7200 секунд' },
    ],
    codeSnippets: {
      curl: `curl -X POST "https://eplug.mn/api/partner/auth/refresh" \\
  -H "Content-Type: application/json" \\
  -d '{
    "refreshToken": "8f92a10c-39b1-4f12-881b-872f2e719324"
  }'`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/auth/refresh', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    refreshToken: currentRefreshToken
  })
});
const data = await res.json();
currentAccessToken = data.accessToken;
currentRefreshToken = data.refreshToken;`,
      python: `import requests

res = requests.post(
    "https://eplug.mn/api/partner/auth/refresh",
    json={"refreshToken": current_refresh_token}
)
data = res.json()
new_access_token = data["accessToken"]
new_refresh_token = data["refreshToken"]`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Шинэчлэгдсэн',
        description: 'Токен амжилттай шинэчлэгдлээ.',
        body: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.new...',
          refreshToken: '9a83b21d-40c2-4e23-992c-983f3f820435',
          tokenType: 'Bearer',
          expiresIn: 7200,
        },
      },
      {
        status: 401,
        title: '401 Unauthorized',
        description: 'Refresh token хүчингүй болсон эсвэл цуцлагдсан үед.',
        body: {
          error: 'Refresh token хүчингүй болсон байна. Дахин нэвтэрнэ үү',
        },
      },
    ],
  },
  {
    id: 'post-auth-revoke',
    type: 'endpoint',
    category: 'auth',
    categoryLabel: 'Нэвтрэлт (Authentication)',
    title: 'Токен хүчингүй болгох (Revoke)',
    summary: 'Мерчантын одоогийн refresh token эсвэл бүх идэвхтэй токенуудыг цуцална.',
    method: 'POST',
    path: '/api/partner/auth/revoke',
    authRequired: false,
    description:
      'Системээс гарах эсвэл токен алдагдсан байж болзошгүй үед тодорхой refresh token-ийг буцааж цуцална. Хэрэв Authorization толгойтой дуудвал тухайн мерчантын бүх идэвхтэй токен цуцлагдана.',
    bodyParams: [
      {
        name: 'refreshToken',
        type: 'string',
        required: false,
        description: 'Хүчингүй болгох refresh token',
        example: '8f92a10c-39b1-4f12-881b-872f2e719324',
      },
    ],
    codeSnippets: {
      curl: `curl -X POST "https://eplug.mn/api/partner/auth/revoke" \\
  -H "Content-Type: application/json" \\
  -d '{
    "refreshToken": "8f92a10c-39b1-4f12-881b-872f2e719324"
  }'`,
      nodejs: `await fetch('https://eplug.mn/api/partner/auth/revoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ refreshToken: currentRefreshToken })
});`,
      python: `import requests

requests.post(
    "https://eplug.mn/api/partner/auth/revoke",
    json={"refreshToken": current_refresh_token}
)`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Цуцлагдсан',
        description: 'Токен амжилттай хүчингүй боллоо.',
        body: {
          message: 'Токен амжилттай хүчингүй боллоо',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 3. MERCHANT PROFILE
  // ---------------------------------------------------------------------------
  {
    id: 'get-me',
    type: 'endpoint',
    category: 'merchant',
    categoryLabel: 'Мерчант (Merchant)',
    title: 'Миний профайл & эрх шалгах',
    summary: 'Хүсэлт илгээж буй мерчантын мэдээлэл, зөвшөөрөгдсөн станц болон scope эрхийг харах.',
    method: 'GET',
    path: '/api/partner/me',
    authRequired: true,
    description:
      'Одоогийн accessToken-ээр мерчантын нэр, код, зөвшөөрөгдсөн станцын кодууд (allowedStations), зөвшөөрөгдсөн үйлдлийн эрхүүд (allowedScopes), болон нийт дуудсан хүсэлтийн статистикийг буцаана.',
    responseFields: [
      { name: 'id', type: 'string', description: 'Мерчантын ID' },
      { name: 'name', type: 'string', description: 'Байгууллагын нэр' },
      { name: 'code', type: 'string', description: 'Мерчантын slug код' },
      { name: 'username', type: 'string', description: 'Нэвтрэх хэрэглэгчийн нэр' },
      { name: 'allowedStations', type: 'string[]', description: 'Хамаарах станцуудын cpId жагсаалт (хоосон бол бүх станц)' },
      { name: 'allowedScopes', type: 'string[]', description: 'Олгогдсон эрхүүд' },
      { name: 'isActive', type: 'boolean', description: 'Мерчант идэвхтэй эсэх' },
      { name: 'ipWhitelist', type: 'string[]', description: 'Зөвшөөрөгдсөн IP хаягууд' },
      { name: 'telemetry', type: 'object', description: 'Нийт хийсэн API дуудлага, сүүлд хандсан огноо' },
    ],
    codeSnippets: {
      curl: `curl -X GET "https://eplug.mn/api/partner/me" \\
  -H "Authorization: Bearer <accessToken>"`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/me', {
  headers: {
    'Authorization': \`Bearer \${accessToken}\`
  }
});
const me = await res.json();
console.log('Merchant:', me.name, 'Allowed Stations:', me.allowedStations);`,
      python: `import requests

res = requests.get(
    "https://eplug.mn/api/partner/me",
    headers={"Authorization": f"Bearer {access_token}"}
)
me = res.json()
print("Allowed Scopes:", me["allowedScopes"])`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Мерчант мэдээлэл',
        description: 'Мерчантын бүх эрх болон телеметр буцаана.',
        body: {
          id: '6736342898fbb934821a',
          name: 'Таван Богд Флит ХХК',
          code: 'tavan-bogd-fleet',
          username: 'partner_fleet',
          clientId: 'TB-FLEET-CLIENT',
          allowedStations: ['CP001', 'CP002'],
          allowedScopes: ['stations:read', 'sessions:read', 'sessions:write'],
          isActive: true,
          ipWhitelist: ['203.0.113.10'],
          telemetry: {
            totalRequests: 1420,
            lastActiveAt: '2026-11-14T11:20:00.000Z',
          },
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 4. STATIONS ENDPOINTS
  // ---------------------------------------------------------------------------
  {
    id: 'get-stations',
    type: 'endpoint',
    category: 'stations',
    categoryLabel: 'Станц & Буу (Stations)',
    title: 'Станцуудын жагсаалт авах',
    summary: 'Мерчантад зөвшөөрөгдсөн цэнэглэх станцуудын байршил, онлайн төлөв, буунуудын мэдээлэл.',
    method: 'GET',
    path: '/api/partner/stations',
    scope: 'stations:read',
    authRequired: true,
    description:
      'Мерчантад оноосон (allowedStations) бүх цэнэглэх станцуудыг буцаана. Станц бүрийн OCPP холболт идэвхтэй байгаа эсэх (isOnline), холбогч буу тус бүрийн бэлэн байдал (Available, Charging, Faulted гэх мэт) болон хүчин чадлыг (кВт) шууд харах боломжтой.',
    queryParams: [
      {
        name: 'status',
        type: 'string',
        required: false,
        description: 'Төлөвөөр шүүх: "online" эсвэл "offline"',
        example: 'online',
      },
    ],
    responseFields: [
      { name: 'cpId', type: 'string', description: 'Станцын дугаар (жишээ: CP001)' },
      { name: 'name', type: 'string', description: 'Станцын нэр' },
      { name: 'location', type: 'string', description: 'Байршил, дүүрэг' },
      { name: 'address', type: 'string', description: 'Дэлгэрэнгүй хаяг' },
      { name: 'isOnline', type: 'boolean', description: 'OCPP холболт бодит цагт холбоотой эсэх' },
      { name: 'vendor', type: 'string', description: 'Үйлдвэрлэгч' },
      { name: 'model', type: 'string', description: 'Загвар' },
      { name: 'connectors', type: 'array', description: 'Холбогч буунуудын жагсаалт (төрөл, статус, чадал)' },
    ],
    codeSnippets: {
      curl: `curl -X GET "https://eplug.mn/api/partner/stations?status=online" \\
  -H "Authorization: Bearer <accessToken>"`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/stations', {
  headers: { 'Authorization': \`Bearer \${accessToken}\` }
});
const stations = await res.json();
console.log(\`Нийт \${stations.length} станц байна.\`);`,
      python: `import requests

res = requests.get(
    "https://eplug.mn/api/partner/stations",
    headers={"Authorization": f"Bearer {access_token}"}
)
stations = res.json()
for st in stations:
    print(f"Station: {st['name']} ({st['cpId']}) - Online: {st['isOnline']}")`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Станцын жагсаалт',
        description: 'Станцуудын жагсаалт буцаана.',
        body: [
          {
            cpId: 'CP001',
            name: 'МЕТА ЦЕНТР - Барилгын материалын худалдааны төв',
            location: 'Баянгол дүүрэг',
            address: 'WV6C+98V Bayangol, Нарны зам -16/5',
            isOnline: true,
            vendor: 'StarCharge',
            model: 'Titan 120kW',
            connectors: [
              {
                connectorId: 1,
                connectorType: 'GBT_DC',
                status: 'Available',
                maxKw: 120,
              },
              {
                connectorId: 2,
                connectorType: 'GBT_DC',
                status: 'Charging',
                maxKw: 120,
              },
            ],
          },
          {
            cpId: 'CP002',
            name: 'ЗАЙСАН ХИЛЛ ТӨВ',
            location: 'Хан-Уул дүүрэг',
            address: 'Зайсан толгойн баруун талд',
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
      },
    ],
  },
  {
    id: 'get-station-by-id',
    type: 'endpoint',
    category: 'stations',
    categoryLabel: 'Станц & Буу (Stations)',
    title: 'Нэг станцын дэлгэрэнгүй',
    summary: 'Тодорхой нэг станцын бодит цагийн дэлгэрэнгүй мэдээлэл.',
    method: 'GET',
    path: '/api/partner/stations/:cpId',
    scope: 'stations:read',
    authRequired: true,
    description:
      'Станцын дугаар (cpId)-аар шүүж тухайн станцын холболтын төлөв, буунууд, байршлын координат болон сүүлд холбогдсон огноог авна.',
    pathParams: [
      {
        name: 'cpId',
        type: 'string',
        required: true,
        description: 'Станцын код (жишээ: CP001)',
        example: 'CP001',
      },
    ],
    codeSnippets: {
      curl: `curl -X GET "https://eplug.mn/api/partner/stations/CP001" \\
  -H "Authorization: Bearer <accessToken>"`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/stations/CP001', {
  headers: { 'Authorization': \`Bearer \${accessToken}\` }
});
const station = await res.json();
console.log(station.name, station.isOnline);`,
      python: `import requests

res = requests.get(
    "https://eplug.mn/api/partner/stations/CP001",
    headers={"Authorization": f"Bearer {access_token}"}
)
station = res.json()
print("Station status:", station["isOnline"])`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Станцын мэдээлэл',
        description: 'Станцын дэлгэрэнгүй буцаана.',
        body: {
          cpId: 'CP001',
          name: 'МЕТА ЦЕНТР - Барилгын материалын худалдааны төв',
          location: 'Баянгол дүүрэг',
          address: 'WV6C+98V Bayangol, Нарны зам -16/5',
          isOnline: true,
          vendor: 'StarCharge',
          model: 'Titan 120kW',
          connectors: [
            {
              connectorId: 1,
              connectorType: 'GBT_DC',
              status: 'Available',
              maxKw: 120,
            },
          ],
        },
      },
      {
        status: 404,
        title: '404 Not Found',
        description: 'Станц олдсонгүй эсвэл хандах эрхгүй үед.',
        body: {
          error: 'Станц олдсонгүй',
        },
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // 5. CHARGING SESSIONS ENDPOINTS
  // ---------------------------------------------------------------------------
  {
    id: 'post-session-start',
    type: 'endpoint',
    category: 'sessions',
    categoryLabel: 'Цэнэглэлтийн сессүүд (Sessions)',
    title: 'Алсаас цэнэглэлт эхлүүлэх',
    summary: 'OCPP RemoteStartTransaction командаар станцын сонгосон буун дээр цэнэглэлт эхлүүлнэ.',
    method: 'POST',
    path: '/api/partner/sessions/start',
    scope: 'sessions:write',
    authRequired: true,
    description:
      'Станц руу машин залгагдсан байх үед уг endpoint-ийг дуудаж цэнэглэлтийг алсаас эхлүүлнэ. Станцын дугаар (cpId), холбогч бууны дугаар (connectorId)-ийг илгээнэ. Станц амжилттай хариу өгвөл transactionId үүснэ.',
    bodyParams: [
      {
        name: 'cpId',
        type: 'string',
        required: true,
        description: 'Цэнэглэх станцын код',
        example: 'CP001',
      },
      {
        name: 'connectorId',
        type: 'number',
        required: true,
        description: 'Холбогч бууны дугаар (1 эсвэл 2)',
        example: '1',
      },
      {
        name: 'idTag',
        type: 'string',
        required: false,
        description: 'Цэнэглэлтэд ашиглах RFID / виртуал таг (хоосон бол мерчантын виртуал таг автоматаар ашиглагдана)',
        example: 'PARTNER-RFID-01',
      },
    ],
    responseFields: [
      { name: 'status', type: 'string', description: 'OCPP командыг хүлээн авсан эсэх ("Accepted")' },
      { name: 'transactionId', type: 'number', description: 'Үүссэн цэнэглэлтийн сессийн дугаар' },
      { name: 'cpId', type: 'string', description: 'Станцын дугаар' },
      { name: 'connectorId', type: 'number', description: 'Холбогч буу' },
      { name: 'idTag', type: 'string', description: 'Ашигласан таг' },
      { name: 'startedAt', type: 'string', description: 'Эхэлсэн огноо (ISO 8601)' },
    ],
    codeSnippets: {
      curl: `curl -X POST "https://eplug.mn/api/partner/sessions/start" \\
  -H "Authorization: Bearer <accessToken>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "cpId": "CP001",
    "connectorId": 1
  }'`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/sessions/start', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    cpId: 'CP001',
    connectorId: 1
  })
});
const result = await res.json();
console.log('Session started! Transaction ID:', result.transactionId);`,
      python: `import requests

res = requests.post(
    "https://eplug.mn/api/partner/sessions/start",
    headers={"Authorization": f"Bearer {access_token}"},
    json={"cpId": "CP001", "connectorId": 1}
)
session = res.json()
print("Transaction ID:", session["transactionId"])`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Эхэлсэн',
        description: 'Цэнэглэлт амжилттай эхэллээ.',
        body: {
          status: 'Accepted',
          transactionId: 10842,
          cpId: 'CP001',
          connectorId: 1,
          idTag: 'PARTNER-tavan-bogd-fleet',
          startedAt: '2026-11-14T11:32:00.000Z',
        },
      },
      {
        status: 400,
        title: '400 Bad Request',
        description: 'Станц офлайн эсвэл буу бэлэн бус үед.',
        body: {
          error: 'Станц офлайн байна. Цэнэглэлт эхлүүлэх боломжгүй',
        },
      },
    ],
  },
  {
    id: 'post-session-stop',
    type: 'endpoint',
    category: 'sessions',
    categoryLabel: 'Цэнэглэлтийн сессүүд (Sessions)',
    title: 'Цэнэглэлт алсаас зогсоох',
    summary: 'OCPP RemoteStopTransaction командаар явагдаж буй цэнэглэлтийг дуусгана.',
    method: 'POST',
    path: '/api/partner/sessions/stop',
    scope: 'sessions:write',
    authRequired: true,
    description:
      'Явагдаж буй цэнэглэлтийн transactionId-ийг илгээн станцад цэнэглэлтийг зогсоох тушаал өгнө. Станц амжилттай хариулснаар гүйдэл таслагдаж, тоолуурын эцсийн заалт бүртгэгдэнэ.',
    bodyParams: [
      {
        name: 'transactionId',
        type: 'number',
        required: true,
        description: 'Зогсоох цэнэглэлтийн сессийн дугаар',
        example: '10842',
      },
    ],
    responseFields: [
      { name: 'status', type: 'string', description: 'Зогсоох тушаалын үр дүн: "Accepted"' },
      { name: 'transactionId', type: 'number', description: 'Зогсоосон сессийн дугаар' },
      { name: 'stoppedAt', type: 'string', description: 'Зогссон огноо (ISO 8601)' },
    ],
    codeSnippets: {
      curl: `curl -X POST "https://eplug.mn/api/partner/sessions/stop" \\
  -H "Authorization: Bearer <accessToken>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "transactionId": 10842
  }'`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/sessions/stop', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${accessToken}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ transactionId: 10842 })
});
const result = await res.json();
console.log('Session stop status:', result.status);`,
      python: `import requests

res = requests.post(
    "https://eplug.mn/api/partner/sessions/stop",
    headers={"Authorization": f"Bearer {access_token}"},
    json={"transactionId": 10842}
)
print("Stop result:", res.json())`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Зогссон',
        description: 'Цэнэглэлт зогсоох тушаал амжилттай илгээгдлээ.',
        body: {
          status: 'Accepted',
          transactionId: 10842,
          stoppedAt: '2026-11-14T11:45:00.000Z',
        },
      },
    ],
  },
  {
    id: 'get-sessions-active',
    type: 'endpoint',
    category: 'sessions',
    categoryLabel: 'Цэнэглэлтийн сессүүд (Sessions)',
    title: 'Идэвхтэй цэнэглэлтүүдийг харах',
    summary: 'Мерчантын станцууд дээр одоо явагдаж буй бодит цагийн цэнэглэлтийн жагсаалт.',
    method: 'GET',
    path: '/api/partner/sessions/active',
    scope: 'sessions:read',
    authRequired: true,
    description:
      'Одоо яг явагдаж буй (дуусаагүй) бүх цэнэглэлтүүдийн бодит цагийн кВтц зарцуулалт, өнгөрсөн минут болон тоолуурын сүүлийн шинэчлэгдсэн заалтыг буцаана.',
    responseFields: [
      { name: 'transactionId', type: 'number', description: 'Сессийн дугаар' },
      { name: 'cpId', type: 'string', description: 'Станцын дугаар' },
      { name: 'stationName', type: 'string', description: 'Станцын нэр' },
      { name: 'connectorId', type: 'number', description: 'Бууны дугаар' },
      { name: 'startTimestamp', type: 'string', description: 'Эхэлсэн цаг' },
      { name: 'elapsedMinutes', type: 'number', description: 'Өнгөрсөн хугацаа (минутаар)' },
      { name: 'currentKwh', type: 'number', description: 'Одоогийн цэнэглэсэн кВтц' },
      { name: 'lastMeterUpdate', type: 'string', description: 'Тоолуурын сүүлийн мэдээлэл ирсэн цаг' },
    ],
    codeSnippets: {
      curl: `curl -X GET "https://eplug.mn/api/partner/sessions/active" \\
  -H "Authorization: Bearer <accessToken>"`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/sessions/active', {
  headers: { 'Authorization': \`Bearer \${accessToken}\` }
});
const activeSessions = await res.json();
console.log('Active Sessions:', activeSessions);`,
      python: `import requests

res = requests.get(
    "https://eplug.mn/api/partner/sessions/active",
    headers={"Authorization": f"Bearer {access_token}"}
)
for s in res.json():
    print(f"Tx #{s['transactionId']} - {s['currentKwh']} kWh ({s['elapsedMinutes']} min)")`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Идэвхтэй сессүүд',
        description: 'Явагдаж буй цэнэглэлтүүдийн жагсаалт.',
        body: [
          {
            transactionId: 10842,
            cpId: 'CP001',
            stationName: 'МЕТА ЦЕНТР - Барилгын материалын худалдааны төв',
            connectorId: 1,
            idTag: 'PARTNER-tavan-bogd-fleet',
            startTimestamp: '2026-11-14T11:32:00.000Z',
            elapsedMinutes: 18,
            currentKwh: 24.5,
            lastMeterUpdate: '2026-11-14T11:50:00.000Z',
          },
        ],
      },
    ],
  },
  {
    id: 'get-session-by-id',
    type: 'endpoint',
    category: 'sessions',
    categoryLabel: 'Цэнэглэлтийн сессүүд (Sessions)',
    title: 'Сессийн дэлгэрэнгүй & тооцоолол',
    summary: 'Тодорхой нэг цэнэглэлтийн зарцуулсан нийт кВтц, үргэлжилсэн хугацаа, дууссан шалтгаан.',
    method: 'GET',
    path: '/api/partner/sessions/:id',
    scope: 'sessions:read',
    authRequired: true,
    description:
      'Сессийн дугаар (transactionId)-аар шүүж нийт цэнэглэсэн цахилгааны хэмжээ (energyKwh), нийт хугацаа (durationMin), эхэлсэн болон дууссан огноо, зогссон шалтгааныг (Remote, Local, EVDisconnected гэх мэт) харна.',
    pathParams: [
      {
        name: 'id',
        type: 'number',
        required: true,
        description: 'Цэнэглэлтийн сессийн дугаар (transactionId)',
        example: '10842',
      },
    ],
    codeSnippets: {
      curl: `curl -X GET "https://eplug.mn/api/partner/sessions/10842" \\
  -H "Authorization: Bearer <accessToken>"`,
      nodejs: `const res = await fetch('https://eplug.mn/api/partner/sessions/10842', {
  headers: { 'Authorization': \`Bearer \${accessToken}\` }
});
const session = await res.json();
console.log('Total Energy (kWh):', session.energyKwh);`,
      python: `import requests

res = requests.get(
    "https://eplug.mn/api/partner/sessions/10842",
    headers={"Authorization": f"Bearer {access_token}"}
)
session = res.json()
print("Session kWh:", session["energyKwh"], "Duration:", session["durationMin"])`,
    },
    responses: [
      {
        status: 200,
        title: '200 OK — Сессийн мэдээлэл',
        description: 'Сессийн дэлгэрэнгүй тооцоолол.',
        body: {
          transactionId: 10842,
          cpId: 'CP001',
          stationName: 'МЕТА ЦЕНТР - Барилгын материалын худалдааны төв',
          connectorId: 1,
          idTag: 'PARTNER-tavan-bogd-fleet',
          startTimestamp: '2026-11-14T11:00:00.000Z',
          stopTimestamp: '2026-11-14T11:42:00.000Z',
          energyKwh: 36.8,
          durationMin: 42,
          stopReason: 'Remote',
        },
      },
    ],
  },
];

