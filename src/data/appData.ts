import { TrailerItem, ClientApp, ProgramItem, PaymentPlan, Invoice, UserProfile, SystemLog } from '../types';

export const INITIAL_TRAILERS: TrailerItem[] = [
  // --- FILMES LANÇAMENTOS DISPONÍVEIS (YOUTUBE SHORTS) ---
  {
    id: 'tr-deadpool3',
    title: 'Deadpool & Wolverine',
    category: 'Ação, Multiverso & Comédia',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/73_1biulkYk',
    poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=800&auto=format&fit=crop',
    synopsis: 'Wade Wilson leva uma vida tranquila até a Autoridade de Variância Temporal (AVT) recrutá-lo para uma missão crucial pelo multiverso, forçando uma aliança improvável e caótica com Wolverine.',
    likes: 89400,
    shares: 28900,
    views: 820000,
    isLiked: true,
    featuredTag: '🎬 Campeão de Audiência',
    type: 'lancamento',
    streamingPlatform: 'Disney+',
    createdAt: '2026-10-11',
  },
  {
    id: 'tr-gladiator2',
    title: 'Gladiador II',
    category: 'Ação & Épico Histórico',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/4rgYUipGJNo',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    synopsis: 'Anos após o sacrifício heroico de Maximus, Lucius (Paul Mescal) é capturado e forçado a entrar no Coliseu para lutar pela glória de Roma e vingar sua família contra os imperadores tiranos.',
    likes: 48200,
    shares: 12450,
    views: 389000,
    isLiked: false,
    featuredTag: '🔥 Sucesso de Bilheteria',
    type: 'lancamento',
    streamingPlatform: 'Cinema 4K',
    createdAt: '2026-10-10',
  },
  {
    id: 'tr-dune2',
    title: 'Duna: Parte 2',
    category: 'Ficção Científica & Aventura',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/Way9Dexny3w',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    synopsis: 'Paul Atreides une forças a Chani e aos Fremen enquanto busca vingança implacável contra os conspiradores que destruíram sua família, enfrentando uma escolha entre o amor de sua vida e o destino do universo.',
    likes: 67300,
    shares: 19800,
    views: 540000,
    isLiked: true,
    featuredTag: '⭐ Vencedor de Prêmios',
    type: 'lancamento',
    streamingPlatform: 'Max',
    createdAt: '2026-10-09',
  },
  {
    id: 'tr-avatar2',
    title: 'Avatar: O Caminho da Água',
    category: 'Ficção & Aventura Épica',
    year: 2024,
    videoUrl: 'https://www.youtube.com/shorts/d9MyW72ELq0',
    poster: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=800&auto=format&fit=crop',
    synopsis: 'Mais de uma década após os eventos do primeiro filme, Jake Sully e Neytiri formaram uma família e fazem de tudo para ficarem juntos, explorando as fascinantes e misteriosas regiões oceânicas de Pandora.',
    likes: 128000,
    shares: 42100,
    views: 1450000,
    isLiked: false,
    featuredTag: '🌊 Fenômeno Mundial',
    type: 'lancamento',
    streamingPlatform: 'Disney+',
    createdAt: '2026-10-08',
  },

  // --- SÉRIES DE SUCESSO (YOUTUBE SHORTS) ---
  {
    id: 'tr-strangerthings5',
    title: 'Stranger Things 5: A Batalha Final',
    category: 'Série Sobrenatural & Suspense',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/b9EkMc79ZSU',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    synopsis: 'A fenda entre Hawkins e o Mundo Invertido está completamente aberta. Eleven e seus amigos se reúnem em sua jornada mais perigosa para o confronto definitivo e decisivo contra o impiedoso Vecna.',
    likes: 114000,
    shares: 45600,
    views: 1280000,
    isLiked: true,
    featuredTag: '💥 Temporada Final Épica',
    type: 'serie',
    streamingPlatform: 'Netflix',
    createdAt: '2026-10-07',
  },
  {
    id: 'tr-houseofdragon',
    title: 'A Casa do Dragão: Dança dos Dragões',
    category: 'Série & Fantasia Medieval',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/DotnJ7tTA34',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    synopsis: 'A sangrenta guerra civil entre a facção dos Pretos liderada por Rhaenyra e os Verdes pelo Trono de Ferro divide os Sete Reinos de Westeros em chamas de dragões colossais.',
    likes: 78500,
    shares: 22400,
    views: 690000,
    isLiked: false,
    featuredTag: '🐉 Sucesso Absoluto',
    type: 'serie',
    streamingPlatform: 'Max',
    createdAt: '2026-10-06',
  },
  {
    id: 'tr-shogun',
    title: 'Xógum: A Gloriosa Saga do Japão',
    category: 'Série Épica & Guerra Samurai',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/73_1biulkYk',
    poster: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop',
    synopsis: 'No Japão feudal de 1600, Lord Yoshii Toranaga luta pela própria sobrevivência quando um misterioso navio europeu encalha em uma aldeia, desencadeando conspirações políticas e batalhas épicas.',
    likes: 54100,
    shares: 14700,
    views: 460000,
    isLiked: false,
    featuredTag: '🥇 Vencedora Histórica do Emmy',
    type: 'serie',
    streamingPlatform: 'Disney+',
    createdAt: '2026-10-05',
  },
  {
    id: 'tr-johnwick4',
    title: 'John Wick 4: Baba Yaga',
    category: 'Ação & Combate Extremo',
    year: 2024,
    videoUrl: 'https://www.youtube.com/shorts/qEVUtrk8_B4',
    poster: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop',
    synopsis: 'Com o preço por sua cabeça crescendo sem limites, John Wick descobre um caminho para derrotar a Alta Cúpula, mas precisa enfrentar um novo e mortal inimigo com poderosas alianças pelo mundo.',
    likes: 85200,
    shares: 27300,
    views: 920000,
    isLiked: true,
    featuredTag: '⚡ Ação Ininterrupta',
    type: 'lancamento',
    streamingPlatform: 'Prime Video',
    createdAt: '2026-10-04',
  },

  // --- FILMES MAIS AGUARDADOS (2025 / 2026) ---
  {
    id: 'tr-avengers-endgame',
    title: 'Vingadores: A Grande Saga',
    category: 'Ação & Heróis Marvel',
    year: 2026,
    videoUrl: 'https://www.youtube.com/shorts/TcMBFSGVi1c',
    poster: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?q=80&w=800&auto=format&fit=crop',
    synopsis: 'O prelúdio para Guerras Secretas e Doutor Destino: os maiores super-heróis do universo reúnem todas as forças remanescentes para salvar as realidades em colapso do multiverso.',
    likes: 145000,
    shares: 52000,
    views: 1650000,
    isLiked: true,
    featuredTag: '🚀 Mais Aguardado Marvel',
    type: 'aguardado',
    streamingPlatform: 'Cinema 4K',
    createdAt: '2026-10-03',
  },
  {
    id: 'tr-matrix',
    title: 'Matrix: A Nova Realidade',
    category: 'Ficção Científica & Ação Cyberpunk',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/9ix7TUGVYIo',
    poster: 'https://images.unsplash.com/photo-1509281373149-e957c6296406?q=80&w=800&auto=format&fit=crop',
    synopsis: 'Em um mundo de duas realidades — a vida cotidiana e o que existe por trás dela —, Neo deve escolher seguir o coelho branco mais uma vez para desvendar os segredos da nova simulação.',
    likes: 64100,
    shares: 18900,
    views: 730000,
    isLiked: false,
    featuredTag: '🕶️ Clássico do Cinema',
    type: 'filme',
    streamingPlatform: 'Max',
    createdAt: '2026-10-02',
  },
  {
    id: 'tr-interstellar',
    title: 'Interestelar: Além do Tempo',
    category: 'Ficção Científica Espacial & Drama',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/2LqzF5WauAw',
    poster: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=800&auto=format&fit=crop',
    synopsis: 'Um grupo de astronautas recebe a missão mais crucial da história humana: viajar através de um buraco de minhoca no espaço para encontrar um novo lar habitável para a humanidade.',
    likes: 98400,
    shares: 34500,
    views: 1100000,
    isLiked: true,
    featuredTag: '🚀 Obra-Prima Christopher Nolan',
    type: 'filme',
    streamingPlatform: 'Cinema 4K',
    createdAt: '2026-10-01',
  },
  {
    id: 'tr-multiverse',
    title: 'Doutor Estranho no Multiverso da Loucura',
    category: 'Aventura, Fantasia & Magia Marvel',
    year: 2025,
    videoUrl: 'https://www.youtube.com/shorts/aWzlQ2N6qqg',
    poster: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=800&auto=format&fit=crop',
    synopsis: 'O Doutor Stephen Strange atravessa as realidades alternativas alucinantes e perigosas do Multiverso para confrontar uma misteriosa e poderosa adversária.',
    likes: 81200,
    shares: 25400,
    views: 890000,
    isLiked: false,
    featuredTag: '✨ Feitiçaria & Multiverso',
    type: 'lancamento',
    streamingPlatform: 'Disney+',
    createdAt: '2026-09-30',
  }
];

