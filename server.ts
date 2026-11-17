import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import https from 'https';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse CLI port arguments if provided, e.g. --port 3000
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portArg = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : undefined;
const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json({ limit: '10mb' }));

// Efí Bank Environment Configuration
const EFIBANK_CLIENT_ID = process.env.EFIBANK_CLIENT_ID || 'Client_Id_62a2fe6ca801b2a8c7c688c6d1cc425aca747df4';
const EFIBANK_CLIENT_SECRET = process.env.EFIBANK_CLIENT_SECRET || 'Client_Secret_c7101c6e1f68b0860eec3b57abe31ec8c7f46a42';
const EFIBANK_PIX_KEY = process.env.EFIBANK_PIX_KEY || 'fab4cde3-4367-4d0b-aa9b-4528dc04d371';
const EFIBANK_SANDBOX = process.env.EFIBANK_SANDBOX !== 'false'; // Default to true if set or empty
// Account certificate (.p12, base64). With it, charges are created and confirmed on the Efí Pix API.
const EFIBANK_CERT_BASE64 = (process.env.EFIBANK_CERT_BASE64 || '').replace(/\s+/g, '');
const EFI_API_ENABLED = Boolean(EFIBANK_CERT_BASE64 && EFIBANK_CLIENT_ID && EFIBANK_CLIENT_SECRET && EFIBANK_PIX_KEY);
const EFI_API_HOST = EFIBANK_SANDBOX ? 'pix-h.api.efipay.com.br' : 'pix.api.efipay.com.br';
const efiAgent = EFI_API_ENABLED
  ? new https.Agent({ pfx: Buffer.from(EFIBANK_CERT_BASE64, 'base64'), passphrase: '', keepAlive: true })
  : undefined;

function efiHttp(method: string, pathName: string, headers: Record<string, string>, body?: unknown): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = https.request(
      {
        host: EFI_API_HOST,
        path: pathName,
        method,
        agent: efiAgent,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload).toString() } : {}),
          ...headers,
        },
      },
      (response) => {
        let raw = '';
        response.on('data', (chunk) => (raw += chunk));
        response.on('end', () => {
          let data: any = raw;
          try { data = raw ? JSON.parse(raw) : {}; } catch { /* keep raw text */ }
          resolve({ status: response.statusCode || 0, data });
        });
      }
    );
    req.on('timeout', () => req.destroy(new Error('Efí API timeout')));
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

let efiToken: { value: string; expiresAt: number } | null = null;

async function efiAccessToken(): Promise<string> {
  if (efiToken && efiToken.expiresAt > Date.now() + 60_000) return efiToken.value;
  const basic = Buffer.from(`${EFIBANK_CLIENT_ID}:${EFIBANK_CLIENT_SECRET}`).toString('base64');
  const res = await efiHttp('POST', '/oauth/token', { Authorization: `Basic ${basic}` }, { grant_type: 'client_credentials' });
  if (res.status !== 200 || !res.data?.access_token) {
    throw new Error(`Efí auth failed (HTTP ${res.status})`);
  }
  efiToken = { value: res.data.access_token, expiresAt: Date.now() + (res.data.expires_in || 3600) * 1000 };
  return efiToken.value;
}

async function efiApi(method: string, pathName: string, body?: unknown) {
  const token = await efiAccessToken();
  return efiHttp(method, pathName, { Authorization: `Bearer ${token}` }, body);
}

// Persistent store for active and completed Pix charges
export interface PixChargeRecord {
  txid: string;
  invoiceId?: string;
  clientId?: string;
  amount: number;
  description: string;
  pixCopiaECola: string;
  status: 'ATIVA' | 'CONCLUIDA' | 'EXPIRADA';
  createdAt: string;
  paidAt?: string;
  paymentMethod?: string;
  endToEndId?: string;
  planId?: string;
  efi?: boolean; // created on the Efí Pix API, so its status can be confirmed with the bank
  appliedAt?: string; // when the renewal was written to the client's record
  newExpirationDate?: string;
}

const activeCharges = new Map<string, PixChargeRecord>();

const DATA_DIR = path.resolve(__dirname, 'data');
const CHARGES_FILE = path.resolve(DATA_DIR, 'pix_charges.json');

function loadChargesFromDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (fs.existsSync(CHARGES_FILE)) {
      const data = fs.readFileSync(CHARGES_FILE, 'utf-8');
      const list = JSON.parse(data) as PixChargeRecord[];
      for (const item of list) {
        activeCharges.set(item.txid, item);
      }
      console.log(`[Efí Pix Store] Carregadas ${list.length} cobranças do disco.`);
    }
  } catch (err) {
    console.warn('[Efí Pix Store] Falha ao carregar cobranças:', err);
  }
}

function saveChargesToDisk() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    const list = Array.from(activeCharges.values());
    fs.writeFileSync(CHARGES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Efí Pix Store] Falha ao salvar cobranças:', err);
  }
}

loadChargesFromDisk();

// --- RENEWAL: the server writes the paid period to the client's record (Firestore) ---
// Doing it here, and not in the browser, keeps the new due date even if the client closes the page.
let firebaseCfg: { projectId?: string; apiKey?: string; firestoreDatabaseId?: string } = {};
try {
  firebaseCfg = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'firebase-applet-config.json'), 'utf-8'));
} catch (err) {
  console.warn('[Renovação] firebase-applet-config.json não encontrado:', (err as Error).message);
}
const FIRESTORE_DOCS = `https://firestore.googleapis.com/v1/projects/${firebaseCfg.projectId}/databases/${firebaseCfg.firestoreDatabaseId || '(default)'}/documents`;

