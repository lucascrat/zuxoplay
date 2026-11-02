/**
 * PIX BR Code (EMV QRCPS) Generator and Utilities
 * Generates valid Pix Copia e Cola payloads with CRC16 calculation and QR codes
 */
import QRCode from 'qrcode';

export interface PixKeyOption {
  type: 'email' | 'cnpj' | 'phone' | 'random';
  label: string;
  key: string;
  iconName: string;
}

export const DEFAULT_PIX_KEYS: PixKeyOption[] = [
  {
    type: 'random',
    label: 'Chave Oficial Efí Bank (Chave EVP)',
    key: 'fab4cde3-4367-4d0b-aa9b-4528dc04d371',
    iconName: 'Zap',
  },
  {
    type: 'email',
    label: 'Chave E-mail (Lucas Sousa)',
    key: 'lrsousadesenvolvedor@gmail.com',
    iconName: 'Mail',
  },
  {
    type: 'cnpj',
    label: 'Chave CNPJ',
    key: '48.291.849/0001-92',
    iconName: 'Building',
  },
  {
    type: 'phone',
    label: 'Chave Celular / WhatsApp',
    key: '+5511988492026',
    iconName: 'Smartphone',
  },
];

/**
 * Calculates standard CRC16 CCITT (0xFFFF, 0x1021)
 */
export function calculateCRC16(payload: string): string {
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

  const hex = (crc & 0xffff).toString(16).toUpperCase();
  return hex.padStart(4, '0');
}

function formatEmvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface GeneratePixOptions {
  pixKey: string;
  amount?: number;
  merchantName?: string;
  merchantCity?: string;
  txId?: string;
  description?: string;
}

/**
 * Generates the standard EMV BR Code string ("Pix Copia e Cola")
 */
export function generatePixPayload({
  pixKey,
  amount,
  merchantName = 'ZUXO STREAMING',
  merchantCity = 'SAO PAULO',
  txId = 'ZUXO' + Math.floor(1000 + Math.random() * 9000),
}: GeneratePixOptions): string {
  // Format key: remove punctuation if CNPJ or phone
  let cleanKey = pixKey.trim();
  if (cleanKey.includes('@')) {
    cleanKey = cleanKey.toLowerCase();
  } else if (/^[\d\s.\-/()]+$/.test(cleanKey)) {
    cleanKey = cleanKey.replace(/\D/g, '');
    if (cleanKey.length === 11 && !cleanKey.startsWith('55')) {
      cleanKey = '+55' + cleanKey;
    }
  }

  // 00 - Payload Format Indicator
  let payload = formatEmvField('00', '01');

  // 01 - Point of Initiation Method: 12 = Dynamic (with value), 11 = Static
  payload += formatEmvField('01', amount && amount > 0 ? '12' : '11');

  // 26 - Merchant Account Information (GUI + Key)
  const gui = formatEmvField('00', 'br.gov.bcb.pix');
  const keyField = formatEmvField('01', cleanKey);
  payload += formatEmvField('26', gui + keyField);

  // 52 - Merchant Category Code
  payload += formatEmvField('52', '0000');

  // 53 - Transaction Currency (986 = BRL)
  payload += formatEmvField('53', '986');

  // 54 - Transaction Amount
  if (amount && amount > 0) {
    const formattedAmount = amount.toFixed(2);
    payload += formatEmvField('54', formattedAmount);
  }

  // 58 - Country Code
  payload += formatEmvField('58', 'BR');

  // 59 - Merchant Name (max 25 chars)
  const cleanName = merchantName.slice(0, 25).toUpperCase();
  payload += formatEmvField('59', cleanName);

  // 60 - Merchant City (max 15 chars)
  const cleanCity = merchantCity.slice(0, 15).toUpperCase();
  payload += formatEmvField('60', cleanCity);

  // 62 - Additional Data Field Template (TxID)
  const cleanTxId = txId.replace(/[^A-Za-z0-9]/g, '').slice(0, 25) || '***';
  const txField = formatEmvField('05', cleanTxId);
  payload += formatEmvField('62', txField);

  // 63 - CRC16 prefix
  payload += '6304';

  // Calculate CRC
  const crc = calculateCRC16(payload);

  return payload + crc;
}

/**
 * Generates a base64 Data URL for a dynamic QR Code image
 */
export async function generateDynamicQrCodeDataUrl(
  text: string,
  options?: { width?: number; margin?: number; darkColor?: string; lightColor?: string }
): Promise<string> {
  const width = options?.width || 320;
  const margin = options?.margin || 2;
  const darkColor = options?.darkColor || '#030907';
  const lightColor = options?.lightColor || '#ffffff';

  return QRCode.toDataURL(text, {
    width,
    margin,
    color: {
      dark: darkColor,
      light: lightColor,
    },
    errorCorrectionLevel: 'M',
  });
}
