import { TrailerItem, ClientApp, ProgramItem, PaymentPlan, Invoice, UserProfile, SystemLog } from '../types';
import { CATALOG_TRAILERS } from './trailersCatalog';

// O catálogo de trailers (50 filmes + 50 séries) fica em ./trailersCatalog.ts
export const INITIAL_TRAILERS: TrailerItem[] = CATALOG_TRAILERS;

export const INITIAL_APPS: ClientApp[] = [
  {
    id: 'app-android',
    name: 'Zuxo Player para Android',
    platform: 'android',
    subtitle: 'Google Play Store Oficial (Celulares, Tablets e Android TV)',
    version: 'v3.5.4 (Mais Recente)',
    status: 'ativo',
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.zuxoplayer.app&hl=pt_BR',
    iconUrl: '/zuxo-logo.png',
    pairingCode: 'Código Instalação: 84920',
    instructions: [
      'Abra a Google Play Store pelo link oficial',
      'Instale o Zuxo Player no seu smartphone, tablet ou Android TV',
      'Insira seu Provedor, Usuário e Senha exibidos no topo da sua área'
    ]
  },
  {
    id: 'app-ios',
    name: 'Zuxo Player para iPhone & iPad',
    platform: 'ios',
    subtitle: 'Apple App Store Oficial (iOS 16, 17 e 18)',
    version: 'v3.5.2',
    status: 'ativo',
    downloadUrl: 'https://apps.apple.com/br/app/zuxo-player/id6782688104',
    iconUrl: '/zuxo-logo.png',
    pairingCode: 'ID App: ZX-IPHONE-VIP',
    instructions: [
      'Acesse a App Store oficial da Apple pelo link',
      'Baixe o Zuxo Player no seu iPhone ou iPad',
      'Conecte com seu Provedor, Usuário e Senha fornecidos no topo da sua tela'
    ]
  },
  {
    id: 'app-windows',
    name: 'Zuxo Player para Windows PC',
    platform: 'windows',
    subtitle: 'Microsoft Store Oficial (Windows 10 e 11)',
    version: 'v2.1.0',
    status: 'ativo',
    downloadUrl: 'https://apps.microsoft.com/detail/9nhbl2h0g9fv?hl=pt-BR&gl=BR',
    iconUrl: '/zuxo-logo.png',
    instructions: [
      'Abra a Microsoft Store oficial pelo link do botão',
      'Instale o aplicativo Zuxo Player no seu PC ou Notebook',
      'Faça login usando seu Provedor, Usuário e Senha cadastrados'
    ]
  },
  {
    id: 'app-macos',
    name: 'Zuxo Player para macOS',
    platform: 'web',
    subtitle: 'Mac App Store Oficial (MacBook, iMac e Mac Mini)',
    version: 'v2.0.1',
    status: 'ativo',
    downloadUrl: 'https://apps.apple.com/br/app/zuxo-player/id6782688104?platform=mac',
    iconUrl: '/zuxo-logo.png',
    instructions: [
      'Acesse a Mac App Store pelo link oficial',
      'Instale o Zuxo Player no seu macOS',
      'Digite seu Provedor, Usuário e Senha da Área do Cliente'
    ]
  },
  {
    id: 'app-smart-tv',
    name: 'Zuxo Player para Smart TV',
    platform: 'smart-tv',
    subtitle: 'LG (webOS), Samsung (Tizen), Roku e Google TV',
    version: 'v2.8.0',
    status: 'ativo',
    downloadUrl: 'https://zuxoplayer.online/smarttv',
    iconUrl: '/zuxo-logo.png',
    pairingCode: 'Código de Ativação: ZX-84920',
    instructions: [
      'Na loja da sua Smart TV (LG Content Store / Samsung Apps / Roku), busque por "Zuxo Player"',
      'Abra o app e digite o código de pareamento: ZX-84920',
      'Sua lista de canais e filmes será carregada automaticamente na TV'
    ]
  },
  {
    id: 'app-tvbox',
    name: 'Fire TV Stick & TV Box (Downloader)',
    platform: 'tv-box',
    subtitle: 'Amazon Fire TV Stick 4K, Xiaomi Mi Box, Aquário TV Box',
    version: 'v3.5.4',
    status: 'ativo',
    downloadUrl: 'https://zuxoplayer.online/downloads/zuxo-tvbox.apk',
    iconUrl: '/zuxo-logo.png',
    pairingCode: 'Código Downloader: 84920',
    instructions: [
      'Abra o aplicativo "Downloader" no seu Fire TV ou TV Box',
      'Digite apenas o código numérico: 84920',
      'O download e instalação do Zuxo Player iniciarão sozinhos'
    ]
  }
];