function todayInBrazil(): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date()).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function formatBrDate(date: Date): string {
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`;
}

// New due date: counts from the current due date when it is still in the future, so no paid day is lost.
export function nextExpirationDate(currentExpiration: string | undefined, months: number | undefined, today = todayInBrazil()): string {
  const [d, m, y] = String(currentExpiration || '').split('/').map(Number);
  const current = d && m && y ? new Date(Date.UTC(y, m - 1, d)) : null;
  const next = new Date(current && current.getTime() > today.getTime() ? current : today);
  if (months && months > 0) next.setUTCMonth(next.getUTCMonth() + months);
  else next.setUTCDate(next.getUTCDate() + 30);
  return formatBrDate(next);
}

async function applyPaymentToClient(charge: PixChargeRecord): Promise<void> {
  if (charge.status !== 'CONCLUIDA' || charge.appliedAt || !charge.clientId || !firebaseCfg.projectId) return;
  if (!/^[a-zA-Z0-9_-]+$/.test(charge.clientId)) return;
  const docUrl = `${FIRESTORE_DOCS}/clients/${charge.clientId}`;
  try {
    const current = await fetch(`${docUrl}?key=${firebaseCfg.apiKey}`);
    if (!current.ok) throw new Error(`leitura do cliente falhou (HTTP ${current.status})`);
    const fields = (await current.json()).fields || {};
    const payments: any[] = fields.payments?.arrayValue?.values || [];
    const alreadyThere = payments.find((p) => p?.mapValue?.fields?.id?.stringValue === charge.txid);

    if (alreadyThere) {
      charge.newExpirationDate = alreadyThere.mapValue.fields.dueDate?.stringValue;
    } else {
      const plan = charge.planId ? paymentPlans.find((p) => p.id === charge.planId) : undefined;
      const newExpiration = nextExpirationDate(fields.expirationDate?.stringValue, plan?.months);
      const payment = {
        mapValue: {
          fields: {
            id: { stringValue: charge.txid },
            description: { stringValue: plan ? `Plano ${plan.name}` : 'Renovação da assinatura' },
            date: { stringValue: formatBrDate(todayInBrazil()) },
            dueDate: { stringValue: newExpiration },
            amount: { doubleValue: charge.amount },
            status: { stringValue: 'pago' },
            paymentMethod: { stringValue: 'PIX Efí Bank' },
            clientId: { stringValue: charge.clientId },
          },
        },
      };
      const update: Record<string, unknown> = {
        expirationDate: { stringValue: newExpiration },
        status: { stringValue: 'ativo' },
        payments: { arrayValue: { values: [payment, ...payments].slice(0, 60) } },
      };
      if (plan) {
        update.screens = { integerValue: String(plan.screens) };
        update.plan = { stringValue: plan.name };
      }
      const mask = Object.keys(update).map((f) => `updateMask.fieldPaths=${f}`).join('&');
      const saved = await fetch(`${docUrl}?${mask}&currentDocument.exists=true&key=${firebaseCfg.apiKey}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: update }),
      });
      if (!saved.ok) throw new Error(`gravação da renovação falhou (HTTP ${saved.status})`);
      charge.newExpirationDate = newExpiration;
      console.log(`[Renovação] Cliente ${charge.clientId} renovado até ${newExpiration} (cobrança ${charge.txid}).`);
    }
    charge.appliedAt = new Date().toISOString();
    saveChargesToDisk();
  } catch (err) {
    console.warn(`[Renovação] Cobrança ${charge.txid} paga, mas a renovação não foi gravada:`, (err as Error).message);
  }
}

// Asks Efí whether an open charge was paid. Only charges created on the Efí API can be confirmed.
const lastEfiCheck = new Map<string, number>();
async function refreshChargeFromEfi(charge: PixChargeRecord): Promise<void> {
  // A paid charge whose renewal could not be written yet is retried here.
  if (charge.status === 'CONCLUIDA') return applyPaymentToClient(charge);
  if (!EFI_API_ENABLED || !charge.efi || charge.status !== 'ATIVA') return;
  const last = lastEfiCheck.get(charge.txid) || 0;
  if (Date.now() - last < 4000) return;
  lastEfiCheck.set(charge.txid, Date.now());
  try {
    const res = await efiApi('GET', `/v2/cob/${charge.txid}`);
    if (res.status !== 200) return;
    if (res.data.status === 'CONCLUIDA') {
      const pix = Array.isArray(res.data.pix) ? res.data.pix[0] : undefined;
      charge.status = 'CONCLUIDA';
      charge.paidAt = pix?.horario || new Date().toISOString();
      charge.endToEndId = pix?.endToEndId;
      charge.paymentMethod = 'PIX Efí Bank';
      saveChargesToDisk();
      console.log(`[Efí Pix] Cobrança ${charge.txid} paga (confirmada pela Efí).`);
      await applyPaymentToClient(charge);
    } else if (res.data.status && res.data.status !== 'ATIVA') {
      charge.status = 'EXPIRADA';
      saveChargesToDisk();
    }
  } catch (err) {
    console.warn('[Efí Pix] Falha ao consultar cobrança:', (err as Error).message);
  }
}

