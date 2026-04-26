import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  collection,
  query,
  where,
  onSnapshot,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/NoteDetail.css';

const CATEGORY_LABELS = { recipe: 'Recipe', article: 'Article', diet: 'Diet', personal: 'Personal Note' };
const CATEGORY_ICONS  = { recipe: '🍽️', article: '📰', diet: '🥗', personal: '📝' };

// ── Same diet rules used on the list page ──
const DIET_RULES = {
  Keto: {
    forbidden: ['sugar', 'bread', 'pasta', 'rice', 'flour', 'potato', 'potatoes', 'corn',
                'beans', 'lentils', 'oats', 'honey', 'maple syrup', 'wheat', 'tortilla',
                'noodle', 'noodles', 'cereal', 'banana'],
    reason: 'Keto restricts carbohydrates',
  },
  Vegan: {
    forbidden: ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp',
                'egg', 'eggs', 'milk', 'butter', 'cheese', 'yogurt', 'cream', 'honey',
                'gelatin', 'bacon', 'turkey', 'ham', 'lard', 'whey', 'anchovy'],
    reason: 'Vegan excludes all animal products',
  },
  Vegetarian: {
    forbidden: ['chicken', 'beef', 'pork', 'lamb', 'fish', 'salmon', 'tuna', 'shrimp',
                'bacon', 'turkey', 'ham', 'anchovy', 'gelatin', 'lard'],
    reason: 'Vegetarian excludes meat and fish',
  },
  'Gluten-Free': {
    forbidden: ['wheat', 'flour', 'bread', 'pasta', 'barley', 'rye', 'couscous',
                'bulgur', 'semolina', 'soy sauce', 'beer', 'tortilla', 'breadcrumbs'],
    reason: 'Gluten-free excludes wheat, barley, and rye',
  },
  'Dairy-Free': {
    forbidden: ['milk', 'butter', 'cheese', 'yogurt', 'cream', 'whey', 'casein',
                'ghee', 'buttermilk', 'ice cream'],
    reason: 'Dairy-free excludes all milk products',
  },
  Paleo: {
    forbidden: ['grain', 'grains', 'wheat', 'rice', 'corn', 'oats', 'bread', 'pasta',
                'beans', 'lentils', 'peanut', 'peanuts', 'soy', 'sugar', 'dairy',
                'milk', 'cheese', 'butter'],
    reason: 'Paleo excludes grains, legumes, dairy, and processed foods',
  },
  'Low-Carb': {
    forbidden: ['sugar', 'bread', 'pasta', 'rice', 'potato', 'potatoes', 'corn',
                'flour', 'honey', 'maple syrup', 'tortilla', 'noodle', 'noodles'],
    reason: 'Low-carb restricts high-carbohydrate foods',
  },
  'Low-Sodium': {
    forbidden: ['soy sauce', 'bacon', 'salt', 'ham', 'pickle', 'pickles', 'sausage',
                'bouillon', 'msg', 'anchovy', 'olives', 'capers'],
    reason: 'Low-sodium restricts high-salt ingredients',
  },
  'Low-Fat': {
    forbidden: ['butter', 'lard', 'bacon', 'heavy cream', 'cream cheese',
                'mayonnaise', 'shortening'],
    reason: 'Low-fat restricts high-fat ingredients',
  },
  'DASH Diet': {
    forbidden: ['bacon', 'sausage', 'salt', 'butter', 'lard', 'soy sauce', 'ham'],
    reason: 'DASH limits saturated fat and sodium',
  },
  Whole30: {
    forbidden: ['sugar', 'dairy', 'milk', 'cheese', 'butter', 'grain', 'wheat',
                'flour', 'rice', 'oats', 'beans', 'lentils', 'peanut', 'peanuts',
                'soy', 'alcohol', 'wine', 'beer'],
    reason: 'Whole30 excludes sugar, grains, legumes, dairy, and alcohol',
  },
};
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findConflicts(note, diets) {
  if (note?.category !== 'recipe' || !diets?.length) return [];
  const text = `${note.ingredients || ''}\n${note.title || ''}\n${note.content || ''}`;
  const out = [];
  for (const d of diets) {
    const rules = DIET_RULES[d.dietType];
    if (!rules || !rules.forbidden.length) continue;
    const matched = rules.forbidden.filter((t) =>
      new RegExp(`\\b${escapeRe(t)}\\b`, 'i').test(text),
    );
    if (matched.length) out.push({ dietType: d.dietType, matched, reason: rules.reason });
  }
  return out;
}