export const INITIAL_APPS: ClientApp[] = [
  {
    id: 'app-android',
    name: 'Zuxo Player para Android',
    platform: 'android',
    subtitle: 'Google Play Store Oficial (Celulares, Tablets e Android TV)',
    version: 'v3.5.4 (Mais Recente)',
    status: 'ativo',
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.zuxoplayer.app&hl=pt_BR',
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
    pairingCode: 'Código Downloader: 84920',
    instructions: [
      'Abra o aplicativo "Downloader" no seu Fire TV ou TV Box',
      'Digite apenas o código numérico: 84920',
      'O download e instalação do Zuxo Player iniciarão sozinhos'
    ]
  }
];

export const INITIAL_PROGRAM_GUIDE: ProgramItem[] = [
  {
    id: 'prog-1',
    channelName: 'ESPN Brasil 4K',
    channelLogo: '🏆',
    category: 'Esportes',
    time: '14:00',
    endTime: '16:00',
    title: 'UEFA Champions League: Semifinal Ao Vivo',
    description: 'Transmissão com narração em português, pré-jogo completo e imagem em 4K HDR 60fps.',
    isLive: true,
    progress: 72,
    badge: 'AO VIVO · 4K'
  },
  {
    id: 'prog-2',
    channelName: 'Premiere Futebol 1 HD',
    channelLogo: '⚽',
    category: 'Esportes',
    time: '16:30',
    endTime: '18:45',
    title: 'Brasileirão Série A: Flamengo x Palmeiras',
    description: 'Confronto decisivo pela liderança do campeonato brasileiro com equipe de craques e repórteres de campo.',
    isLive: false,
    badge: 'AO VIVO EXCLUSIVO'
  },
  {
    id: 'prog-3',
    channelName: 'SporTV 1 FHD',
    channelLogo: '🥇',
    category: 'Esportes',
    time: '19:00',
    endTime: '20:30',
    title: 'Troca de Passes Especial Rodada',
    description: 'Análise tática dos lances, entrevistas exclusivas com os jogadores e debates ao vivo.',
    isLive: false,
    badge: 'AO VIVO'
  },
  {
    id: 'prog-4',
    channelName: 'UFC Fight Pass Brasil',
    channelLogo: '🥊',
    category: 'Esportes',
    time: '21:00',
    endTime: '00:30',
    title: 'UFC 312: Disputa de Cinturão Mundial',
    description: 'Card principal ao vivo com disputa de cinturão na categoria dos médios e lutas preliminares.',
    isLive: false,
    badge: 'CARD PRINCIPAL'
  },
  {
    id: 'prog-5',
    channelName: 'HBO Max Channel 1',
    channelLogo: '🎬',
    category: 'Filmes & Séries',
    time: '18:15',
    endTime: '19:30',
    title: 'The Last of Us - Temporada 2 (Episódio Inédito)',
    description: 'Joel e Ellie chegam a uma nova comunidade enquanto perigos desconhecidos cercam seu refúgio.',
    isLive: false,
    badge: 'ESTREIA INÉDITA'
  },
  {
    id: 'prog-6',
    channelName: 'Telecine Premium HD',
    channelLogo: '🍿',
    category: 'Filmes & Séries',
    time: '15:30',
    endTime: '18:10',
    title: 'Duna: Parte Dois (Dublado e Legendado)',
    description: 'A jornada mítica de Paul Atreides ao se unir a Chani e aos Fremen em busca de justiça.',
    isLive: true,
    progress: 55,
    badge: 'CINEMA 4K'
  },
  {
    id: 'prog-7',
    channelName: 'HBO Max Channel 1',
    channelLogo: '🎬',
    category: 'Filmes & Séries',
    time: '20:30',
    endTime: '23:00',
    title: 'Gladiador II (Pré-Estreia Especial)',
    description: 'Lucius entra no Coliseu para lutar pela liberdade e vingar o legado dos heróis do passado.',
    isLive: false,
    badge: 'SUPERSESSÃO'
  },
  {
    id: 'prog-8',
    channelName: 'Globo HD São Paulo',
    channelLogo: '🌐',
    category: 'Canais Abertos',
    time: '19:30',
    endTime: '20:45',
    title: 'Jornal Nacional com Notícias do Dia',
    description: 'As principais notícias do Brasil e do mundo com William Bonner e Renata Vasconcellos.',
    isLive: false,
    badge: 'HD AO VIVO'
  },
  {
    id: 'prog-9',
    channelName: 'Globo HD São Paulo',
    channelLogo: '🌐',
    category: 'Canais Abertos',
    time: '20:45',
    endTime: '21:50',
    title: 'Novela das 9 (Capítulo Inédito)',
    description: 'Capítulo especial com revelações importantes na trama principal.',
    isLive: false,
    badge: 'INÉDITO'
  },
  {
    id: 'prog-10',
    channelName: 'Discovery Channel HD',
    channelLogo: '🌍',
    category: 'Documentários',
    time: '16:00',
    endTime: '17:30',
    title: 'Planeta Selvagem: Predadores do Ártico',
    description: 'Imagens impressionantes da vida selvagem e das estratégias de caça nas regiões mais geladas.',
    isLive: false,
    badge: '4K DOCUMENTÁRIO'
  },
  {
    id: 'prog-11',
    channelName: 'Cartoon Network 4K',
    channelLogo: '🎨',
    category: 'Infantil',
    time: '15:00',
    endTime: '16:30',
    title: 'O Incrível Mundo de Gumball (Maratona)',
    description: 'Episódios seguidos das aventuras de Gumball e Darwin em Elmore.',
    isLive: true,
    progress: 80,
    badge: 'INFANTIL'
  },
  {
    id: 'prog-12',
    channelName: 'CNN Brasil HD',
    channelLogo: '📰',
    category: 'Notícias',
    time: '17:00',
    endTime: '19:00',
    title: 'CNN Arena Política & Economia',
    description: 'Debate ao vivo sobre os acontecimentos econômicos e os rumos políticos do país.',
    isLive: false,
    badge: 'AO VIVO'
  }
];

