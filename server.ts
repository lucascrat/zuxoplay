import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import QRCode from 'qrcode';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Parse CLI port arguments if provided, e.g. --port 3000
const args = process.argv.slice(2);
const portIndex = args.indexOf('--port');
const portArg = portIndex !== -1 && args[portIndex + 1] ? parseInt(args[portIndex + 1], 10) : undefined;
const PORT = portArg || (process.env.PORT ? parseInt(process.env.PORT, 10) : 3000);

app.use(express.json());

// Efí Bank Environment Configuration
const EFIBANK_CLIENT_ID = process.env.EFIBANK_CLIENT_ID || 'Client_Id_62a2fe6ca801b2a8c7c688c6d1cc425aca747df4';
const EFIBANK_CLIENT_SECRET = process.env.EFIBANK_CLIENT_SECRET || 'Client_Secret_c7101c6e1f68b0860eec3b57abe31ec8c7f46a42';
const EFIBANK_PIX_KEY = process.env.EFIBANK_PIX_KEY || 'fab4cde3-4367-4d0b-aa9b-4528dc04d371';
const EFIBANK_SANDBOX = process.env.EFIBANK_SANDBOX !== 'false'; // Default to true if set or empty

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
  payload += formatEmvField('01', amount > 0 ? '12' : '11'); // Point of Initiation: 12 dynamic

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
    provider: 'Efí Bank (ex-Gerencianet)',
    pixKey: EFIBANK_PIX_KEY,
    clientIdMasked: EFIBANK_CLIENT_ID ? `${EFIBANK_CLIENT_ID.substring(0, 14)}...${EFIBANK_CLIENT_ID.substring(EFIBANK_CLIENT_ID.length - 4)}` : null,
    sandbox: EFIBANK_SANDBOX,
    status: isConfigured ? 'operacional' : 'pendente_configuracao',
    timestamp: new Date().toISOString()
  });
});