// Helper: Calculate CRC16 CCITT
function calculateCRC16(payload: string): string {
  let crc = 0xffff;
  const polynomial = 0x1021;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

// Generate valid standard EMV BR Code payload (Pix Copia e Cola)
function buildPixPayload(pixKey: string, amount: number, txId: string, description?: string): string {
  let cleanKey = pixKey.trim();
  let payload = formatEmvField('00', '01'); // Format Indicator
  // Field 01 (Point of Initiation) is left out on purpose: this is a static code built from the
  // Pix key. Marking it "12" (single-use dynamic charge) makes bank apps reject the code.

  const gui = formatEmvField('00', 'br.gov.bcb.pix');
  const keyField = formatEmvField('01', cleanKey);
  payload += formatEmvField('26', gui + keyField);

  payload += formatEmvField('52', '0000'); // MCC
  payload += formatEmvField('53', '986'); // Currency (BRL)

  if (amount > 0) {
    payload += formatEmvField('54', amount.toFixed(2));
  }

  payload += formatEmvField('58', 'BR');
  payload += formatEmvField('59', 'ZUXO STREAMING');
  payload += formatEmvField('60', 'SAO PAULO');

  const cleanTxId = txId.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || 'ZUXO';
  const txField = formatEmvField('05', cleanTxId);
  payload += formatEmvField('62', txField);

  payload += '6304';
  const crc = calculateCRC16(payload);
  return payload + crc;
}

// --- API ROUTES ---

// 1. Get Efí Bank configuration status
app.get('/api/pix/config', (req: Request, res: Response) => {
  const isConfigured = Boolean(EFIBANK_CLIENT_ID && EFIBANK_CLIENT_SECRET && EFIBANK_PIX_KEY);
  res.json({
    configured: isConfigured,
    apiEnabled: EFI_API_ENABLED,
    provider: 'Efí Bank (ex-Gerencianet)',
    pixKey: EFIBANK_PIX_KEY,
    clientIdMasked: EFIBANK_CLIENT_ID ? `${EFIBANK_CLIENT_ID.substring(0, 14)}...${EFIBANK_CLIENT_ID.substring(EFIBANK_CLIENT_ID.length - 4)}` : null,
    sandbox: EFIBANK_SANDBOX,
    status: isConfigured ? 'operacional' : 'pendente_configuracao',
    timestamp: new Date().toISOString()
  });
});

// --- PLANOS DE ASSINATURA (gerenciados pelo admin, salvos em data/payment_plans.json) ---
interface PaymentPlanRecord {
  id: string;
  name: string;
  screens: number;
  months: number;
  price: number;
  active: boolean;
  recommended: boolean;
  features: string[];
  updatedAt: string;
}

const PLANS_FILE = path.resolve(DATA_DIR, 'payment_plans.json');

const DEFAULT_PLAN_PRICES: Record<number, Record<number, number>> = {
  1: { 1: 35, 3: 95, 6: 180, 12: 330 },
  2: { 1: 50, 3: 135, 6: 260, 12: 480 },
  3: { 1: 65, 3: 175, 6: 330, 12: 620 },
};

function periodLabel(months: number) {
  return months === 1 ? '1 mês' : `${months} meses`;
}

function defaultPlanName(screens: number, months: number) {
  return `${screens} ${screens === 1 ? 'Tela' : 'Telas'} • ${periodLabel(months)}`;
}

function defaultPlanFeatures(screens: number) {
  return [
    'Canais ao vivo, filmes e séries',
    `${screens} ${screens === 1 ? 'tela liberada' : 'telas liberadas ao mesmo tempo'}`,
    'Funciona no MaxPlayer e nos apps compatíveis',
    'Suporte pelo WhatsApp',
  ];
}

function buildDefaultPlans(): PaymentPlanRecord[] {
  const now = new Date().toISOString();
  const list: PaymentPlanRecord[] = [];
  for (const screens of [1, 2, 3]) {
    for (const months of [1, 3, 6, 12]) {
      list.push({
        id: `plan-${screens}t-${months}m`,
        name: defaultPlanName(screens, months),
        screens,
        months,
        price: DEFAULT_PLAN_PRICES[screens][months],
        active: true,
        recommended: screens === 2 && months === 3,
        features: defaultPlanFeatures(screens),
        updatedAt: now,
      });
    }
  }
  return list;
}

let paymentPlans: PaymentPlanRecord[] = [];

function savePlans() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PLANS_FILE, JSON.stringify(paymentPlans, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Planos] Falha ao salvar planos:', err);
  }
}

try {
  if (fs.existsSync(PLANS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(PLANS_FILE, 'utf-8'));
    if (Array.isArray(saved)) paymentPlans = saved;
  }
} catch { /* arquivo corrompido: usa o padrão */ }
if (paymentPlans.length === 0) {
  paymentPlans = buildDefaultPlans();
  savePlans();
}

function sortPlans(list: PaymentPlanRecord[]) {
  return [...list].sort((a, b) => a.screens - b.screens || a.months - b.months || a.price - b.price);
}

// Valida e normaliza os campos enviados pelo painel. Retorna erro em texto ou os campos limpos.
function parsePlanInput(body: any, base?: PaymentPlanRecord): { error: string } | { plan: Omit<PaymentPlanRecord, 'id' | 'updatedAt'> } {
  const screens = body?.screens !== undefined ? Number(body.screens) : base?.screens;
  const months = body?.months !== undefined ? Number(body.months) : base?.months;
  const price = body?.price !== undefined ? Math.round(Number(body.price) * 100) / 100 : base?.price;

  if (!Number.isInteger(screens) || screens! < 1 || screens! > 10) return { error: 'Telas deve ser um número inteiro de 1 a 10.' };
  if (!Number.isInteger(months) || months! < 1 || months! > 36) return { error: 'Meses deve ser um número inteiro de 1 a 36.' };
  if (!Number.isFinite(price) || price! <= 0 || price! > 100000) return { error: 'Informe um preço válido maior que zero.' };

  const rawName = body?.name !== undefined ? String(body.name).trim() : base?.name || '';
  const name = (rawName || defaultPlanName(screens!, months!)).slice(0, 80);

  let features = base?.features || defaultPlanFeatures(screens!);
  if (body?.features !== undefined) {
    if (!Array.isArray(body.features)) return { error: 'Benefícios devem ser uma lista.' };
    features = body.features.map((f: unknown) => String(f).trim().slice(0, 120)).filter(Boolean).slice(0, 10);
    if (features.length === 0) features = defaultPlanFeatures(screens!);
  }

  return {
    plan: {
      name,
      screens: screens!,
      months: months!,
      price: price!,
      active: body?.active !== undefined ? Boolean(body.active) : base?.active ?? true,
      recommended: body?.recommended !== undefined ? Boolean(body.recommended) : base?.recommended ?? false,
      features,
    },
  };
}

// Público: planos ativos para a área do cliente
app.get('/api/plans', (_req: Request, res: Response) => {
  res.json({ plans: sortPlans(paymentPlans.filter((p) => p.active)) });
});

// Admin: todos os planos, inclusive os desativados
app.get('/api/admin/plans', (_req: Request, res: Response) => {
  res.json({ plans: sortPlans(paymentPlans) });
});