export const INITIAL_PAYMENT_PLANS: PaymentPlan[] = [
  {
    id: 'plan-monthly',
    name: 'Plano Mensal Zuxo',
    period: 'Mês',
    price: 35.00,
    screens: 1,
    features: [
      '2.448 Canais Ao Vivo (FHD/4K)',
      '42.000+ Filmes e Séries atualizados',
      'Grade de Programação EPG em tempo real',
      '1 Tela Simultânea',
      'Suporte via WhatsApp 7 dias por semana'
    ]
  },
  {
    id: 'plan-quarterly',
    name: 'Plano Trimestral (Mais Popular)',
    period: '3 Meses',
    price: 89.90,
    screens: 2,
    recommended: true,
    features: [
      'Tudo do Plano Mensal',
      '2 Telas Simultâneas liberadas',
      'Qualidade 4K HDR e 60fps nos Esportes',
      'Economia de R$ 15,10 no trimestre',
      'Acesso prioritário aos servidores CDN VIP'
    ]
  },
  {
    id: 'plan-annual',
    name: 'Plano Anual VIP Premium',
    period: 'Ano',
    price: 249.90,
    screens: 3,
    features: [
      'Tudo do Plano Trimestral',
      '3 Telas Simultâneas para toda a família',
      'Apenas R$ 20,82 por mês',
      'Servidor VIP com buffer zero',
      'Suporte VIP prioritário no WhatsApp'
    ]
  }
];

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
    password: 'zuxo2026pass',
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
    password: 'mariana2026pass',
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
    password: 'carlos2026pass',
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
    password: 'juliana2026pass',
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
    password: 'rodrigo2026pass',
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
    password: 'amanda2026pass',
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

