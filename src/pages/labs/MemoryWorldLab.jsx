import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import './MemoryWorldLab.css';

const DEFAULT_SCENE_ID = 'naxos-rock';
const EMPTY_VALUE = '--';

function formatScore(value) {
  return typeof value === 'number' ? value.toFixed(3) : EMPTY_VALUE;
}

function formatGrade(value) {
  return typeof value === 'number' ? value.toFixed(1) : EMPTY_VALUE;
}

function formatDateTime(value) {
  if (!value) return EMPTY_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;
  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function buildPreviewUrl(sceneId, source, viewMode) {
  const params = new URLSearchParams();
  params.set('lab', '1');

  if (source?.startsWith('candidate:')) {
    params.set('candidate', source.slice('candidate:'.length));
  } else if (source === 'selected-candidate') {
    // The selected candidate already lives in meta/world selection.
  } else if (source === 'current') {
    // Current promoted world uses the default route contract.
  }

  if (viewMode === 'archive') {
    return `/archive/${sceneId}?${params.toString()}`;
  }

  params.set('raw', '1');
  return `/memory/${sceneId}?${params.toString()}`;
}

function buildArchiveSceneUrl(sceneId, source) {
  const params = new URLSearchParams();
  params.set('lab', '1');

  if (source?.startsWith('candidate:')) {
    params.set('candidate', source.slice('candidate:'.length));
  }

  return `/archive/${sceneId}?${params.toString()}`;
}

function buildCapsuleUrl(sceneId, source) {
  const params = new URLSearchParams();
  params.set('lab', '1');

  if (source?.startsWith('candidate:')) {
    params.set('candidate', source.slice('candidate:'.length));
  }

  return `/memory/${sceneId}?${params.toString()}`;
}

function buildDefaultLabel(source) {
  if (source?.startsWith('candidate:')) {
    return `${source.slice('candidate:'.length)} review`;
  }
  if (source === 'selected-candidate') {
    return 'selected candidate review';
  }
  return 'promoted world review';
}

function buildAssetUrl(sceneId, assetPath) {
  if (!assetPath) return null;
  if (assetPath.startsWith('http://') || assetPath.startsWith('https://') || assetPath.startsWith('/')) {
    return assetPath;
  }
  return `/memory/${sceneId}/${assetPath}`;
}

function extractSelectedCandidateSource(scene) {
  return scene?.selectedCandidateId ? `candidate:${scene.selectedCandidateId}` : 'current';
}

function getCandidatePreferredYaw(candidate) {
  if (!candidate?.metrics) return null;
  return (
    candidate.metrics.preferredYawDegrees
    ?? candidate.metrics.bestYawDegrees
    ?? candidate.metrics.bestFacingYawDegrees
    ?? null
  );
}

export default function MemoryWorldLab() {
  const navigate = useNavigate();
  const { sceneId: routeSceneId } = useParams();
  const sceneId = routeSceneId || DEFAULT_SCENE_ID;
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [sourcesPanelOpen, setSourcesPanelOpen] = useState(false);
  const [inspectorPanelOpen, setInspectorPanelOpen] = useState(false);
  const [focusHudOpen, setFocusHudOpen] = useState(false);

  const source = searchParams.get('source') || 'selected-candidate';
  const view = searchParams.get('view') === 'archive' ? 'archive' : 'raw';
  const layoutMode = searchParams.get('layout') === 'focus' ? 'focus' : 'review';

  async function fetchScenePayload(nextSceneId) {
    const [sceneResponse, catalogResponse] = await Promise.all([
      fetch(`/__memory-lab/scene/${nextSceneId}`, { cache: 'no-store' }),
      fetch('/__memory-lab/scenes', { cache: 'no-store' }),
    ]);

    if (!sceneResponse.ok) {
      throw new Error(`Memory World Lab API returned HTTP ${sceneResponse.status}`);
    }
    if (!catalogResponse.ok) {
      throw new Error(`Memory World Lab catalog returned HTTP ${catalogResponse.status}`);
    }

    return {
      scene: await sceneResponse.json(),
      catalog: await catalogResponse.json(),
    };
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchScenePayload(sceneId);
        if (!cancelled) {
          setData(payload.scene);
          setCatalog(payload.catalog?.scenes ?? []);
        }
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError instanceof Error ? nextError.message : 'Unknown Memory World Lab error');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [sceneId]);

  const effectiveSource = useMemo(() => {
    if (source === 'selected-candidate' && !data?.scene?.selectedCandidateId) {
      return 'current';
    }
    return source;
  }, [data?.scene?.selectedCandidateId, source]);

  const candidates = data?.lab?.candidates ?? [];
  const currentReview = data?.scene?.currentReview ?? null;
  const metaSelectedCandidate = data?.scene?.selectedCandidateId
    ? candidates.find((candidate) => candidate.id === data.scene.selectedCandidateId) ?? null
    : null;
  const selectedCandidate = effectiveSource.startsWith('candidate:')
    ? candidates.find((candidate) => candidate.id === effectiveSource.slice('candidate:'.length)) ?? null
    : effectiveSource === 'selected-candidate'
      ? metaSelectedCandidate
      : null;

  const selectedReview = selectedCandidate?.review
    ?? (effectiveSource === 'current' ? currentReview : null);
  const selectedPrompt = selectedCandidate?.prompt ?? data?.scene?.source?.environmentWorldModelPrompt ?? data?.scene?.source?.worldModelPrompt ?? '';
  const previewUrl = buildPreviewUrl(sceneId, effectiveSource, view);
  const archiveSceneUrl = buildArchiveSceneUrl(sceneId, effectiveSource);
  const capsuleUrl = buildCapsuleUrl(sceneId, effectiveSource);
  const externalUrl = `${window.location.origin}${previewUrl}`;
  const archiveExternalUrl = `${window.location.origin}${archiveSceneUrl}`;
  const capsuleExternalUrl = `${window.location.origin}${capsuleUrl}`;
  const sourcePhotoUrl = buildAssetUrl(sceneId, data?.scene?.source?.photo);
  const subjectVersions = data?.lab?.subjectVersions ?? [];
  const subjectVersionCount = subjectVersions.length;
  const latestSubjectVersion = subjectVersions[0] ?? null;
  const currentSubjectVersion = subjectVersions.find((entry) => entry.isCurrent) ?? latestSubjectVersion;
  const sam3d = data?.lab?.sam3d ?? null;
  const activeCandidateId = effectiveSource.startsWith('candidate:')
    ? effectiveSource.slice('candidate:'.length)
    : data?.scene?.selectedCandidateId ?? null;
  const activeCandidateIndex = candidates.findIndex((candidate) => candidate.id === activeCandidateId);

  const [grade, setGrade] = useState(selectedReview?.latestGrade ?? '');
  const [favorite, setFavorite] = useState(Boolean(selectedReview?.favorite));
  const [label, setLabel] = useState(buildDefaultLabel(effectiveSource));
  const [notes, setNotes] = useState(selectedReview?.latestNotes ?? '');

  useEffect(() => {
    setGrade(selectedReview?.latestGrade ?? '');
    setFavorite(Boolean(selectedReview?.favorite));
    setLabel(selectedReview?.latestLabel ?? buildDefaultLabel(effectiveSource));
    setNotes(selectedReview?.latestNotes ?? '');
    setSaveMessage('');
  }, [sceneId, effectiveSource, selectedReview]);

  useEffect(() => {
    setSourcesPanelOpen(false);
    setInspectorPanelOpen(false);
    setFocusHudOpen(layoutMode !== 'focus');
  }, [layoutMode, sceneId]);

  const reviewHistory = useMemo(() => {
    const allVersions = data?.lab?.worldVersions ?? [];
    return allVersions.filter((entry) => {
      if (effectiveSource === 'current') {
        return entry.sourceType === 'current' && entry.sourceId === 'current';
      }
      if (effectiveSource === 'selected-candidate' && data?.scene?.selectedCandidateId) {
        return entry.sourceType === 'candidate' && entry.sourceId === data.scene.selectedCandidateId;
      }
      if (effectiveSource.startsWith('candidate:')) {
        return entry.sourceType === 'candidate' && entry.sourceId === effectiveSource.slice('candidate:'.length);
      }
      return false;
    });
  }, [data?.lab?.worldVersions, data?.scene?.selectedCandidateId, effectiveSource]);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchScenePayload(sceneId);
      setData(payload.scene);
      setCatalog(payload.catalog?.scenes ?? []);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unknown Memory World Lab error');
    } finally {
      setLoading(false);
    }
  }

  async function saveReview() {
    if (saving) return;
    setSaving(true);
    setSaveMessage('');
    setError(null);
    try {
      const response = await fetch('/__memory-lab/grade-world', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneId,
          source: effectiveSource,
          label,
          notes,
          grade: grade === '' ? null : Number(grade),
          favorite,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `HTTP ${response.status}`);
      }
      setData(payload.scene);
      setSaveMessage(`Saved ${payload.saved?.versionId || 'review'}.`);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Could not save world review');
    } finally {
      setSaving(false);
    }
  }

  function updateSearch(nextSource, nextView = view, nextLayout = layoutMode) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('source', nextSource);
    nextParams.set('view', nextView);
    nextParams.set('layout', nextLayout);
    setSearchParams(nextParams, { replace: true });
  }

  function jumpCandidate(offset) {
    if (candidates.length === 0) return;
    const currentIndex = activeCandidateIndex >= 0 ? activeCandidateIndex : 0;
    const nextIndex = (currentIndex + offset + candidates.length) % candidates.length;
    updateSearch(`candidate:${candidates[nextIndex].id}`);
  }

  function handleSceneChange(nextSceneId) {
    if (!nextSceneId || nextSceneId === sceneId) return;
    navigate(`/starseed/labs/memory-worlds/${nextSceneId}?source=selected-candidate&view=${view}&layout=${layoutMode}`);
  }

  function toggleFocusHud() {
    setFocusHudOpen((current) => {
      const next = !current;
      if (!next) {
        setSourcesPanelOpen(false);
        setInspectorPanelOpen(false);
      }
      return next;
    });
  }

  function toggleSourcesPanel() {
    setFocusHudOpen(true);
    setSourcesPanelOpen((current) => {
      const next = !current;
      if (next) {
        setInspectorPanelOpen(false);
      }
      return next;
    });
  }

  function toggleInspectorPanel() {
    setFocusHudOpen(true);
    setInspectorPanelOpen((current) => {
      const next = !current;
      if (next) {
        setSourcesPanelOpen(false);
      }
      return next;
    });
  }

  useEffect(() => {
    function onKeyDown(event) {
      const activeElement = document.activeElement;
      const isTypingTarget = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        saveReview();
        return;
      }

      if (isTypingTarget) {
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        setGrade(Number(event.key));
        return;
      }

      if (event.key === '0') {
        setGrade(10);
        return;
      }

      if (event.key === 'j' || event.key === 'ArrowLeft') {
        event.preventDefault();
        jumpCandidate(-1);
        return;
      }

      if (event.key === 'k' || event.key === 'ArrowRight') {
        event.preventDefault();
        jumpCandidate(1);
        return;
      }

      if (event.key === 'r') {
        event.preventDefault();
        updateSearch(effectiveSource, 'raw');
        return;
      }

      if (event.key === 'a') {
        event.preventDefault();
        updateSearch(effectiveSource, 'archive');
        return;
      }

      if (event.key === 'f') {
        event.preventDefault();
        setFavorite((current) => !current);
        return;
      }

      if (event.key === 'p') {
        event.preventDefault();
        updateSearch(effectiveSource, view, layoutMode === 'focus' ? 'review' : 'focus');
        return;
      }

      if (layoutMode === 'focus' && event.key === 'h') {
        event.preventDefault();
        toggleFocusHud();
        return;
      }

      if (layoutMode === 'focus' && event.key === 'Escape') {
        event.preventDefault();
        setSourcesPanelOpen(false);
        setInspectorPanelOpen(false);
        setFocusHudOpen(false);
        return;
      }

      if (layoutMode === 'focus' && event.key === 'w') {
        event.preventDefault();
        toggleSourcesPanel();
        return;
      }

      if (layoutMode === 'focus' && event.key === 'i') {
        event.preventDefault();
        toggleInspectorPanel();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [candidates, effectiveSource, activeCandidateIndex, grade, label, notes, favorite, saving, sceneId, view, layoutMode]);

  return (
    <div className={`memory-world-lab ${layoutMode === 'focus' ? 'memory-world-lab--focus' : 'memory-world-lab--review'}`}>
      {layoutMode !== 'focus' && (
        <header className="memory-world-lab__header">
          <div className="memory-world-lab__title">
            <span className="memory-world-lab__eyebrow">Dev Memory World Lab</span>
            <h1>{data?.scene?.title || 'Memory World Lab'}</h1>
            <p>{data?.scene?.subtitle || 'Track candidates, preview them, and save grades without losing the thread.'}</p>
          </div>
          <div className="memory-world-lab__header-actions">
            <label className="memory-world-lab__scene-select">
              <span>Scene</span>
              <select value={sceneId} onChange={(event) => handleSceneChange(event.target.value)}>
                {catalog.map((scene) => (
                  <option key={scene.id} value={scene.id}>
                    {scene.title}
                  </option>
                ))}
              </select>
            </label>
            <Link to="/starseed/labs" className="memory-world-lab__link">
              Back to Labs
            </Link>
            <button type="button" className="memory-world-lab__button" onClick={() => refresh()} disabled={loading}>
              Refresh
            </button>
            <button
              type="button"
              className={`memory-world-lab__button ${layoutMode === 'focus' ? 'memory-world-lab__button--active' : ''}`}
              onClick={() => updateSearch(effectiveSource, view, layoutMode === 'focus' ? 'review' : 'focus')}
            >
              {layoutMode === 'focus' ? 'Review Layout' : 'Focus Preview'}
            </button>
            <a className="memory-world-lab__button memory-world-lab__button--ghost" href={archiveExternalUrl} target="_blank" rel="noreferrer">
              Open Archive Scene
            </a>
            <a className="memory-world-lab__button memory-world-lab__button--ghost" href={capsuleExternalUrl} target="_blank" rel="noreferrer">
              Open Capsule
            </a>
          </div>
        </header>
      )}

      {layoutMode !== 'focus' && (
        <section className="memory-world-lab__status-strip">
          <article className="memory-world-lab__status-card">
            <span className="memory-world-lab__status-label">Selected Candidate</span>
            <strong>{data?.scene?.selectedCandidateId || 'None'}</strong>
          </article>
          <article className="memory-world-lab__status-card">
            <span className="memory-world-lab__status-label">Favorite World Version</span>
            <strong>{data?.scene?.favoriteVersionId || 'Not set'}</strong>
          </article>
          <article className="memory-world-lab__status-card">
            <span className="memory-world-lab__status-label">SAM3D Local Status</span>
            <strong>{sam3d?.loggedIn ? `Logged in as ${sam3d.account}` : 'HF login required locally'}</strong>
            <span className="memory-world-lab__status-meta">
              {sam3d?.ready
                ? 'Ready for subject generation'
                : sam3d?.hasCheckpoint && sam3d?.hasMhrModel
                  ? 'Models downloaded, auth still needed'
                  : 'Checkpoints not downloaded yet'}
            </span>
          </article>
        </section>
      )}

      {loading && (
        <div className="memory-world-lab__loading">
          Loading review scene...
        </div>
      )}

      {error && (
        <div className="memory-world-lab__error">
          {error}
        </div>
      )}

      {!loading && !error && data && (
        <div className="memory-world-lab__grid">
          <aside className={`memory-world-lab__sidebar ${layoutMode === 'focus' ? 'memory-world-lab__overlay-panel' : ''} ${sourcesPanelOpen ? 'is-open' : ''}`}>
            <div className="memory-world-lab__panel-header">
              <h2>World Sources</h2>
              <span>{candidates.length} candidates</span>
            </div>

            <button
              type="button"
              className={`memory-world-lab__source-card ${effectiveSource === 'current' ? 'is-active' : ''}`}
              onClick={() => updateSearch('current')}
            >
              <div className="memory-world-lab__source-topline">
                <strong>Promoted World</strong>
                <span>{formatGrade(currentReview?.latestGrade)}</span>
              </div>
              <div className="memory-world-lab__source-meta">
                <span>Live default world</span>
                {data.scene.favoriteVersionId && <span>favorite saved</span>}
              </div>
            </button>

            {data.scene.selectedCandidateId && (
              <button
                type="button"
                className={`memory-world-lab__source-card ${effectiveSource === 'selected-candidate' ? 'is-active' : ''}`}
                onClick={() => updateSearch('selected-candidate')}
              >
                <div className="memory-world-lab__source-topline">
                  <strong>Selected Candidate</strong>
                  <span>{data.scene.selectedCandidateId}</span>
                </div>
                <div className="memory-world-lab__source-meta">
                  <span>Meta-selected winner</span>
                  <span>{formatScore(metaSelectedCandidate?.score)}</span>
                </div>
              </button>
            )}

            <div className="memory-world-lab__candidate-list">
              {candidates.map((candidate) => (
                <button
                  key={candidate.id}
                  type="button"
                  className={`memory-world-lab__source-card ${effectiveSource === `candidate:${candidate.id}` ? 'is-active' : ''}`}
                  onClick={() => updateSearch(`candidate:${candidate.id}`)}
                >
                  <div className="memory-world-lab__source-topline">
                    <strong>{candidate.id}</strong>
                    <span>{formatScore(candidate.score)}</span>
                  </div>
                  <div className="memory-world-lab__source-meta">
                    <span>{candidate.review?.favorite ? 'favorite' : candidate.isSelected ? 'selected' : 'candidate'}</span>
                    <span>grade {formatGrade(candidate.review?.bestGrade)}</span>
                  </div>
                </button>
              ))}
            </div>
            {layoutMode === 'focus' && (
              <button
                type="button"
                className="memory-world-lab__overlay-close"
                onClick={() => setSourcesPanelOpen(false)}
              >
                Close
              </button>
            )}
          </aside>

          <section className="memory-world-lab__preview-panel">
            {layoutMode === 'focus' ? (
              <>
                <button
                  type="button"
                  className={`memory-world-lab__focus-toggle ${focusHudOpen ? 'is-open' : ''}`}
                  onClick={() => toggleFocusHud()}
                >
                  {focusHudOpen ? 'Hide Controls' : 'Show Controls'}
                </button>
                <div className={`memory-world-lab__focus-hud ${focusHudOpen ? 'is-open' : ''}`}>
                  <div className="memory-world-lab__focus-scene">
                    <span className="memory-world-lab__eyebrow">Dev Memory World Lab</span>
                    <strong>{data.scene.title}</strong>
                    <small>{data.scene.subtitle}</small>
                  </div>
                  <div className="memory-world-lab__focus-actions">
                    <label className="memory-world-lab__scene-select">
                      <span>Scene</span>
                      <select value={sceneId} onChange={(event) => handleSceneChange(event.target.value)}>
                        {catalog.map((scene) => (
                          <option key={scene.id} value={scene.id}>
                            {scene.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <Link to="/starseed/labs" className="memory-world-lab__link">
                      Back to Labs
                    </Link>
                    <button type="button" className="memory-world-lab__button" onClick={() => refresh()} disabled={loading}>
                      Refresh
                    </button>
                    <button
                      type="button"
                      className="memory-world-lab__button"
                      onClick={() => updateSearch(effectiveSource, view, 'review')}
                    >
                      Review Layout
                    </button>
                    <button
                      type="button"
                      className={`memory-world-lab__button ${sourcesPanelOpen ? 'memory-world-lab__button--active' : ''}`}
                      onClick={() => toggleSourcesPanel()}
                    >
                      World Sources
                    </button>
                    <button
                      type="button"
                      className={`memory-world-lab__button ${inspectorPanelOpen ? 'memory-world-lab__button--active' : ''}`}
                      onClick={() => toggleInspectorPanel()}
                    >
                      Review Panel
                    </button>
                    <a className="memory-world-lab__button memory-world-lab__button--ghost" href={archiveExternalUrl} target="_blank" rel="noreferrer">
                      Open Archive Scene
                    </a>
                    <a className="memory-world-lab__button memory-world-lab__button--ghost" href={capsuleExternalUrl} target="_blank" rel="noreferrer">
                      Open Capsule
                    </a>
                  </div>
                  <div className="memory-world-lab__focus-bar">
                    <div className="memory-world-lab__toggle-group">
                      <button
                        type="button"
                        className={`memory-world-lab__toggle ${view === 'raw' ? 'is-active' : ''}`}
                        onClick={() => updateSearch(effectiveSource, 'raw')}
                      >
                        Raw World
                      </button>
                      <button
                        type="button"
                        className={`memory-world-lab__toggle ${view === 'archive' ? 'is-active' : ''}`}
                        onClick={() => updateSearch(effectiveSource, 'archive')}
                      >
                        Archive Composite
                      </button>
                    </div>
                    <div className="memory-world-lab__toggle-group">
                      <button type="button" className="memory-world-lab__toggle" onClick={() => jumpCandidate(-1)} disabled={candidates.length === 0}>
                        Prev
                      </button>
                      <button type="button" className="memory-world-lab__toggle" onClick={() => jumpCandidate(1)} disabled={candidates.length === 0}>
                        Next
                      </button>
                    </div>
                    <div className="memory-world-lab__preview-meta">
                      <span>{effectiveSource}</span>
                      <span>{view}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="memory-world-lab__preview-toolbar">
                <div className="memory-world-lab__toolbar-left">
                  <div className="memory-world-lab__toggle-group">
                    <button
                      type="button"
                      className={`memory-world-lab__toggle ${view === 'raw' ? 'is-active' : ''}`}
                      onClick={() => updateSearch(effectiveSource, 'raw')}
                    >
                      Raw World
                    </button>
                    <button
                      type="button"
                      className={`memory-world-lab__toggle ${view === 'archive' ? 'is-active' : ''}`}
                      onClick={() => updateSearch(effectiveSource, 'archive')}
                    >
                      Archive Composite
                    </button>
                  </div>
                  <div className="memory-world-lab__toggle-group">
                    <button type="button" className="memory-world-lab__toggle" onClick={() => jumpCandidate(-1)} disabled={candidates.length === 0}>
                      Prev
                    </button>
                    <button type="button" className="memory-world-lab__toggle" onClick={() => jumpCandidate(1)} disabled={candidates.length === 0}>
                      Next
                    </button>
                  </div>
                  <div className="memory-world-lab__toggle-group">
                    <button
                      type="button"
                      className={`memory-world-lab__toggle ${layoutMode === 'focus' ? 'is-active' : ''}`}
                      onClick={() => updateSearch(effectiveSource, view, layoutMode === 'focus' ? 'review' : 'focus')}
                    >
                      {layoutMode === 'focus' ? 'Preview Focused' : 'Preview Standard'}
                    </button>
                  </div>
                </div>
                <div className="memory-world-lab__preview-meta">
                  <span>{effectiveSource}</span>
                  <span>{view}</span>
                </div>
              </div>
            )}

            <div className="memory-world-lab__preview-shell">
              <iframe
                key={previewUrl}
                title={`Memory world preview ${effectiveSource}`}
                className="memory-world-lab__iframe"
                src={previewUrl}
              />
            </div>
          </section>

          <aside className={`memory-world-lab__inspector ${layoutMode === 'focus' ? 'memory-world-lab__overlay-panel' : ''} ${inspectorPanelOpen ? 'is-open' : ''}`}>
            <div className="memory-world-lab__panel-header">
              <h2>Grade This World</h2>
              {saveMessage && <span className="memory-world-lab__save-message">{saveMessage}</span>}
            </div>

            <div className="memory-world-lab__metrics">
              <div>
                <span>Machine score</span>
                <strong>{formatScore(selectedCandidate?.score ?? data?.scene?.world?.selection?.selectedScore)}</strong>
              </div>
              <div>
                <span>Best human grade</span>
                <strong>{formatGrade(selectedReview?.bestGrade)}</strong>
              </div>
              <div>
                <span>Preferred yaw</span>
                <strong>{getCandidatePreferredYaw(selectedCandidate) ?? EMPTY_VALUE}</strong>
              </div>
            </div>

            <label className="memory-world-lab__field">
              <span>Review Label</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>

            <div className="memory-world-lab__field">
              <span>Quick Grade</span>
              <div className="memory-world-lab__grade-row">
                {Array.from({ length: 10 }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`memory-world-lab__grade-chip ${Number(grade) === value ? 'is-active' : ''}`}
                    onClick={() => setGrade(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                placeholder="7.2"
              />
            </div>

            <label className="memory-world-lab__field">
              <span>Notes</span>
              <textarea
                rows={5}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="What worked? What still reads wrong? Which angle felt strongest?"
              />
            </label>

            <label className="memory-world-lab__checkbox">
              <input type="checkbox" checked={favorite} onChange={(event) => setFavorite(event.target.checked)} />
              <span>Mark as favorite world version</span>
            </label>

            <button type="button" className="memory-world-lab__button memory-world-lab__button--primary" onClick={() => saveReview()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Review'}
            </button>

            <div className="memory-world-lab__detail-card">
              <h3>Route Guide</h3>
              <p>Lab route: review and grade versions. Archive scene: cinematic thread view. Capsule: direct memory route for the same scene.</p>
              <div className="memory-world-lab__route-actions">
                <a className="memory-world-lab__button memory-world-lab__button--ghost" href={archiveExternalUrl} target="_blank" rel="noreferrer">
                  Open Archive Scene
                </a>
                <a className="memory-world-lab__button memory-world-lab__button--ghost" href={capsuleExternalUrl} target="_blank" rel="noreferrer">
                  Open Capsule
                </a>
                <a className="memory-world-lab__button memory-world-lab__button--ghost" href={externalUrl} target="_blank" rel="noreferrer">
                  Open Current Preview
                </a>
              </div>
            </div>

            <div className="memory-world-lab__detail-card">
              <h3>Reference Photo</h3>
              {sourcePhotoUrl ? (
                <div className="memory-world-lab__reference-photo">
                  <img src={sourcePhotoUrl} alt={`${data.scene.title} source`} />
                </div>
              ) : (
                <p>No source photo found for this scene.</p>
              )}
            </div>

            <div className="memory-world-lab__detail-card">
              <h3>Prompt</h3>
              <p>{selectedPrompt || 'No prompt metadata recorded for this source.'}</p>
            </div>

            <div className="memory-world-lab__detail-card">
              <h3>SAM3D</h3>
              <p>{sam3d?.authMessage || 'SAM3D status unavailable.'}</p>
              <div className="memory-world-lab__status-list">
                <span>Env: {sam3d?.hasEnv ? 'ready' : 'missing'}</span>
                <span>Repo: {sam3d?.hasRepo ? 'present' : 'missing'}</span>
                <span>Checkpoint: {sam3d?.hasCheckpoint ? 'present' : 'missing'}</span>
                <span>MHR: {sam3d?.hasMhrModel ? 'present' : 'missing'}</span>
              </div>
              {!sam3d?.loggedIn && (
                <code>{sam3d?.loginCommand}</code>
              )}
            </div>

            <div className="memory-world-lab__detail-card">
              <div className="memory-world-lab__detail-header">
                <h3>Subject Track</h3>
                <span>{subjectVersionCount} versions</span>
              </div>
              <p>
                {currentSubjectVersion
                  ? `Current subject: ${currentSubjectVersion.label} via ${currentSubjectVersion.backend}.`
                  : 'No tracked subject versions for this scene yet.'}
              </p>
              {subjectVersions.length > 0 && (
                <div className="memory-world-lab__subject-list">
                  {subjectVersions.map((version) => {
                    const metrics = version.meta ?? {};
                    const bbox = Array.isArray(metrics.bbox)
                      ? metrics.bbox.map((value) => Math.round(Number(value))).join(', ')
                      : null;

                    return (
                      <article
                        key={version.versionId}
                        className={`memory-world-lab__subject-card ${version.isCurrent ? 'is-current' : ''}`}
                      >
                        {version.previewUrl && (
                          <div className="memory-world-lab__subject-preview">
                            <img src={version.previewUrl} alt={`${version.label} subject preview`} loading="lazy" />
                          </div>
                        )}
                        <div className="memory-world-lab__subject-body">
                          <div className="memory-world-lab__subject-topline">
                            <strong>{version.label}</strong>
                            {version.isCurrent && <span>current</span>}
                          </div>
                          <div className="memory-world-lab__status-list">
                            <span>{version.backend}</span>
                            <span>{version.mode}</span>
                            <span>{version.supportMode}</span>
                          </div>
                          <div className="memory-world-lab__subject-meta">
                            <span>{formatDateTime(version.createdAt)}</span>
                            {typeof metrics.vertexCount === 'number' && <span>{metrics.vertexCount.toLocaleString()} verts</span>}
                            {typeof metrics.faceCount === 'number' && <span>{metrics.faceCount.toLocaleString()} faces</span>}
                            {bbox && <span>bbox {bbox}</span>}
                            {metrics.previewMode && <span>{metrics.previewMode}</span>}
                          </div>
                          <p>{version.notes || 'No notes recorded.'}</p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="memory-world-lab__detail-card">
              <h3>Shortcuts</h3>
              <div className="memory-world-lab__status-list">
                <span>1-0 grade</span>
                <span>J/K or Left/Right switch candidate</span>
                <span>R raw</span>
                <span>A archive</span>
                <span>F favorite</span>
                <span>P preview mode</span>
                <span>W worlds panel</span>
                <span>I review panel</span>
                <span>H hide or show controls</span>
                <span>Esc clear overlays</span>
                <span>Cmd/Ctrl+Enter save</span>
              </div>
            </div>

            <div className="memory-world-lab__detail-card">
              <h3>Review History</h3>
              {reviewHistory.length === 0 && <p>No saved reviews for this source yet.</p>}
              {reviewHistory.length > 0 && (
                <ul className="memory-world-lab__history">
                  {reviewHistory.slice(0, 8).map((entry) => (
                    <li key={entry.versionId}>
                      <strong>{entry.label}</strong>
                      <span>{formatGrade(entry.grade)}</span>
                      <small>{entry.notes || 'No notes'}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {layoutMode === 'focus' && (
              <button
                type="button"
                className="memory-world-lab__overlay-close"
                onClick={() => setInspectorPanelOpen(false)}
              >
                Close
              </button>
            )}
          </aside>
        </div>
      )}
    </div>
  );
}
