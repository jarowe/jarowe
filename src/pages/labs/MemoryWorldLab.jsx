import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CAMERA_PRESETS, buildCameraPresetMessage } from '../../data/cameraPresets';
import './MemoryWorldLab.css';

const DEFAULT_SCENE_ID = 'naxos-rock';
const EMPTY_VALUE = '--';

function formatScore(value) {
  return typeof value === 'number' ? value.toFixed(3) : EMPTY_VALUE;
}

function formatGrade(value) {
  return typeof value === 'number' ? value.toFixed(1) : EMPTY_VALUE;
}

function formatWeightedComposite(value) {
  return typeof value === 'number' ? value.toFixed(2) : EMPTY_VALUE;
}

function formatFamilyLabel(value, fallback = EMPTY_VALUE) {
  if (!value) return fallback;
  return String(value)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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
  }

  if (viewMode === 'archive') {
    return `/archive/${sceneId}?${params.toString()}`;
  }

  params.set('raw', '1');
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

function getQualityThreshold(weightedComposite) {
  if (typeof weightedComposite !== 'number') return null;
  if (weightedComposite >= 4.0) return { label: 'Hero quality', className: 'is-hero' };
  if (weightedComposite >= 3.0) return { label: 'Shippable', className: 'is-shippable' };
  return { label: 'Below threshold', className: 'is-below' };
}