app.post('/api/admin/plans', (req: Request, res: Response) => {
  const parsed = parsePlanInput(req.body);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });
  const plan: PaymentPlanRecord = {
    id: `plan-${Date.now()}`,
    ...parsed.plan,
    updatedAt: new Date().toISOString(),
  };
  paymentPlans.push(plan);
  savePlans();
  res.status(201).json({ plan });
});

app.put('/api/admin/plans/:id', (req: Request, res: Response) => {
  const idx = paymentPlans.findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Plano não encontrado.' });
  const parsed = parsePlanInput(req.body, paymentPlans[idx]);
  if ('error' in parsed) return res.status(400).json({ error: parsed.error });
  paymentPlans[idx] = { ...paymentPlans[idx], ...parsed.plan, updatedAt: new Date().toISOString() };
  savePlans();
  res.json({ plan: paymentPlans[idx] });
});

app.delete('/api/admin/plans/:id', (req: Request, res: Response) => {
  const before = paymentPlans.length;
  paymentPlans = paymentPlans.filter((p) => p.id !== req.params.id);
  if (paymentPlans.length === before) return res.status(404).json({ error: 'Plano não encontrado.' });
  savePlans();
  res.json({ success: true });
});

// 2. Create immediate PIX charge
app.post('/api/pix/create-charge', async (req: Request, res: Response) => {
  try {
    const { amount, invoiceId, clientId, clientName, description, planId } = req.body;
    // Compra de plano: o preço vem do cadastro de planos, não do navegador
    const plan = !invoiceId && planId ? paymentPlans.find((p) => p.id === planId && p.active) : undefined;
    if (!invoiceId && planId && !plan) {
      return res.status(400).json({ success: false, error: 'Este plano não está mais disponível. Atualize a página e escolha outro.' });
    }
    const finalAmount = plan ? plan.price : parseFloat(amount) || 35.00;
    // Efí requires 26-35 alphanumeric characters for the charge id.
    const txid = `ZX${Date.now()}${Math.random().toString(36).slice(2).toUpperCase().padEnd(11, '0')}`.replace(/[^A-Za-z0-9]/g, '').slice(0, 32).padEnd(26, '0');
    const chargeLabel = String(description || `Zuxo Player - ${clientName || 'Assinatura'}`).slice(0, 140);

    // 1. Real charge on the Efí Pix API (payment is confirmed by the bank).
    let pixCopiaECola = '';
    let createdOnEfi = false;
    if (EFI_API_ENABLED) {
      try {
        const cob = await efiApi('PUT', `/v2/cob/${txid}`, {
          calendario: { expiracao: 3600 },
          valor: { original: finalAmount.toFixed(2) },
          chave: EFIBANK_PIX_KEY,
          solicitacaoPagador: chargeLabel,
        });
        if (cob.status === 201 || cob.status === 200) {
          pixCopiaECola = cob.data.pixCopiaECola || '';
          if (!pixCopiaECola && cob.data.loc?.id) {
            const qr = await efiApi('GET', `/v2/loc/${cob.data.loc.id}/qrcode`);
            pixCopiaECola = qr.data?.qrcode || '';
          }
          createdOnEfi = Boolean(pixCopiaECola);
        } else {
          console.warn(`[Efí Pix] Cobrança recusada (HTTP ${cob.status}):`, JSON.stringify(cob.data).slice(0, 300));
        }
      } catch (err) {
        console.warn('[Efí Pix] Falha ao criar cobrança:', (err as Error).message);
      }
    }

    // 2. Fallback: static code from the Pix key. It can be paid, but only confirmed by hand.
    if (!pixCopiaECola) {
      pixCopiaECola = buildPixPayload(EFIBANK_PIX_KEY, finalAmount, txid, chargeLabel);
    }

    const qrCodeDataUrl = await QRCode.toDataURL(pixCopiaECola, {
      width: 320,
      margin: 2,
      color: {
        dark: '#030907',
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    });

    const record: PixChargeRecord = {
      txid,
      invoiceId,
      clientId,
      planId: plan?.id,
      amount: finalAmount,
      description: description || `Assinatura Zuxo Player VIP`,
      pixCopiaECola,
      status: 'ATIVA',
      createdAt: new Date().toISOString(),
      efi: createdOnEfi
    };

    activeCharges.set(txid, record);
    saveChargesToDisk();

    res.json({
      success: true,
      provider: 'Efí Bank',
      txid,
      pixKey: EFIBANK_PIX_KEY,
      amount: finalAmount,
      pixCopiaECola,
      qrCodeDataUrl,
      autoConfirm: createdOnEfi,
      status: 'ATIVA',
      expiresInSeconds: 3600,
      createdAt: record.createdAt
    });
  } catch (error: any) {
    console.error('Error creating Efí Bank Pix charge:', error);
    res.status(500).json({
      success: false,
      error: error?.message || 'Erro ao gerar cobrança PIX via Efí Bank'
    });
  }
});

// 3. Check PIX charge payment status by txid
app.get('/api/pix/check-status/:txid', async (req: Request, res: Response) => {
  const { txid } = req.params;
  const charge = activeCharges.get(txid);
  if (charge) await refreshChargeFromEfi(charge);

  if (!charge) {
    return res.json({
      txid,
      status: 'ATIVA',
      paid: false,
      message: 'Aguardando pagamento pelo aplicativo do seu banco...'
    });
  }

  res.json({
    txid: charge.txid,
    invoiceId: charge.invoiceId,
    clientId: charge.clientId,
    status: charge.status,
    paid: charge.status === 'CONCLUIDA',
    applied: Boolean(charge.appliedAt),
    expirationDate: charge.newExpirationDate,
    amount: charge.amount,
    paidAt: charge.paidAt,
    message: charge.status === 'CONCLUIDA' ? 'Pagamento confirmado pelo Efí Bank!' : 'Aguardando pagamento...'
  });
});

// 4. Check latest PIX charge status for a specific client (for auto-polling across app)
app.get('/api/pix/latest-user-charge/:clientId', async (req: Request, res: Response) => {
  const { clientId } = req.params;
  const list = Array.from(activeCharges.values())
    .filter((c) => c.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  // The client may have paid an earlier code: check the open ones from the last hours with Efí.
  for (const c of list.slice(0, 3)) {
    if (Date.now() - new Date(c.createdAt).getTime() < 2 * 3600_000) await refreshChargeFromEfi(c);
  }
  const paidRecently = list.find((c) => c.status === 'CONCLUIDA' && c.paidAt && Date.now() - new Date(c.paidAt).getTime() < 10 * 60_000);
  if (paidRecently) list.unshift(paidRecently);

  if (list.length === 0) {
    return res.json({ found: false, paid: false });
  }

  const latest = list[0];
  res.json({
    found: true,
    txid: latest.txid,
    invoiceId: latest.invoiceId,
    clientId: latest.clientId,
    status: latest.status,
    paid: latest.status === 'CONCLUIDA',
    amount: latest.amount,
    paidAt: latest.paidAt,
    createdAt: latest.createdAt
  });
});

// 5. (removed) Payments are no longer confirmed on request: only Efí can mark a charge as paid.

// 6. Webhook from Efí: the body is only a hint. Each charge is confirmed by asking Efí itself.
app.post('/api/pix/webhook', async (req: Request, res: Response) => {
  const items = Array.isArray(req.body?.pix) ? req.body.pix : [];
  for (const item of items) {
    const charge = item?.txid ? activeCharges.get(String(item.txid)) : undefined;
    if (charge) {
      lastEfiCheck.delete(charge.txid);
      await refreshChargeFromEfi(charge);
    }
  }
  res.status(200).send('OK');
});

// 7. Get recent charges and transactions
app.get('/api/pix/recent-payments', (req: Request, res: Response) => {
  const all = Array.from(activeCharges.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  res.json({
    total: all.length,
    active: all.filter((c) => c.status === 'ATIVA'),
    completed: all.filter((c) => c.status === 'CONCLUIDA'),
    all
  });
});


// --- WHATSAPP BOT ---
const EVO_API_URL = process.env.EVO_API_URL || '';
const EVO_API_KEY = process.env.EVO_API_KEY || '';
const EVO_INSTANCE = process.env.EVO_INSTANCE || 'zuxo-atendimento';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || '';

interface WaReceiptAlert {
  id: string;
  clientPhone: string;
  clientName: string;
  imageBase64?: string;
  aiAnalysis: string;
  createdAt: string;
  read: boolean;
}

const WA_ALERTS_FILE = path.resolve(DATA_DIR, 'whatsapp_alerts.json');
const waAlerts: WaReceiptAlert[] = [];

function loadWaAlerts() {
  try {
    if (fs.existsSync(WA_ALERTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(WA_ALERTS_FILE, 'utf-8')) as WaReceiptAlert[];
      waAlerts.push(...data);
    }
  } catch { /* ignore */ }
}

function saveWaAlerts() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WA_ALERTS_FILE, JSON.stringify(waAlerts, null, 2), 'utf-8');
  } catch { /* ignore */ }
}