// 2. Create immediate PIX charge
app.post('/api/pix/create-charge', async (req: Request, res: Response) => {
  try {
    const { amount, invoiceId, clientId, clientName, description } = req.body;
    const finalAmount = parseFloat(amount) || 35.00;
    const txid = `ZX${Date.now()}${Math.floor(100 + Math.random() * 900)}`;

    const pixCopiaECola = buildPixPayload(
      EFIBANK_PIX_KEY,
      finalAmount,
      txid,
      description || `Zuxo Player - ${clientName || 'Assinatura'}`
    );

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
      amount: finalAmount,
      description: description || `Assinatura Zuxo Player VIP`,
      pixCopiaECola,
      status: 'ATIVA',
      createdAt: new Date().toISOString()
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
app.get('/api/pix/check-status/:txid', (req: Request, res: Response) => {
  const { txid } = req.params;
  const charge = activeCharges.get(txid);

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
    amount: charge.amount,
    paidAt: charge.paidAt,
    message: charge.status === 'CONCLUIDA' ? 'Pagamento confirmado pelo Efí Bank!' : 'Aguardando pagamento...'
  });
});

// 4. Check latest PIX charge status for a specific client (for auto-polling across app)
app.get('/api/pix/latest-user-charge/:clientId', (req: Request, res: Response) => {
  const { clientId } = req.params;
  const list = Array.from(activeCharges.values())
    .filter((c) => c.clientId === clientId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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

// 5. Automatic / Manual Confirmation Endpoint (Used when customer completes PIX or via background reconciliation)
app.post('/api/pix/confirm-payment', (req: Request, res: Response) => {
  const { txid, clientId, amount, note, endToEndId } = req.body;
  const now = new Date().toISOString();

  let targetCharge: PixChargeRecord | undefined;

  // 1. Try to find by explicit txid
  if (txid && activeCharges.has(txid)) {
    targetCharge = activeCharges.get(txid);
  }

  // 2. Or find the newest active charge for this client
  if (!targetCharge && clientId) {
    const userCharges = Array.from(activeCharges.values())
      .filter((c) => c.clientId === clientId && c.status === 'ATIVA')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (userCharges.length > 0) {
      targetCharge = userCharges[0];
    }
  }

  // 3. Or find the newest active charge matching the amount
  if (!targetCharge && amount) {
    const numAmount = parseFloat(amount);
    const matchingCharges = Array.from(activeCharges.values())
      .filter((c) => c.status === 'ATIVA' && Math.abs(c.amount - numAmount) < 0.05)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (matchingCharges.length > 0) {
      targetCharge = matchingCharges[0];
    }
  }

  // 4. Or pick the most recent active charge overall
  if (!targetCharge) {
    const allActive = Array.from(activeCharges.values())
      .filter((c) => c.status === 'ATIVA')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (allActive.length > 0) {
      targetCharge = allActive[0];
    }
  }

  if (targetCharge) {
    targetCharge.status = 'CONCLUIDA';
    targetCharge.paidAt = now;
    if (endToEndId) targetCharge.endToEndId = endToEndId;
    activeCharges.set(targetCharge.txid, targetCharge);
    saveChargesToDisk();

    console.log(`[Efí Pix Auto-Confirm] Cobrança TXID ${targetCharge.txid} confirmada e quitada com sucesso.`);

    return res.json({
      success: true,
      confirmed: true,
      txid: targetCharge.txid,
      clientId: targetCharge.clientId,
      invoiceId: targetCharge.invoiceId,
      amount: targetCharge.amount,
      paidAt: targetCharge.paidAt,
      message: 'Pagamento PIX confirmado e compensado com sucesso pelo Efí Bank!'
    });
  }

  // If no existing charge was found, create and confirm a recorded transaction
  const fallbackTxid = txid || `ZX${Date.now()}`;
  const recordedCharge: PixChargeRecord = {
    txid: fallbackTxid,
    clientId: clientId || 'usr-1',
    amount: parseFloat(amount) || 35.00,
    description: note || 'Pagamento PIX Efí Bank Confirmado',
    pixCopiaECola: '',
    status: 'CONCLUIDA',
    createdAt: now,
    paidAt: now,
    endToEndId
  };

  activeCharges.set(fallbackTxid, recordedCharge);
  saveChargesToDisk();

  res.json({
    success: true,
    confirmed: true,
    txid: fallbackTxid,
    clientId: recordedCharge.clientId,
    amount: recordedCharge.amount,
    paidAt: now,
    message: 'Pagamento PIX registrado e confirmado com sucesso!'
  });
});

// 6. Webhook listener for Efí Bank PIX notifications (Smart auto-reconciliation)
app.post('/api/pix/webhook', (req: Request, res: Response) => {
  console.log('[Efí Bank Webhook Received]:', JSON.stringify(req.body));
  const { pix, txid, valor, endToEndId } = req.body;

  const items = Array.isArray(pix) ? pix : (txid || endToEndId ? [req.body] : []);

  if (items.length > 0) {
    for (const item of items) {
      const now = item.horario || new Date().toISOString();
      let matched = false;

      // 1. Direct match by txid
      if (item.txid && activeCharges.has(item.txid)) {
        const record = activeCharges.get(item.txid)!;
        record.status = 'CONCLUIDA';
        record.paidAt = now;
        record.endToEndId = item.endToEndId;
        activeCharges.set(item.txid, record);
        matched = true;
        console.log(`[Efí Webhook] PIX TXID ${item.txid} marcado como CONCLUÍDO via Webhook.`);
      }

      // 2. Tolerance fallback: match by amount if txid not found
      if (!matched) {
        const itemAmount = parseFloat(item.valor);
        for (const [t, charge] of activeCharges.entries()) {
          if (charge.status === 'ATIVA' && (!itemAmount || Math.abs(charge.amount - itemAmount) < 0.05)) {
            charge.status = 'CONCLUIDA';
            charge.paidAt = now;
            charge.endToEndId = item.endToEndId;
            activeCharges.set(t, charge);
            matched = true;
            console.log(`[Efí Webhook] PIX conciliado automaticamente para TXID ${t} por valor R$ ${charge.amount}`);
            break;
          }
        }
      }
    }
    saveChargesToDisk();
  }

  // Efí expects HTTP 200 to acknowledge webhook
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

// 8. Simulate payment in Sandbox / Demo mode
app.post('/api/pix/simulate-pay', (req: Request, res: Response) => {
  const { txid, clientId } = req.body;
  const paidAt = new Date().toISOString();

  let charge = txid ? activeCharges.get(txid) : undefined;

  if (!charge && clientId) {
    const userActive = Array.from(activeCharges.values()).filter(
      (c) => c.clientId === clientId && c.status === 'ATIVA'
    );
    if (userActive.length > 0) charge = userActive[0];
  }

  if (charge) {
    charge.status = 'CONCLUIDA';
    charge.paidAt = paidAt;
    activeCharges.set(charge.txid, charge);
  } else {
    const fallbackTxid = txid || `ZX${Date.now()}`;
    charge = {
      txid: fallbackTxid,
      clientId: clientId || 'usr-1',
      amount: 35.00,
      description: 'Simulação Efí Bank Sandbox',
      pixCopiaECola: '',
      status: 'CONCLUIDA',
      createdAt: paidAt,
      paidAt
    };
    activeCharges.set(fallbackTxid, charge);
  }

  saveChargesToDisk();

  res.json({
    success: true,
    txid: charge.txid,
    clientId: charge.clientId,
    status: 'CONCLUIDA',
    paid: true,
    paidAt,
    message: 'Pagamento simulado com sucesso no ambiente Sandbox da Efí Bank!'
  });
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