/* ── Rubric dimension scoring component ── */
function RubricScoring({
  rubricDimensions,
  dimensionScores,
  onDimensionChange,
  weightedComposite,
  rawComposite,
}) {
  const threshold = getQualityThreshold(weightedComposite);

  return (
    <div className="memory-world-lab__rubric-section">
      <h3>5-Dimension Rubric</h3>

      {rubricDimensions.map((dim) => {
        const currentScore = dimensionScores[dim.key] ?? null;
        const anchorText = currentScore && dim.anchors?.[currentScore - 1]
          ? dim.anchors[currentScore - 1]
          : dim.description || '';

        return (
          <div key={dim.key} className="memory-world-lab__rubric-dimension">
            <div className="memory-world-lab__rubric-dimension-header">
              <span>{dim.label}</span>
              <span className="memory-world-lab__rubric-weight">
                {Math.round(dim.weight * 100)}%
              </span>
            </div>
            <div className="memory-world-lab__rubric-chips">
              {[1, 2, 3, 4, 5].map((score) => (
                <button
                  key={score}
                  type="button"
                  className={`memory-world-lab__rubric-chip ${currentScore === score ? 'is-active' : ''}`}
                  onClick={() => onDimensionChange(dim.key, currentScore === score ? null : score)}
                  title={dim.anchors?.[score - 1] ?? `Score ${score}`}
                >
                  {score}
                </button>
              ))}
            </div>
            <div className="memory-world-lab__rubric-anchor">
              {anchorText}
            </div>
          </div>
        );
      })}

      <div className="memory-world-lab__rubric-composite">
        <div>
          <span>Weighted</span>
          <strong>{formatWeightedComposite(weightedComposite)}</strong>
        </div>
        <div>
          <span>Raw</span>
          <strong>{rawComposite ?? EMPTY_VALUE} / 25</strong>
        </div>
      </div>

      {threshold && (
        <div className={`memory-world-lab__rubric-threshold ${threshold.className}`}>
          {threshold.label} (weighted {formatWeightedComposite(weightedComposite)})
        </div>
      )}
    </div>
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
  const [rubricDimensions, setRubricDimensions] = useState([]);
  const [activePreset, setActivePreset] = useState('V0');
  const iframeRef = useRef(null);

  const source = searchParams.get('source') || 'selected-candidate';
  const view = searchParams.get('view') === 'archive' ? 'archive' : 'raw';

  // ── Rubric dimension scores (local state) ──
  const [dimensionScores, setDimensionScores] = useState({});

  async function fetchScenePayload(nextSceneId) {
    const [sceneResponse, catalogResponse, rubricResponse] = await Promise.all([
      fetch(`/__memory-lab/scene/${nextSceneId}`, { cache: 'no-store' }),
      fetch('/__memory-lab/scenes', { cache: 'no-store' }),
      fetch('/__memory-lab/rubric', { cache: 'no-store' }),
    ]);

    if (!sceneResponse.ok) {
      throw new Error(`Memory World Lab API returned HTTP ${sceneResponse.status}`);
    }

    const rubricData = rubricResponse.ok ? await rubricResponse.json() : null;

    return {
      scene: await sceneResponse.json(),
      catalog: await catalogResponse.json(),
      rubric: rubricData,
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
          if (payload.rubric?.dimensions) {
            setRubricDimensions(payload.rubric.dimensions);
          }
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
  const activeWorldSummary = selectedCandidate
    ?? (effectiveSource === 'current' || effectiveSource === 'selected-candidate' ? metaSelectedCandidate : null);
  const selectedPrompt = activeWorldSummary?.prompt ?? data?.scene?.source?.environmentWorldModelPrompt ?? data?.scene?.source?.worldModelPrompt ?? '';
  const previewUrl = buildPreviewUrl(sceneId, effectiveSource, view);
  const sourcePhotoUrl = buildAssetUrl(sceneId, data?.scene?.source?.photo);
  const activeWorldFamilyLabel = activeWorldSummary?.familyLabel
    ?? formatFamilyLabel(data?.scene?.worldGenerationFamily || data?.scene?.world?.generationFamily, '');
  const activeCandidateId = effectiveSource.startsWith('candidate:')
    ? effectiveSource.slice('candidate:'.length)
    : data?.scene?.selectedCandidateId ?? null;
  const activeCandidateIndex = candidates.findIndex((candidate) => candidate.id === activeCandidateId);

  const [grade, setGrade] = useState(selectedReview?.latestGrade ?? '');
  const [favorite, setFavorite] = useState(Boolean(selectedReview?.favorite));
  const [label, setLabel] = useState(buildDefaultLabel(effectiveSource));
  const [notes, setNotes] = useState(selectedReview?.latestNotes ?? '');

  // Sync form state when source changes
  useEffect(() => {
    setGrade(selectedReview?.latestGrade ?? '');
    setFavorite(Boolean(selectedReview?.favorite));
    setLabel(selectedReview?.latestLabel ?? buildDefaultLabel(effectiveSource));
    setNotes(selectedReview?.latestNotes ?? '');
    setSaveMessage('');

    // Restore rubric scores from latest review if available
    const latestRubric = selectedReview?.latestRubric;
    if (latestRubric) {
      const restored = {};
      for (const dim of rubricDimensions) {
        if (typeof latestRubric[dim.key] === 'number') {
          restored[dim.key] = latestRubric[dim.key];
        }
      }
      setDimensionScores(restored);
    } else {
      setDimensionScores({});
    }
  }, [sceneId, effectiveSource, selectedReview, rubricDimensions]);

  // ── Compute composites from local dimension scores ──
  const { weightedComposite, rawComposite, scoredCount } = useMemo(() => {
    let weighted = 0;
    let totalWeight = 0;
    let raw = 0;
    let count = 0;

    for (const dim of rubricDimensions) {
      const val = dimensionScores[dim.key];
      if (typeof val === 'number' && val >= 1 && val <= 5) {
        weighted += val * dim.weight;
        totalWeight += dim.weight;
        raw += val;
        count += 1;
      }
    }

    return {
      weightedComposite: totalWeight > 0 ? Math.round((weighted / totalWeight) * 100) / 100 : null,
      rawComposite: count > 0 ? raw : null,
      scoredCount: count,
    };
  }, [dimensionScores, rubricDimensions]);

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

  // ── Existing grades from meta.json ──
  const existingGrades = data?.scene?.grades;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchScenePayload(sceneId);
      setData(payload.scene);
      setCatalog(payload.catalog?.scenes ?? []);
      if (payload.rubric?.dimensions) {
        setRubricDimensions(payload.rubric.dimensions);
      }
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
          dimensions: scoredCount > 0 ? dimensionScores : undefined,
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

  function handleDimensionChange(key, value) {
    setDimensionScores((prev) => {
      const next = { ...prev };
      if (value === null) {
        delete next[key];
      } else {
        next[key] = value;
      }
      return next;
    });
  }

  function updateSearch(nextSource, nextView = view) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('source', nextSource);
    nextParams.set('view', nextView);
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
    navigate(`/starseed/labs/memory-worlds/${nextSceneId}?source=selected-candidate&view=${view}`);
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(event) {
      const activeElement = document.activeElement;
      const isTypingTarget = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement;

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        saveReview();
        return;
      }

      if (isTypingTarget) return;

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
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [candidates, effectiveSource, activeCandidateIndex, grade, label, notes, favorite, saving, sceneId, view]);

  return (
    <div className="memory-world-lab">
      <header className="memory-world-lab__header">
        <div className="memory-world-lab__title">
          <span className="memory-world-lab__eyebrow">Dev Memory World Lab</span>
          <h1>{data?.scene?.title || 'Memory World Lab'}</h1>
          <p>{data?.scene?.subtitle || 'Track candidates, preview, and grade with the 5-dimension rubric.'}</p>
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
        </div>
      </header>

      <section className="memory-world-lab__status-strip">
        <article className="memory-world-lab__status-card">
          <span className="memory-world-lab__status-label">Selected Candidate</span>
          <strong>{data?.scene?.selectedCandidateId || 'None'}</strong>
          <span className="memory-world-lab__status-meta">{activeWorldFamilyLabel}</span>
        </article>
        <article className="memory-world-lab__status-card">
          <span className="memory-world-lab__status-label">Favorite Version</span>
          <strong>{data?.scene?.favoriteVersionId || 'Not set'}</strong>
        </article>
        <article className="memory-world-lab__status-card">
          <span className="memory-world-lab__status-label">Rubric Evaluations</span>
          <strong>{existingGrades?.evaluations?.length ?? 0} recorded</strong>
          <span className="memory-world-lab__status-meta">
            {existingGrades?.winner
              ? `Winner: ${existingGrades.winner.family} (${formatWeightedComposite(existingGrades.winner.weightedComposite)})`
              : 'No winner declared'}
          </span>
        </article>
      </section>

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
          {/* ── Sources sidebar ── */}
          <aside className="memory-world-lab__sidebar">
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
                <span>{activeWorldFamilyLabel || 'Live default world'}</span>
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
                  <span>{metaSelectedCandidate?.familyLabel || 'Meta-selected winner'}</span>
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
                    <span>
                      {candidate.familyLabel || formatFamilyLabel(
                        candidate.family,
                        candidate.review?.favorite ? 'favorite' : candidate.isSelected ? 'selected' : 'candidate',
                      )}
                    </span>
                    <span>
                      {candidate.review?.bestWeightedComposite
                        ? `wc ${formatWeightedComposite(candidate.review.bestWeightedComposite)}`
                        : `grade ${formatGrade(candidate.review?.bestGrade)}`}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* ── Preview panel ── */}
          <section className="memory-world-lab__preview-panel">
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
              </div>
              <div className="memory-world-lab__preview-meta">
                <span>{effectiveSource}</span>
                <span>{activeWorldFamilyLabel}</span>
                <span>{view}</span>
              </div>
            </div>

            {/* Camera preset navigation bar */}
            <div className="memory-world-lab__camera-presets" style={{ display: 'flex', gap: '0.35rem', padding: '0.4rem 0.6rem', background: 'rgba(10,10,16,0.7)', borderRadius: '8px 8px 0 0' }}>
              {CAMERA_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  className={`memory-world-lab__preset-btn${activePreset === preset.id ? ' active' : ''}`}
                  style={{
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.72rem',
                    borderRadius: '4px',
                    border: activePreset === preset.id ? '1px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
                    background: activePreset === preset.id ? 'rgba(255,255,255,0.15)' : 'transparent',
                    color: activePreset === preset.id ? '#fff' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => {
                    setActivePreset(preset.id);
                    const sceneCam = data?.scene?.camera ?? { startPosition: [0, 0, 5], startTarget: [0, 0, 0] };
                    const msg = buildCameraPresetMessage(preset.id, sceneCam);
                    if (msg && iframeRef.current?.contentWindow) {
                      iframeRef.current.contentWindow.postMessage(msg, '*');
                    }
                  }}
                  title={preset.description}
                >
                  {preset.id}: {preset.label}
                </button>
              ))}
            </div>

            <div className="memory-world-lab__preview-shell">
              <iframe
                ref={iframeRef}
                key={previewUrl}
                title={`Memory world preview ${effectiveSource}`}
                className="memory-world-lab__iframe"
                src={previewUrl}
              />
            </div>
          </section>

          {/* ── Inspector panel ── */}
          <aside className="memory-world-lab__inspector">
            <div className="memory-world-lab__panel-header">
              <h2>Grade This World</h2>
              {saveMessage && <span className="memory-world-lab__save-message">{saveMessage}</span>}
            </div>

            <div className="memory-world-lab__metrics">
              <div>
                <span>Machine score</span>
                <strong>{formatScore(activeWorldSummary?.score ?? data?.scene?.world?.selection?.selectedScore)}</strong>
              </div>
              <div>
                <span>Best human grade</span>
                <strong>{formatGrade(selectedReview?.bestGrade)}</strong>
              </div>
              <div>
                <span>Best weighted</span>
                <strong>{formatWeightedComposite(selectedReview?.bestWeightedComposite)}</strong>
              </div>
              <div>
                <span>Family</span>
                <strong>{activeWorldFamilyLabel || EMPTY_VALUE}</strong>
              </div>
            </div>

            {/* ── 5-Dimension Rubric Scoring ── */}
            {rubricDimensions.length > 0 && (
              <RubricScoring
                rubricDimensions={rubricDimensions}
                dimensionScores={dimensionScores}
                onDimensionChange={handleDimensionChange}
                weightedComposite={weightedComposite}
                rawComposite={rawComposite}
              />
            )}

            <label className="memory-world-lab__field">
              <span>Review Label</span>
              <input value={label} onChange={(event) => setLabel(event.target.value)} />
            </label>

            <div className="memory-world-lab__field">
              <span>Legacy Grade (0-10)</span>
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

            {/* ── Reference photo ── */}
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

            {/* ── Prompt ── */}
            <div className="memory-world-lab__detail-card">
              <h3>Prompt</h3>
              <p>{selectedPrompt || 'No prompt metadata recorded for this source.'}</p>
            </div>

            {/* ── Existing rubric evaluations ── */}
            {existingGrades?.evaluations?.length > 0 && (
              <div className="memory-world-lab__detail-card">
                <div className="memory-world-lab__detail-header">
                  <h3>Rubric History</h3>
                  <span>{existingGrades.evaluations.length} evaluations</span>
                </div>
                <ul className="memory-world-lab__history">
                  {existingGrades.evaluations.slice(-8).reverse().map((ev, i) => (
                    <li key={`${ev.date}-${ev.family}-${i}`}>
                      <strong>{formatFamilyLabel(ev.family)} -- wc {formatWeightedComposite(ev.weightedComposite)}</strong>
                      <span>{ev.date}</span>
                      <small>{ev.notes || 'No notes'}</small>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ── Review History ── */}
            <div className="memory-world-lab__detail-card">
              <h3>Version History</h3>
              {reviewHistory.length === 0 && <p>No saved reviews for this source yet.</p>}
              {reviewHistory.length > 0 && (
                <ul className="memory-world-lab__history">
                  {reviewHistory.slice(0, 8).map((entry) => (
                    <li key={entry.versionId}>
                      <strong>{entry.label}</strong>
                      <span>
                        {entry.rubric?.weightedComposite
                          ? `wc ${formatWeightedComposite(entry.rubric.weightedComposite)}`
                          : formatGrade(entry.grade)}
                      </span>
                      <small>{entry.notes || 'No notes'}</small>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* ── Shortcuts ── */}
            <div className="memory-world-lab__detail-card">
              <h3>Shortcuts</h3>
              <div className="memory-world-lab__status-list">
                <span>J/K or Left/Right switch candidate</span>
                <span>R raw</span>
                <span>A archive</span>
                <span>F favorite</span>
                <span>Cmd/Ctrl+Enter save</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