loadWaAlerts();

// Liga/pausa o atendente de IA pelo painel (persistido em disco)
const WA_SETTINGS_FILE = path.resolve(DATA_DIR, 'whatsapp_bot_settings.json');
const waBotSettings: { enabled: boolean; updatedAt: string | null } = { enabled: true, updatedAt: null };

try {
  if (fs.existsSync(WA_SETTINGS_FILE)) {
    const saved = JSON.parse(fs.readFileSync(WA_SETTINGS_FILE, 'utf-8'));
    if (typeof saved?.enabled === 'boolean') waBotSettings.enabled = saved.enabled;
    if (typeof saved?.updatedAt === 'string') waBotSettings.updatedAt = saved.updatedAt;
  }
} catch { /* ignore */ }

function saveWaBotSettings() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(WA_SETTINGS_FILE, JSON.stringify(waBotSettings, null, 2), 'utf-8');
  } catch { /* ignore */ }
}

async function sendWaText(phone: string, text: string) {
  try {
    const r = await fetch(`${EVO_API_URL}/message/sendText/${EVO_INSTANCE}`, {
      method: 'POST',
      headers: { apikey: EVO_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: phone, text }),
    });
    if (!r.ok) console.error(`[WA Bot] sendText ${r.status} para ${phone}:`, await r.text());
  } catch (err) {
    console.error('[WA Bot] sendText failed:', err);
  }
}

async function deepseekChat(messages: { role: string; content: any }[]): Promise<string> {
  if (!DEEPSEEK_API_KEY) return '';
  const resp = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${DEEPSEEK_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 500, temperature: 0.7 }),
  });
  const data = (await resp.json()) as any;
  return data?.choices?.[0]?.message?.content || '';
}

async function checkReceiptWithAI(base64: string, mime: string): Promise<{ isReceipt: boolean; details: string }> {
  if (!DEEPSEEK_API_KEY) return { isReceipt: true, details: 'Sem API key — imagem salva para revisão manual.' };
  try {
    const reply = await deepseekChat([{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
        { type: 'text', text: 'Essa imagem é um comprovante de pagamento (PIX, transferência bancária, boleto pago, recibo)? Responda APENAS: SIM - [descrição breve] ou NÃO - [motivo].' },
      ],
    }]);
    return { isReceipt: reply.trim().toUpperCase().startsWith('SIM'), details: reply.trim() };
  } catch {
    // Vision não disponível: assumir que é comprovante para não perder nada
    return { isReceipt: true, details: 'Análise de imagem indisponível — salvo para revisão manual.' };
  }
}

interface WaLine {
  username: string;
  plan: string;
  expDate: string;
  status: number;
  isTrial: number;
  maxConnections: number;
  // Fica só no servidor: a IA escreve [[SENHA:usuario]] e fillWaPasswords troca pela senha real
  password: string;
  byPhone: boolean;
}

interface WaSession {
  history: { role: 'user' | 'assistant'; content: string }[];
  usernames: Set<string>;
  lines: WaLine[];
  fetchedAt: number;
  lastSeen: number;
}

