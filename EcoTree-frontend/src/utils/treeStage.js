const TREE_STAGE_DEFINITIONS = [
  {
    id: "seed",
    nome: "Semente",
    shortName: "Semente",
    nivel: 1,
    min: 0,
    max: 9,
    faixa: "0 a 9 pontos",
    tagline: "O começo da jornada",
    description:
      "Todo grande impacto começa pequeno. Registre suas primeiras ações para despertar o broto da sua EcoTree.",
    colors: {
      background: "#e7f4df",
      border: "#c9e0bd",
      accent: "#5daa64",
      text: "#244a30",
      muted: "#58705d",
      ground: "#b9d7ab"
    },
    classVisual: "tree-stage-visual-seed"
  },
  {
    id: "sprout",
    nome: "Broto",
    shortName: "Broto",
    nivel: 2,
    min: 10,
    max: 29,
    faixa: "10 a 29 pontos",
    tagline: "Primeiras folhas",
    description:
      "As primeiras escolhas sustentáveis já aparecem. Continue registrando hábitos para fortalecer o caule.",
    colors: {
      background: "#e0f5e8",
      border: "#b9dfc8",
      accent: "#37a765",
      text: "#174b32",
      muted: "#4d765f",
      ground: "#b8dec9"
    },
    classVisual: "tree-stage-visual-sprout"
  },
  {
    id: "sapling",
    nome: "Muda",
    shortName: "Muda",
    nivel: 3,
    min: 30,
    max: 69,
    faixa: "30 a 69 pontos",
    tagline: "Raízes mais fortes",
    description:
      "Sua evolução ganhou estrutura. A muda mostra que os registros constantes já criaram raízes.",
    colors: {
      background: "#ddf3ef",
      border: "#b5ddd4",
      accent: "#2f9f7d",
      text: "#164b46",
      muted: "#50716c",
      ground: "#b8ddd8"
    },
    classVisual: "tree-stage-visual-sapling"
  },
  {
    id: "young",
    nome: "Árvore Jovem",
    shortName: "Jovem",
    nivel: 4,
    min: 70,
    max: 149,
    faixa: "70 a 149 pontos",
    tagline: "Crescimento constante",
    description:
      "A árvore já ocupa espaço na sua jornada. Mantenha o ritmo para liberar uma copa mais completa.",
    colors: {
      background: "#e8f0ff",
      border: "#c8d7f1",
      accent: "#3f7bc2",
      text: "#253e65",
      muted: "#5b6f90",
      ground: "#c6d8ed"
    },
    classVisual: "tree-stage-visual-young"
  },
  {
    id: "adult",
    nome: "Árvore Adulta",
    shortName: "Adulta",
    nivel: 5,
    min: 150,
    max: 299,
    faixa: "150 a 299 pontos",
    tagline: "Impacto visível",
    description:
      "Seu impacto já aparece em frutos. A EcoTree adulta celebra uma rotina verde mais consistente.",
    colors: {
      background: "#fff1d7",
      border: "#ead4a7",
      accent: "#d29a2d",
      text: "#604516",
      muted: "#806638",
      ground: "#efdcae"
    },
    classVisual: "tree-stage-visual-adult"
  },
  {
    id: "guardian",
    nome: "Guardiã Verde",
    shortName: "Guardiã",
    nivel: 6,
    min: 300,
    max: Infinity,
    faixa: "300+ pontos",
    tagline: "Legado sustentável",
    description:
      "Sua EcoTree chegou ao estágio máximo desta jornada visual, simbolizando um legado sustentável.",
    colors: {
      background: "#ede7fa",
      border: "#d1c2ea",
      accent: "#7b5ab4",
      text: "#493369",
      muted: "#6c5a86",
      ground: "#d5c8e8"
    },
    classVisual: "tree-stage-visual-guardian"
  }
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const TREE_STAGES = TREE_STAGE_DEFINITIONS.map((stage, index) => ({
  ...stage,
  proximoEstagio: TREE_STAGE_DEFINITIONS[index + 1]?.nome ?? null,
  nextStage: TREE_STAGE_DEFINITIONS[index + 1]?.nome ?? null,
  pontosProximoEstagio: TREE_STAGE_DEFINITIONS[index + 1]?.min ?? null
}));

export function normalizeTreePoints(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  }

  const normalizedText = String(value).trim().replace(",", ".");
  const numericValue = Number(normalizedText);

  if (Number.isFinite(numericValue)) {
    return Math.max(0, Math.floor(numericValue));
  }

  const parsedValue = Number.parseFloat(normalizedText.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsedValue) ? Math.max(0, Math.floor(parsedValue)) : 0;
}

export function getTreeStage(points) {
  const safePoints = normalizeTreePoints(points);
  const stage =
    TREE_STAGES.find(
      (item) => safePoints >= item.min && safePoints <= item.max
    ) ?? TREE_STAGES[TREE_STAGES.length - 1];

  const nextThreshold = stage.pontosProximoEstagio;
  const progress = nextThreshold
    ? ((safePoints - stage.min) / (nextThreshold - stage.min)) * 100
    : 100;

  return {
    ...stage,
    points: safePoints,
    pontos: safePoints,
    progresso: Math.round(clamp(progress, 0, 100)),
    pontosNaFaixa: Math.max(safePoints - stage.min, 0),
    pontosParaProximo:
      nextThreshold === null ? 0 : Math.max(nextThreshold - safePoints, 0)
  };
}