// Usado só se a API de planos não responder. Os planos reais são gerenciados no Painel Admin
// e o preço cobrado no PIX sempre vem do servidor (server.ts, DEFAULT_PLAN_PRICES).
const FALLBACK_PLAN_PRICES: Record<number, Record<number, number>> = {
  1: { 1: 35, 3: 95, 6: 180, 12: 330 },
  2: { 1: 50, 3: 135, 6: 260, 12: 480 },
  3: { 1: 65, 3: 175, 6: 330, 12: 620 },
};

export const INITIAL_PAYMENT_PLANS: PaymentPlan[] = [1, 2, 3].flatMap((screens) =>
  [1, 3, 6, 12].map((months) => ({
    id: `plan-${screens}t-${months}m`,
    name: `${screens} ${screens === 1 ? 'Tela' : 'Telas'} • ${months === 1 ? '1 mês' : `${months} meses`}`,
    screens,
    months,
    price: FALLBACK_PLAN_PRICES[screens][months],
    active: true,
    recommended: screens === 2 && months === 3,
    features: [
      'Canais ao vivo, filmes e séries',
      `${screens} ${screens === 1 ? 'tela liberada' : 'telas liberadas ao mesmo tempo'}`,
      'Funciona no MaxPlayer e nos apps compatíveis',
      'Suporte pelo WhatsApp',
    ],
  }))
);

export const INITIAL_INVOICES: Invoice[] = [
  {
    id: 'inv-2026-10',
    description: 'Fatura Mensalidade Atual - Zuxo VIP (Acesso Completo)',
    date: '15/10/2026',
    dueDate: '22/10/2026',
    amount: 35.00,
    status: 'pendente',
    paymentMethod: 'PIX Efí Bank',
    pixKey: 'fab4cde3-4367-4d0b-aa9b-4528dc04d371',
    clientId: 'usr-1',
  },
  {
    id: 'inv-2026-09',
    description: 'Renovação Zuxo VIP - Setembro 2026 (2 Telas)',
    date: '15/09/2026',
    dueDate: '15/09/2026',
    amount: 35.00,
    status: 'pago',
    paymentMethod: 'PIX Efí Bank',
    pixKey: 'fab4cde3-4367-4d0b-aa9b-4528dc04d371',
    clientId: 'usr-1',
  },
  {
    id: 'inv-2026-08',
    description: 'Renovação Zuxo VIP - Agosto 2026 (2 Telas)',
    date: '15/08/2026',
    dueDate: '15/08/2026',
    amount: 35.00,
    status: 'pago',
    paymentMethod: 'PIX Efí Bank',
    pixKey: 'fab4cde3-4367-4d0b-aa9b-4528dc04d371',
    clientId: 'usr-1',
  },
  {
    id: 'inv-2026-07',
    description: 'Ativação Zuxo VIP - Julho 2026',
    date: '15/07/2026',
    dueDate: '15/07/2026',
    amount: 35.00,
    status: 'pago',
    paymentMethod: 'PIX Efí Bank',
    pixKey: 'fab4cde3-4367-4d0b-aa9b-4528dc04d371',
    clientId: 'usr-1',
  }
];