const waSessions = new Map<string, WaSession>();
const WA_SESSION_IDLE_MS = 2 * 60 * 60 * 1000;
const WA_LINES_TTL_MS = 5 * 60 * 1000;
const WA_HISTORY_MAX = 12;

function getWaSession(phone: string): WaSession {
  const now = Date.now();
  let s = waSessions.get(phone);
  if (!s || now - s.lastSeen > WA_SESSION_IDLE_MS) {
    s = { history: [], usernames: new Set(), lines: [], fetchedAt: 0, lastSeen: now };
    waSessions.set(phone, s);
  }
  s.lastSeen = now;
  return s;
}

// WhatsApp costuma omitir o nono dígito (55 88 9375-9083); o WManage guarda com ele
function normalizeBrPhone(raw: string): string {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = '55' + d;
  if (d.startsWith('55') && d.length === 12) d = d.slice(0, 4) + '9' + d.slice(4);
  return d;
}

function toWaLine(item: any, byPhone: boolean): WaLine {
  return {
    username: item.username,
    plan: item.plan?.name || '',
    expDate: item.exp_date,
    status: item.status,
    isTrial: item.is_trial,
    maxConnections: item.max_connections,
    password: item.password || '',
    byPhone,
  };
}

// Senha só vai para o WhatsApp cadastrado na própria linha; quem só digitou o usuário não recebe
function fillWaPasswords(text: string, lines: WaLine[]): string {
  return text.replace(/\[\[SENHA:([^\]]+)\]\]/g, (_m, user: string) => {
    const line = lines.find((l) => l.username.toLowerCase() === user.trim().toLowerCase());
    return line?.byPhone && line.password
      ? line.password
      : '(por segurança, a senha só é enviada para o WhatsApp cadastrado na conta)';
  });
}

async function searchWzLines(term: string, perPage = 10): Promise<any[]> {
  try {
    const { status, json } = await wzFetch('GET', `/lines?${new URLSearchParams({ generalSearch: term, quantityPerPage: String(perPage) })}`);
    if (status !== 200) {
      console.error(`[WA Bot] WManage busca "${term}" retornou ${status}`);
      return [];
    }
    return Array.isArray(json?.items) ? json.items : [];
  } catch (err) {
    console.error('[WA Bot] WManage busca falhou:', err);
    return [];
  }
}

async function findLinesByPhone(phone: string): Promise<WaLine[]> {
  const digits = phone.replace(/@.*/, '').replace(/\D/g, '');
  if (digits.length < 8) return [];
  const target = normalizeBrPhone(digits);
  // Últimos 8 dígitos acham "5588993759083"; últimos 4 acham formatados como "+55 88 99708-8198"
  const [a, b] = await Promise.all([searchWzLines(digits.slice(-8)), searchWzLines(digits.slice(-4), 50)]);
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((i) => i.whatsapp && normalizeBrPhone(i.whatsapp) === target && !seen.has(i.username) && seen.add(i.username))
    .map((i) => toWaLine(i, true));
}

async function findLineByUsername(username: string): Promise<WaLine | null> {
  const items = await searchWzLines(username);
  const hit = items.find((i) => String(i.username).toLowerCase() === username.toLowerCase());
  return hit ? toWaLine(hit, false) : null;
}

// Palavras com letra e número (ex.: b19h749) ou a palavra logo após "usuário"/"login"/"user"
function usernameCandidates(text: string): string[] {
  const out = new Set<string>();
  const afterKeyword = text.match(/(?:usu[aá]rio|login|user)\s*(?:[ée]|:)?\s*([a-z0-9._-]{3,40})/i);
  if (afterKeyword) out.add(afterKeyword[1]);
  for (const t of text.match(/[a-z0-9._-]{4,40}/gi) || []) {
    if (/[a-z]/i.test(t) && /\d/.test(t)) out.add(t);
  }
  return [...out].slice(0, 3);
}

async function resolveWaLines(session: WaSession, phone: string, text: string) {
  if (Date.now() - session.fetchedAt > WA_LINES_TTL_MS) {
    const byPhone = await findLinesByPhone(phone);
    const byUser = await Promise.all([...session.usernames].map(findLineByUsername));
    const all = [...byPhone, ...byUser.filter((l): l is WaLine => !!l)];
    session.lines = all.filter((l, i) => all.findIndex((o) => o.username === l.username) === i);
    session.fetchedAt = Date.now();
  }
  const known = new Set(session.lines.map((l) => l.username.toLowerCase()));
  for (const cand of usernameCandidates(text)) {
    if (known.has(cand.toLowerCase())) continue;
    const line = await findLineByUsername(cand);
    if (line) {
      session.usernames.add(line.username);
      session.lines.push(line);
      known.add(line.username.toLowerCase());
    }
  }
}

function describeWaLines(lines: WaLine[]): string {
  if (!lines.length) {
    return 'CLIENTE NÃO IDENTIFICADO: o número dele não está cadastrado e ele ainda não informou um usuário válido. ' +
      'Se a pergunta for sobre a conta dele (vencimento, plano, renovação, acesso), peça o nome de usuário de acesso.';
  }
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const rows = lines.map((l) => {
    const days = Math.ceil((new Date(l.expDate).getTime() - Date.now()) / 86400000);
    const situacao = l.status === 0 ? 'BLOQUEADO' : days < 0 ? 'VENCIDO' : 'ativo';
    const prazo = days < 0 ? `venceu em ${fmt(l.expDate)} (há ${-days} dia(s))` : `vence em ${fmt(l.expDate)} (faltam ${days} dia(s))`;
    const senha = l.byPhone
      ? `Senha: pode enviar escrevendo exatamente [[SENHA:${l.username}]]`
      : 'Senha: NÃO pode enviar (identificado só pelo usuário digitado, não pelo WhatsApp cadastrado)';
    return `- Usuário: ${l.username} | Plano: ${l.plan || 'não informado'} | Telas: ${l.maxConnections} | Situação: ${situacao}${l.isTrial ? ' (teste)' : ''} | ${prazo} | ${senha}`;
  });
  return `CLIENTE IDENTIFICADO — dados consultados agora no servidor:\n${rows.join('\n')}`;
}