export default function NoteDetail() {
  const { id }   = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [note, setNote]         = useState(null);
  const [diets, setDiets]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Single-note listener
  useEffect(() => {
    if (!user || !id) return;
    const ref = doc(db, 'users', user.uid, 'notes', id);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setNote({ id: snap.id, ...snap.data() });
      else setNotFound(true);
      setLoading(false);
    });
    return unsub;
  }, [user, id]);

  // Active diet notes (for conflict detection)
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'notes'),
      where('category', '==', 'diet'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setDiets(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  const togglePin = async () => {
    if (!note) return;
    await updateDoc(doc(db, 'users', user.uid, 'notes', note.id), {
      pinned: !note.pinned,
      updatedAt: Timestamp.now(),
    });
  };

  const handleDelete = async () => {
    if (!note) return;
    if (!window.confirm('Delete this note?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'notes', note.id));
    navigate('/notes');
  };

  const handleEdit = () => {
    if (!note) return;
    navigate(`/notes?edit=${note.id}`);
  };

  const fmtDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <div className="nd-page">
        <header className="dash-nav">
          <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
          <Link to="/notes" className="nd-back-link">&larr; All Notes</Link>
        </header>
        <main className="nd-main"><div className="nd-loading">Loading note…</div></main>
      </div>
    );
  }

  if (notFound || !note) {
    return (
      <div className="nd-page">
        <header className="dash-nav">
          <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
          <Link to="/notes" className="nd-back-link">&larr; All Notes</Link>
        </header>
        <main className="nd-main">
          <div className="nd-notfound">
            <span>🔍</span>
            <h2>Note not found</h2>
            <p>This note may have been deleted.</p>
            <Link to="/notes" className="nd-btn-primary">Back to Notes</Link>
          </div>
        </main>
      </div>
    );
  }

  const conflicts = findConflicts(note, diets);

  // Parse ingredients (newline-separated)
  const ingredientList = (note.ingredients || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Parse instructions into steps.
  // 1. Split on newlines.
  // 2. Drop standalone step-header lines like "step 1", "STEP 2:", "3." — these
  //    are labels, not content, and were becoming their own bubbles.
  // 3. Strip any leading step marker from the remaining lines so the bubble
  //    number is the single source of truth.
  const STEP_HEADER_ONLY = /^(?:step\s*)?\d+\s*[.:)\-]?\s*$/i;
  const STEP_MARKER      = /^(?:step\s*)?\d+\s*[.:)\-]\s+/i;
  const instructionSteps = (note.content || '')
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter((l) => l && !STEP_HEADER_ONLY.test(l))
    .map((l) => l.replace(STEP_MARKER, ''));

  return (
    <div className={`nd-page nd-page-${note.category}`}>
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/notes" className="nd-back-link">&larr; All Notes</Link>
      </header>

      <main className="nd-main">
        {/* Hero image (recipe only) */}
        {note.category === 'recipe' && note.imageUrl && (
          <div className="nd-hero">
            <img src={note.imageUrl} alt={note.title} />
          </div>
        )}

        {/* Header block */}
        <div className="nd-header">
          <div className="nd-badges">
            <span className={`nd-cat-badge nd-cat-${note.category}`}>
              {CATEGORY_ICONS[note.category]} {CATEGORY_LABELS[note.category]}
            </span>
            {note.category === 'recipe' && note.cuisine && (
              <span className="nd-sub-badge">{note.cuisine}</span>
            )}
            {note.category === 'diet' && note.dietType && (
              <span className="nd-sub-badge">{note.dietType}</span>
            )}
            {note.pinned && <span className="nd-pin-badge">📌 Pinned</span>}
          </div>

          <h1 className="nd-title">{note.title}</h1>

          {note.category === 'recipe' && (note.prepTime || note.servings) && (
            <div className="nd-meta-row">
              {note.prepTime && (
                <div className="nd-meta"><span>⏱</span><strong>Prep Time</strong><em>{note.prepTime}</em></div>
              )}
              {note.servings && (
                <div className="nd-meta"><span>🍴</span><strong>Servings</strong><em>{note.servings}</em></div>
              )}
              {note.cuisine && (
                <div className="nd-meta"><span>🌍</span><strong>Cuisine</strong><em>{note.cuisine}</em></div>
              )}
            </div>
          )}
        </div>

        {/* Conflict warning */}
        {conflicts.length > 0 && (
          <div className="nd-conflict" role="alert">
            <span className="nd-conflict-icon" aria-hidden="true">⚠️</span>
            <div>
              <strong>Conflicts with your {conflicts.map((c) => c.dietType).join(', ')} diet</strong>
              {conflicts.map((c) => (
                <p key={c.dietType}>
                  <em>{c.reason}.</em> Flagged ingredients:{' '}
                  {c.matched.map((m) => <span key={m} className="nd-conflict-chip">{m}</span>)}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* ── RECIPE ── */}
        {note.category === 'recipe' && (
          <div className="nd-recipe-layout">
            <section className="nd-section nd-ingredients">
              <h2>Ingredients</h2>
              {ingredientList.length > 0 ? (
                <ul>
                  {ingredientList.map((ing, i) => (
                    <li key={i}><span className="nd-check" aria-hidden="true">✓</span>{ing}</li>
                  ))}
                </ul>
              ) : (
                <p className="nd-empty-text">No ingredients listed.</p>
              )}
            </section>

            <section className="nd-section nd-instructions">
              <h2>Instructions</h2>
              {instructionSteps.length > 0 ? (
                <ol className="nd-steps">
                  {instructionSteps.map((step, i) => (
                    <li key={i} className="nd-step">
                      <span className="nd-step-bubble">{i + 1}</span>
                      <span className="nd-step-text">{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="nd-empty-text">No instructions recorded.</p>
              )}
            </section>
          </div>
        )}

        {/* ── ARTICLE ── */}
        {note.category === 'article' && (
          <section className="nd-section">
            {note.articleUrl && (
              <a href={note.articleUrl} target="_blank" rel="noopener noreferrer" className="nd-article-btn">
                🔗 Read Original Article
              </a>
            )}
            {note.excerpt && (
              <div className="nd-excerpt">
                <h2>Summary</h2>
                <p>{note.excerpt}</p>
              </div>
            )}
            {note.content && (
              <div className="nd-body">
                <h2>My Notes</h2>
                <p>{note.content}</p>
              </div>
            )}
          </section>
        )}

        {/* ── DIET ── */}
        {note.category === 'diet' && (
          <section className="nd-section">
            <h2>Plan &amp; Description</h2>
            <p className="nd-body-text">{note.content}</p>
          </section>
        )}

        {/* ── PERSONAL ── */}
        {note.category === 'personal' && (
          <section className="nd-section">
            <p className="nd-body-text">{note.content}</p>
          </section>
        )}

        {/* Source link for recipes */}
        {note.category === 'recipe' && note.sourceUrl && (
          <p className="nd-source">
            Source: <a href={note.sourceUrl} target="_blank" rel="noopener noreferrer">{note.sourceUrl}</a>
          </p>
        )}

        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="nd-tags">
            {note.tags.map((t) => <span key={t} className="nd-tag">#{t}</span>)}
          </div>
        )}

        {/* Footer */}
        <div className="nd-footer">
          <p className="nd-date">
            Saved {fmtDate(note.createdAt)}
            {note.updatedAt && note.updatedAt.seconds !== note.createdAt?.seconds && (
              <> · Updated {fmtDate(note.updatedAt)}</>
            )}
          </p>
          <div className="nd-actions">
            <button className={`nd-btn-pin${note.pinned ? ' nd-btn-unpin' : ''}`} onClick={togglePin}>
              {note.pinned ? 'Unpin' : '📌 Pin'}
            </button>
            <button className="nd-btn-edit" onClick={handleEdit}>Edit</button>
            <button className="nd-btn-delete" onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </main>
    </div>
  );
}