export const INITIAL_CLIENTS: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Lucas Sousa',
    email: 'lrsousadesenvolvedor@gmail.com',
    whatsapp: '(11) 98849-2026',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300&auto=format&fit=crop',
    plan: 'Plano VIP 2 Telas',
    expirationDate: '18/11/2026',
    screens: 2,
    customPrice: 35.00,
    status: 'ativo',
    provider: 'http://dns.zuxoplayer.live:8080',
    username: 'lucas_sousa',
    notes: 'Conta Principal Master. Acesso oficial multitelas liberado.',
    createdAt: '2026-01-10',
    customApps: [
      {
        id: 'app-c1-1',
        name: 'Zuxo Player para Android',
        platform: 'android',
        subtitle: 'Google Play Store Oficial (Celulares, Tablets e Android TV)',
        version: 'v3.5.4',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://play.google.com/store/apps/details?id=com.zuxoplayer.app&hl=pt_BR',
        pairingCode: 'Código Instalação: 84920',
        instructions: [
          'Instale na Google Play Store pelo link oficial acima',
          'Insira seu Provedor, Usuário e Senha exibidos no topo da sua tela'
        ]
      },
      {
        id: 'app-c1-2',
        name: 'Zuxo Player para iPhone & iPad',
        platform: 'ios',
        subtitle: 'Apple App Store Oficial (iOS 16, 17 e 18)',
        version: 'v3.5.2',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://apps.apple.com/br/app/zuxo-player/id6782688104',
        pairingCode: 'ID App: ZX-IPHONE-VIP',
        instructions: [
          'Acesse o aplicativo Zuxo Player na Apple App Store',
          'Digite seu Provedor, Usuário e Senha fornecidos no topo da sua tela'
        ]
      },
      {
        id: 'app-c1-3',
        name: 'Zuxo Player para Windows PC',
        platform: 'windows',
        subtitle: 'Microsoft Store Oficial (Windows 10 e 11)',
        version: 'v2.1.0',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://apps.microsoft.com/detail/9nhbl2h0g9fv?hl=pt-BR&gl=BR',
        instructions: [
          'Baixe o app oficial na Microsoft Store',
          'Conecte com seus dados de acesso do Zuxo Player'
        ]
      },
      {
        id: 'app-c1-4',
        name: 'Zuxo Player para macOS',
        platform: 'web',
        subtitle: 'Mac App Store Oficial (MacBook, iMac e Mac Mini)',
        version: 'v2.0.1',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://apps.apple.com/br/app/zuxo-player/id6782688104?platform=mac',
        instructions: [
          'Instale o Zuxo Player na Mac App Store',
          'Insira seu Provedor, Usuário e Senha'
        ]
      }
    ]
  },
  {
    id: 'usr-2',
    name: 'Mariana Silva',
    email: 'mariana.silva89@gmail.com',
    whatsapp: '(21) 99123-4567',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop',
    plan: 'Plano 3 Telas Família',
    expirationDate: '22/11/2026',
    screens: 3,
    customPrice: 55.00,
    status: 'ativo',
    provider: 'http://dns.zuxoplayer.live:8080',
    username: 'mariana_silva',
    notes: 'Liberado 3 telas para FireStick da sala e quartos.',
    createdAt: '2026-02-15',
    customApps: [
      {
        id: 'app-c2-1',
        name: 'Fire TV Stick (Downloader Exclusivo)',
        platform: 'tv-box',
        subtitle: 'Para Amazon FireStick 4K',
        version: 'v3.5.4',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        pairingCode: 'Código Downloader: 84920',
        instructions: ['Abra o Downloader no FireStick', 'Digite o código: 84920', 'Aguarde a instalação e entre']
      },
      {
        id: 'app-c2-2',
        name: 'Zuxo Player para Windows PC',
        platform: 'windows',
        subtitle: 'Microsoft Store Oficial',
        version: 'v2.1.0',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://apps.microsoft.com/detail/9nhbl2h0g9fv?hl=pt-BR&gl=BR',
        instructions: ['Instale pela Microsoft Store', 'Entre com mariana_silva e sua senha']
      }
    ]
  },
  {
    id: 'usr-3',
    name: 'Carlos Mendes',
    email: 'carlosmendes.sp@outlook.com',
    whatsapp: '(31) 98765-4321',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=300&auto=format&fit=crop',
    plan: 'Plano Básico Individual',
    expirationDate: '25/10/2026',
    screens: 1,
    customPrice: 30.00,
    status: 'ativo',
    provider: 'http://dns.zuxoplayer.live:8080',
    username: 'carlos_mendes',
    notes: 'Utiliza Smart TV na sala. Vencimento próximo em 25/10.',
    createdAt: '2026-03-01',
    customApps: [
      {
        id: 'app-c3-1',
        name: 'Zuxo Smart TV Samsung',
        platform: 'smart-tv',
        subtitle: 'Código de pareamento exclusivo TV Sala',
        version: 'v2.8.0',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        pairingCode: 'Código Pareamento: ZX-CARLOS-77',
        instructions: ['Abra o Zuxo Player na Smart TV', 'Digite o código: ZX-CARLOS-77']
      }
    ]
  },
  {
    id: 'usr-4',
    name: 'Juliana Costa',
    email: 'juliana.costa.adv@gmail.com',
    whatsapp: '(41) 99887-6655',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=300&auto=format&fit=crop',
    plan: 'Plano Ultra 4 Telas',
    expirationDate: '22/10/2026',
    screens: 4,
    customPrice: 75.00,
    status: 'pendente',
    provider: 'http://dns.zuxoplayer.live:8080',
    username: 'juliana_costa',
    notes: 'Aguardando pagamento da fatura de renovação via PIX.',
    createdAt: '2026-01-20',
    customApps: [
      {
        id: 'app-c4-1',
        name: 'Zuxo Player Android & Smart TV',
        platform: 'android',
        subtitle: 'Versão multi-telas para a residência',
        version: 'v3.5.4',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://play.google.com/store/apps/details?id=com.zuxoplayer.app&hl=pt_BR',
        pairingCode: 'Código Familiar: 44880',
        instructions: ['Instale pelo link oficial da Google Play Store', 'Use seu Provedor, Usuário e Senha']
      }
    ]
  },
  {
    id: 'usr-5',
    name: 'Rodrigo Rocha',
    email: 'rodrigo.rocha.dev@gmail.com',
    whatsapp: '(19) 98112-3344',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=300&auto=format&fit=crop',
    plan: 'Plano Duo 2 Telas',
    expirationDate: '30/10/2026',
    screens: 2,
    customPrice: 45.00,
    status: 'ativo',
    provider: 'http://dns.zuxoplayer.live:8080',
    username: 'rodrigo_rocha',
    notes: 'Renovação todo dia 30.',
    createdAt: '2026-02-01',
    customApps: [
      {
        id: 'app-c5-1',
        name: 'Zuxo Player Android TV',
        platform: 'android',
        subtitle: 'Aplicativo Oficial Android TV',
        version: 'v3.5.4',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://play.google.com/store/apps/details?id=com.zuxoplayer.app&hl=pt_BR',
        pairingCode: 'Código TV: RR-9912',
        instructions: ['Abra o app na Android TV', 'Digite o código de pareamento: RR-9912']
      }
    ]
  },
  {
    id: 'usr-6',
    name: 'Amanda Ribeiro',
    email: 'amanda.ribeiro.rj@hotmail.com',
    whatsapp: '(21) 97722-1100',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=300&auto=format&fit=crop',
    plan: 'Plano Família 3 Telas',
    expirationDate: '28/11/2026',
    screens: 3,
    customPrice: 55.00,
    status: 'ativo',
    provider: 'http://dns.zuxoplayer.live:8080',
    username: 'amanda_ribeiro',
    notes: 'Utiliza Apple TV e iPhones da família.',
    createdAt: '2026-02-20',
    customApps: [
      {
        id: 'app-c6-1',
        name: 'Zuxo Player para iOS / iPadOS',
        platform: 'ios',
        subtitle: 'App Store Oficial Apple',
        version: 'v3.5.2',
        status: 'ativo',
        iconUrl: '/zuxo-logo.png',
        downloadUrl: 'https://apps.apple.com/br/app/zuxo-player/id6782688104',
        instructions: ['Instale o Zuxo Player pela App Store', 'Entre com usuário amanda_ribeiro e sua senha']
      }
    ]
  }
];