// Webhook receptor da Evolution API
app.post('/webhook/whatsapp', async (req: Request, res: Response) => {
  res.status(200).send('OK'); // Responde imediatamente

  const payload = req.body;
  // Evolution v2 envia "messages.upsert"; v1 enviava "MESSAGES_UPSERT"
  const event = String(payload?.event || '').toLowerCase().replace('_', '.');
  if (event !== 'messages.upsert') return;

  // Suporta formato v1 (data.messages[]) e v2 (data é a mensagem)
  const messages: any[] = Array.isArray(payload.data?.messages)
    ? payload.data.messages
    : payload.data
      ? [payload.data]
      : [];

  for (const msg of messages) {
    if (msg?.key?.fromMe) continue;
    if (msg?.key?.remoteJid?.endsWith('@g.us')) continue; // Ignora grupos

    // Contatos com ID de privacidade (@lid) só aceitam resposta pelo número real em remoteJidAlt
    const jid: string = msg.key?.remoteJid || '';
    const phone: string = jid.endsWith('@lid')
      ? msg.key?.remoteJidAlt || msg.key?.senderPn || jid
      : jid;
    const name: string = msg.pushName || 'Cliente';

    try {
      const hasImage = msg.message?.imageMessage || msg.message?.documentMessage;
      const textContent: string =
        msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

      if (hasImage) {
        // Baixar mídia
        let base64 = '';
        let mime = 'image/jpeg';
        try {
          const mediaResp = await fetch(
            `${EVO_API_URL}/chat/getBase64FromMediaMessage/${EVO_INSTANCE}`,
            {
              method: 'POST',
              headers: { apikey: EVO_API_KEY, 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: { key: msg.key, message: msg.message } }),
            }
          );
          const mediaData = (await mediaResp.json()) as any;
          base64 = mediaData?.base64 || '';
          mime = mediaData?.mimetype || mime;
        } catch { /* download falhou */ }

        const { isReceipt, details } = await checkReceiptWithAI(base64, mime);
        // Pausado: o comprovante ainda vai para o painel, mas o bot não responde nada
        const botOn = waBotSettings.enabled;

        if (isReceipt) {
          const session = getWaSession(phone);
          await resolveWaLines(session, phone, '');
          const users = session.lines.map((l) => l.username).join(', ');
          const alert: WaReceiptAlert = {
            id: `wa-${Date.now()}`,
            clientPhone: phone,
            clientName: users ? `${name} (usuário: ${users})` : name,
            imageBase64: base64 || undefined,
            aiAnalysis: details,
            createdAt: new Date().toISOString(),
            read: false,
          };
          waAlerts.push(alert);
          saveWaAlerts();
          console.log(`[WA Bot] Comprovante recebido de ${name} (${phone})`);
          if (botOn) await sendWaText(phone, `✅ Comprovante recebido, ${name}! Obrigado. Vamos verificar e liberar seu acesso em breve. Se tiver dúvidas, é só perguntar!`);
        } else if (botOn) {
          await sendWaText(phone, `Olá, ${name}! Recebi sua imagem. Se for um comprovante de pagamento, pode me enviar novamente em boa resolução. Para dúvidas sobre planos ou instalação dos apps, é só perguntar! 😊`);
        }
      } else if (textContent) {
        if (!waBotSettings.enabled) continue; // Atendente pausado: um humano responde pelo WhatsApp

        if (!DEEPSEEK_API_KEY) {
          await sendWaText(phone, `Olá, ${name}! Recebemos sua mensagem. Um atendente humano vai responder em breve. 🙂`);
          continue;
        }

        const session = getWaSession(phone);
        await resolveWaLines(session, phone, textContent);

        const reply = await deepseekChat([
          {
            role: 'system',
            content:
              'Você é o atendente virtual da Zuxo Player, serviço de IPTV premium. ' +
              'Responda sempre em português brasileiro, de forma simpática, profissional e objetiva. ' +
              'Você pode ajudar com: planos de assinatura (mensal, trimestral, semestral, anual), ' +
              'instalação e configuração dos apps compatíveis (MaxPlayer, ZUXO Player, Quick Player, Quick Player PRO, QPlay, Big Player, GTV Player, Quick Plus+, RX Purple, CORTEX Player, UTM Play), ' +
              'acesso via Xtream Codes (provedor + usuário + senha fornecidos pelo admin), ' +
              'problemas de acesso, informações sobre pagamento via PIX. ' +
              'Seja conciso — máximo 3 parágrafos curtos. ' +
              'Use a formatação do WhatsApp: *negrito* com um asterisco de cada lado; não use ** nem títulos com #.\n\n' +
              'App recomendado: MaxPlayer. A ativação é feita direto no nosso painel; o cliente só instala e entra com o usuário e a senha da conta dele. ' +
              'Funciona em Android, iPhone/iPad, Smart TV Samsung e LG, Fire TV, Roku, Apple TV e Windows, com o mesmo login. Links:\n' +
              '- Android: https://play.google.com/store/apps/details?id=tv.maxplayer.android\n' +
              '- iPhone/iPad: https://apps.apple.com/app/maxplayer-iptv-player/id1660982028\n' +
              '- Outros aparelhos: procurar "MaxPlayer" (sem espaço) na loja do aparelho, ou ver https://maxplayer.tv/pt\n' +
              'Não mande o cliente criar conta nem pagar no site do MaxPlayer: o acesso já vem com a assinatura Zuxo.\n\n' +
              `Nome do contato no WhatsApp: ${name}\n` +
              describeWaLines(session.lines) + '\n\n' +
              'Regras sobre a conta do cliente:\n' +
              '- Use somente os dados acima; nunca invente vencimento, plano ou situação.\n' +
              '- Quando o cliente estiver identificado, trate-o pelo usuário e responda direto sobre vencimento, plano e telas.\n' +
              '- Se tiver mais de um usuário, cite todos ou pergunte de qual ele está falando.\n' +
              '- Conta VENCIDA ou perto de vencer: explique que a renovação é por PIX e que ele pode enviar o comprovante aqui mesmo.\n' +
              '- Conta BLOQUEADA: diga que um atendente humano vai verificar.\n' +
              '- Para passar os dados de acesso (por exemplo, para entrar no MaxPlayer), envie o usuário e, onde for a senha, escreva exatamente o marcador indicado na linha do cliente, como [[SENHA:usuario]]. Nunca escreva uma senha por conta própria.\n' +
              '- Se a linha disser que a senha NÃO pode ser enviada, explique que por segurança a senha só é enviada para o WhatsApp cadastrado na conta e que um atendente humano pode ajudar.\n' +
              '- Você não renova, não desbloqueia e não altera contas; para isso, encaminhe para um atendente humano.',
          },
          ...session.history,
          { role: 'user', content: textContent },
        ]);

        if (reply) {
          session.history.push({ role: 'user', content: textContent }, { role: 'assistant', content: reply });
          session.history.splice(0, Math.max(0, session.history.length - WA_HISTORY_MAX));
          await sendWaText(phone, fillWaPasswords(reply, session.lines));
        }
      }
    } catch (err) {
      console.error(`[WA Bot] Erro ao processar mensagem de ${phone}:`, err);
    }
  }
});

