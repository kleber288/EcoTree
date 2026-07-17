import { useEffect, useMemo, useState } from "react";
import ProfileAvatar from "../components/profile/ProfileAvatar.jsx";
import ProfilePhotoPicker from "../components/profile/ProfilePhotoPicker.jsx";
import ProfileSummaryCard from "../components/profile/ProfileSummaryCard.jsx";
import TreeStageVisual from "../components/tree/TreeStageVisual.jsx";
import EmptyState from "../components/ui/EmptyState.jsx";
import LoadingState from "../components/ui/LoadingState.jsx";
import useProfilePhoto from "../hooks/useProfilePhoto.js";
import { apiRequest } from "../services/api.js";
import { formatCurrency, toNumber } from "../utils/formatters.js";
import { getTreeStage } from "../utils/treeStage.js";

function getProfile(data) {
  return data?.usuario || data?.user || data || null;
}

function getProfileName(profile) {
  return profile?.nome || profile?.name || "";
}

function getDisplayName(profile) {
  const rawName =
    getProfileName(profile) || profile?.email?.split("@")[0] || "Usuario EcoTree";
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
}

function getGoalsList(goalsData) {
  const goals = goalsData?.metas || goalsData?.goals || [];
  return Array.isArray(goals) ? goals : [];
}

function normalizeStatus(status) {
  return String(status || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function getCompletedGoals(goalsData) {
  return getGoalsList(goalsData).filter((goal) => {
    const target = toNumber(goal?.valor_meta);
    const progress =
      target > 0
        ? (toNumber(goal?.valor_atual) / target) * 100
        : toNumber(goal?.progresso_percentual);

    return normalizeStatus(goal.status).includes("conclu") || progress >= 100;
  }).length;
}

function getTransactionsList(transactionsData) {
  const transactions = transactionsData?.transacoes || transactionsData || [];
  return Array.isArray(transactions) ? transactions : [];
}

function getTransactionsTotal(transactionsData) {
  const total = transactionsData?.total;

  if (total !== undefined && total !== null) {
    return toNumber(total);
  }

  return getTransactionsList(transactionsData).length;
}

function getGreenBalance(transactionsData) {
  return getTransactionsList(transactionsData).reduce((total, transaction) => {
    const value = Math.abs(toNumber(transaction.valor));
    return transaction.tipo === "gasto" ? total - value : total + value;
  }, 0);
}

function ReadonlyProfileField({ id, label, value, helper }) {
  return (
    <label className="profile-readonly-field" htmlFor={id}>
      {label}
      <input id={id} type="text" value={value} readOnly />
      {helper && <small>{helper}</small>}
    </label>
  );
}

function ProfileShortcut({ detail, icon, onClick, title }) {
  return (
    <button className="profile-shortcut" type="button" onClick={onClick}>
      <span aria-hidden="true">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <i aria-hidden="true">&gt;</i>
    </button>
  );
}

export default function Profile({ currentUser, onLogout, onNavigate }) {
  const [profile, setProfile] = useState(() => getProfile(currentUser));
  const [treeData, setTreeData] = useState(null);
  const [goalsData, setGoalsData] = useState(null);
  const [transactionsData, setTransactionsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [partialErrors, setPartialErrors] = useState([]);
  const {
    error: photoLoadError,
    loading: photoLoading,
    photoUrl,
    removePhoto,
    savePhoto,
    userKey
  } = useProfilePhoto(profile);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");
      setPartialErrors([]);

      try {
        const [profileResult, treeResult, goalsResult, transactionsResult] =
          await Promise.allSettled([
            currentUser
              ? Promise.resolve({ usuario: currentUser })
              : apiRequest("/users/me"),
            apiRequest("/tree/status"),
            apiRequest("/goals/"),
            apiRequest("/transactions/")
          ]);

        if (!active) {
          return;
        }

        if (profileResult.status === "rejected") {
          throw profileResult.reason;
        }

        setProfile(getProfile(profileResult.value));
        setTreeData(
          treeResult.status === "fulfilled" ? treeResult.value.arvore : null
        );
        setGoalsData(goalsResult.status === "fulfilled" ? goalsResult.value : null);
        setTransactionsData(
          transactionsResult.status === "fulfilled"
            ? transactionsResult.value
            : null
        );

        const sources = [
          { label: "arvore", result: treeResult },
          { label: "metas", result: goalsResult },
          { label: "registros", result: transactionsResult }
        ];

        setPartialErrors(
          sources
            .filter((source) => source.result.status === "rejected")
            .map((source) => source.label)
        );
      } catch (loadError) {
        if (active) {
          setError(loadError.message || "Nao foi possivel carregar o perfil.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [currentUser]);

  const displayName = getDisplayName(profile);
  const profileName = getProfileName(profile);
  const profileEmail = profile?.email || "";
  const hasTreeData = Boolean(treeData);
  const hasGoalsData = Boolean(goalsData);
  const hasTransactionsData = Boolean(transactionsData);
  const currentStage = getTreeStage(treeData?.pontos);
  const completedGoals = getCompletedGoals(goalsData);
  const totalGoals = goalsData?.total ?? getGoalsList(goalsData).length;
  const totalRecords = getTransactionsTotal(transactionsData);
  const greenBalance = getGreenBalance(transactionsData);
  const points = toNumber(treeData?.pontos);
  const backendLevelLabel = treeData
    ? `Nivel ${treeData.nivel ?? "-"} · ${treeData.nome_nivel || "EcoTree"}`
    : "Nao carregado";

  const summaryItems = useMemo(
    () => [
      {
        label: "Pontos acumulados",
        value: hasTreeData ? points : "—",
        detail: hasTreeData ? "Da arvore" : "Nao carregado"
      },
      {
        label: "Metas concluidas",
        value: hasGoalsData ? completedGoals : "—",
        detail: hasGoalsData
          ? `${totalGoals || 0} meta${totalGoals === 1 ? "" : "s"} no total`
          : "Nao carregado"
      },
      {
        label: "Registros",
        value: hasTransactionsData ? totalRecords : "—",
        detail: hasTransactionsData ? "Movimentacoes reais" : "Nao carregado"
      },
      {
        label: "Saldo verde",
        value: hasTransactionsData ? formatCurrency(greenBalance) : "—",
        detail: hasTransactionsData ? "Entradas menos saidas" : "Nao carregado"
      }
    ],
    [
      completedGoals,
      greenBalance,
      hasGoalsData,
      hasTransactionsData,
      hasTreeData,
      points,
      totalGoals,
      totalRecords
    ]
  );

  const shortcuts = useMemo(
    () => [
      {
        id: "tree",
        icon: "A",
        title: "Arvore",
        detail: hasTreeData
          ? `${points} pontos · ${treeData.nome_nivel || "EcoTree"}`
          : "Ver evolucao da EcoTree",
        action: () => onNavigate("tree")
      },
      {
        id: "transactions",
        icon: "R",
        title: "Registros",
        detail: hasTransactionsData
          ? `${totalRecords} registro${totalRecords === 1 ? "" : "s"}`
          : "Abrir registros",
        action: () => onNavigate("transactions")
      },
      {
        id: "goals",
        icon: "M",
        title: "Metas",
        detail: hasGoalsData
          ? `${completedGoals} concluida${completedGoals === 1 ? "" : "s"}`
          : "Abrir metas",
        action: () => onNavigate("goals")
      }
    ],
    [
      completedGoals,
      hasGoalsData,
      hasTransactionsData,
      hasTreeData,
      onNavigate,
      points,
      totalRecords,
      treeData
    ]
  );

  return (
    <section
      className="page-section profile-redesign"
      aria-labelledby="profile-title"
    >
      <header className="redesign-page-header profile-page-heading">
        <div>
          <span>SEU ESPACO</span>
          <h1 id="profile-title">Perfil</h1>
          <p>Personalize sua foto e acompanhe sua jornada com dados reais.</p>
        </div>
      </header>

      {error && (
        <p className="alert error" role="alert">
          {error}
        </p>
      )}

      {partialErrors.length > 0 && !error && (
        <p className="alert error" role="alert">
          Algumas informacoes nao carregaram agora: {partialErrors.join(", ")}.
        </p>
      )}

      {photoLoadError && !error && (
        <p className="alert error" role="alert">
          {photoLoadError}
        </p>
      )}

      {loading ? (
        <LoadingState>Carregando perfil...</LoadingState>
      ) : error ? (
        <EmptyState
          title="Nao foi possivel carregar seu perfil."
          actionLabel="Sair"
          onAction={onLogout}
        >
          Tente entrar novamente caso a sessao tenha expirado.
        </EmptyState>
      ) : (
        <>
          <section className="profile-hero-card" aria-label="Resumo do perfil">
            <div className="profile-hero-avatar-wrap">
              <ProfileAvatar
                email={profileEmail}
                name={displayName}
                photoUrl={photoUrl}
                size="hero"
              />
            </div>

            <div className="profile-hero-copy">
              <h2>{displayName}</h2>
              <p>{profileEmail || "Email nao informado pela API"}</p>
              <strong>{backendLevelLabel}</strong>
            </div>

            <div className="profile-hero-meta">
              <span>Nivel atual da arvore</span>
              <strong>{backendLevelLabel}</strong>
              <small>Estagio visual: {currentStage.nome}</small>
            </div>
          </section>

          <div className="profile-content-grid">
            <article
              className="profile-data-card"
              aria-labelledby="profile-data-title"
            >
              <div className="panel-title-row">
                <div>
                  <h2 id="profile-data-title">Dados pessoais</h2>
                  <p>Campos somente leitura enquanto nao houver rota de edicao.</p>
                </div>
              </div>

              <div className="profile-readonly-grid">
                <ReadonlyProfileField
                  id="profile-name"
                  label="Nome"
                  value={profileName || "Nao disponivel pela API atual"}
                  helper={
                    profileName
                      ? "Informacao retornada pela API."
                      : "O endpoint /users/me atual nao envia nome."
                  }
                />
                <ReadonlyProfileField
                  id="profile-email"
                  label="Email"
                  value={profileEmail || "Nao informado"}
                  helper="Usado para identificar sua conta."
                />
              </div>
            </article>

            <article
              className="profile-photo-card"
              aria-labelledby="profile-photo-title"
            >
              <div className="panel-title-row">
                <div>
                  <h2 id="profile-photo-title">Foto do perfil</h2>
                  <p>Escolha uma imagem local para personalizar o app.</p>
                </div>
              </div>

              <ProfilePhotoPicker
                disabled={!userKey}
                hasPhoto={Boolean(photoUrl)}
                loading={photoLoading}
                onRemove={removePhoto}
                onSelect={savePhoto}
              />
            </article>

            <ProfileSummaryCard items={summaryItems} />
          </div>

          <section
            className="profile-stage-card"
            aria-labelledby="profile-stage-title"
          >
            <div className="profile-stage-copy">
              <span>ESTAGIO ATUAL DA ECOTREE</span>
              <h2 id="profile-stage-title">{currentStage.nome}</h2>
              <p>
                {hasTreeData
                  ? `A API informa ${backendLevelLabel} com ${points} pontos acumulados.`
                  : "Os dados da arvore nao carregaram agora."}
              </p>
              <div
                className="stage-progress"
                role="progressbar"
                aria-label="Progresso visual da EcoTree"
                aria-valuemin="0"
                aria-valuemax="100"
                aria-valuenow={currentStage.progresso}
              >
                <span style={{ width: `${currentStage.progresso}%` }} />
              </div>
              <small>
                {currentStage.proximoEstagio
                  ? `${currentStage.pontosParaProximo} pontos para ${currentStage.proximoEstagio}`
                  : "Estagio visual maximo alcancado"}
              </small>
            </div>

            <TreeStageVisual stage={currentStage} variant="hero" />
          </section>

          <section
            className="profile-shortcuts-panel"
            aria-labelledby="profile-shortcuts-title"
          >
            <div className="panel-title-row">
              <div>
                <h2 id="profile-shortcuts-title">Continuar jornada</h2>
                <p>Acesse rapidamente as areas principais do EcoTree.</p>
              </div>
            </div>

            <div className="profile-shortcuts">
              {shortcuts.map((shortcut) => (
                <ProfileShortcut
                  key={shortcut.id}
                  detail={shortcut.detail}
                  icon={shortcut.icon}
                  onClick={shortcut.action}
                  title={shortcut.title}
                />
              ))}

              <button
                className="profile-shortcut profile-shortcut-logout"
                type="button"
                onClick={onLogout}
              >
                <span aria-hidden="true">!</span>
                <span>
                  <strong>Sair da conta</strong>
                  <small>Encerrar sessao neste dispositivo</small>
                </span>
                <i aria-hidden="true">&gt;</i>
              </button>
            </div>
          </section>
        </>
      )}
    </section>
  );
}