export const INITIAL_SYSTEM_LOGS: SystemLog[] = [
  {
    id: 'log-sys-01',
    action: 'subscription_renewal',
    severity: 'info',
    title: 'Renovação Manual de Assinatura',
    description: 'Assinatura do cliente "Camila Duarte" renovada manualmente por +30 dias após confirmação de pagamento PIX.',
    timestamp: '2026-10-18T08:15:22.000Z',
    adminUser: 'Administrador (Mestre)',
    targetClientId: 'usr-4',
    targetClientName: 'Camila Duarte',
    details: {
      previousExpiration: '25/04/2026',
      newExpiration: '25/05/2026',
      daysAdded: 30,
      screens: 2,
      newPrice: 35.00,
      reason: 'Comprovante PIX validado e sinal reativado'
    }
  },
  {
    id: 'log-sys-02',
    action: 'price_change',
    severity: 'warning',
    title: 'Alteração de Preço Individual',
    description: 'Valor da mensalidade do cliente "Rodrigo Rocha" alterado de R$ 35,00 para R$ 45,00 devido à adição de 1 tela simultânea.',
    timestamp: '2026-10-17T16:42:10.000Z',
    adminUser: 'Administrador (Mestre)',
    targetClientId: 'usr-5',
    targetClientName: 'Rodrigo Rocha',
    details: {
      previousPrice: 35.00,
      newPrice: 45.00,
      screens: 3,
      reason: 'Upgrade de 2 para 3 telas solicitadas pelo WhatsApp'
    }
  },
  {
    id: 'log-sys-03',
    action: 'client_delete',
    severity: 'critical',
    title: 'Exclusão Crítica de Cliente',
    description: 'Cliente "Felipe Teste Beta" (felipe.beta@teste.com) foi removido permanentemente da base de dados e credenciais revogadas.',
    timestamp: '2026-10-16T19:28:45.000Z',
    adminUser: 'Administrador (Mestre)',
    targetClientId: 'usr-test-old',
    targetClientName: 'Felipe Teste Beta',
    details: {
      email: 'felipe.beta@teste.com',
      previousPrice: 30.00,
      screens: 1,
      previousExpiration: '10/04/2026',
      reason: 'Conta de testes temporária descontinuada'
    }
  },
  {
    id: 'log-sys-04',
    action: 'subscription_renewal',
    severity: 'info',
    title: 'Renovação Manual de Assinatura',
    description: 'Assinatura do cliente "Marcos Silva" renovada manualmente por +30 dias com liberação imediata de 2 telas.',
    timestamp: '2026-10-15T11:05:00.000Z',
    adminUser: 'Administrador (Mestre)',
    targetClientId: 'usr-1',
    targetClientName: 'Marcos Silva',
    details: {
      previousExpiration: '15/04/2026',
      newExpiration: '15/05/2026',
      daysAdded: 30,
      screens: 2,
      newPrice: 35.00,
      reason: 'Renovação antecipada via PIX QR Code'
    }
  },
  {
    id: 'log-sys-05',
    action: 'price_change',
    severity: 'warning',
    title: 'Alteração de Preço Individual',
    description: 'Valor da assinatura de "Juliana Mendes" ajustado de R$ 60,00 para R$ 55,00 com aplicação de desconto de fidelidade anual.',
    timestamp: '2026-10-14T14:20:18.000Z',
    adminUser: 'Administrador (Mestre)',
    targetClientId: 'usr-2',
    targetClientName: 'Juliana Mendes',
    details: {
      previousPrice: 60.00,
      newPrice: 55.00,
      screens: 3,
      reason: 'Desconto fidelidade 3 telas'
    }
  },
  {
    id: 'log-sys-06',
    action: 'client_create',
    severity: 'info',
    title: 'Novo Cliente Cadastrado',
    description: 'Cliente "Amanda Ribeiro" cadastrada no plano VIP 4 Telas com apps oficiais para iOS e credenciais geradas.',
    timestamp: '2026-10-13T10:00:00.000Z',
    adminUser: 'Administrador (Mestre)',
    targetClientId: 'usr-6',
    targetClientName: 'Amanda Ribeiro',
    details: {
      email: 'amanda.ribeiro.rj@hotmail.com',
      newPrice: 65.00,
      screens: 4,
      provider: 'http://dns.zuxoplayer.live:8080'
    }
  }
];