// Admin: estado do atendente de IA (ativo/pausado)
app.get('/api/whatsapp/bot-status', (_req: Request, res: Response) => {
  res.json(waBotSettings);
});

app.post('/api/whatsapp/bot-status', (req: Request, res: Response) => {
  if (typeof req.body?.enabled !== 'boolean') {
    return res.status(400).json({ error: 'Envie { enabled: true | false }' });
  }
  waBotSettings.enabled = req.body.enabled;
  waBotSettings.updatedAt = new Date().toISOString();
  saveWaBotSettings();
  console.log(`[WA Bot] Atendente ${waBotSettings.enabled ? 'ATIVADO' : 'PAUSADO'} pelo painel`);
  res.json(waBotSettings);
});

// Admin: listar alertas de comprovantes não lidos
app.get('/api/whatsapp/alerts', (_req: Request, res: Response) => {
  const unread = waAlerts
    .filter((a) => !a.read)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map(({ imageBase64: _, ...rest }) => rest); // Omite base64 na listagem
  res.json({ alerts: unread, total: waAlerts.length });
});

// Admin: marcar alerta como lido
app.post('/api/whatsapp/alerts/:id/read', (req: Request, res: Response) => {
  const alert = waAlerts.find((a) => a.id === req.params.id);
  if (alert) { alert.read = true; saveWaAlerts(); }
  res.json({ success: true });
});

// Admin: obter imagem do comprovante
app.get('/api/whatsapp/alerts/:id/image', (req: Request, res: Response) => {
  const alert = waAlerts.find((a) => a.id === req.params.id);
  if (!alert?.imageBase64) return res.status(404).json({ error: 'Imagem não encontrada' });
  const buf = Buffer.from(alert.imageBase64, 'base64');
  res.setHeader('Content-Type', 'image/jpeg');
  res.send(buf);
});

// --- WMANAGE API PROXY ---
const WZ_BASE = 'https://mcapi.knewcms.com:2087';
const WZ_KEY = process.env.WZ_API_KEY || '';

function wzHeaders() {
  return { 'Authorization': `Bearer ${WZ_KEY}`, 'Content-Type': 'application/json' };
}

async function wzFetch(method: string, path: string, body?: unknown) {
  const opts: RequestInit = { method, headers: wzHeaders() };
  if (body !== undefined) opts.body = JSON.stringify(body);
  const r = await fetch(`${WZ_BASE}${path}`, opts);
  const json = await r.json().catch(() => ({}));
  return { status: r.status, json };
}

// GET /api/wmanage/clients?page=1&quantityPerPage=50&closeToExpire=true&generalSearch=...
app.get('/api/wmanage/clients', async (req: Request, res: Response) => {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(req.query)) {
    if (typeof v === 'string') params.set(k, v);
  }
  const { status, json } = await wzFetch('GET', `/lines?${params.toString()}`);
  res.status(status).json(json);
});

// GET /api/wmanage/clients/:id/activations
app.get('/api/wmanage/clients/:id/activations', async (req: Request, res: Response) => {
  const { status, json } = await wzFetch('GET', `/lines/app-activations/${req.params.id}`);
  res.status(status).json(json);
});

// POST /api/wmanage/clients/:id/extend   body: {days: number}
app.post('/api/wmanage/clients/:id/extend', async (req: Request, res: Response) => {
  const { status, json } = await wzFetch('PATCH', `/lines/v2/extend/${req.params.id}`, req.body);
  res.status(status).json(json);
});

// POST /api/wmanage/clients/:id/block
app.post('/api/wmanage/clients/:id/block', async (req: Request, res: Response) => {
  const { status, json } = await wzFetch('PATCH', `/lines/${req.params.id}`, { status: 0 });
  res.status(status).json(json);
});

// POST /api/wmanage/clients/:id/unblock
app.post('/api/wmanage/clients/:id/unblock', async (req: Request, res: Response) => {
  const { status, json } = await wzFetch('PATCH', `/lines/${req.params.id}`, { status: 1 });
  res.status(status).json(json);
});

// POST /api/wmanage/clients/:id/add48h
app.post('/api/wmanage/clients/:id/add48h', async (req: Request, res: Response) => {
  const { status, json } = await wzFetch('PATCH', `/lines/48-add/${req.params.id}`);
  res.status(status).json(json);
});

// --- VITE MIDDLEWARE SETUP ---
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (isProduction) {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Zuxo Efí Server] Running on http://0.0.0.0:${PORT} (Sandbox: ${EFIBANK_SANDBOX})`);
  });
}

startServer().catch((err) => {
  console.error('[Zuxo Efí Server] Failed to start:', err);
  process.exit(1);
});
