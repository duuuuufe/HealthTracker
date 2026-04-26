import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import '../styles/Notes.css';

const CATEGORY_LABELS = { recipe: 'Recipes', article: 'Articles', diet: 'Diet', personal: 'Notes' };
const CATEGORY_ICONS  = { recipe: '🍽️', article: '📰', diet: '🥗', personal: '📝' };

const DIET_TYPES = [
  'General Healthy', 'Keto', 'Mediterranean', 'Vegan', 'Vegetarian',
  'Paleo', 'Low-Carb', 'Low-Fat', 'Low-Sodium', 'Gluten-Free',
  'Dairy-Free', 'DASH Diet', 'Whole30', 'Intermittent Fasting', 'Other',
];

// ── Diet conflict rules ──
// Each entry: list of forbidden keywords (word-boundary matched, case-insensitive)
// plus a short human-readable reason.
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

function findRecipeConflicts(recipe, diets) {
  if (recipe.category !== 'recipe' || !diets.length) return [];
  const text = `${recipe.ingredients || ''}\n${recipe.title || ''}\n${recipe.content || ''}`;
  const conflicts = [];
  for (const diet of diets) {
    const rules = DIET_RULES[diet.dietType];
    if (!rules || !rules.forbidden.length) continue;
    const matched = [];
    for (const term of rules.forbidden) {
      const re = new RegExp(`\\b${escapeRe(term)}\\b`, 'i');
      if (re.test(text)) matched.push(term);
    }
    if (matched.length) {
      conflicts.push({
        dietType: diet.dietType,
        dietTitle: diet.title,
        matched,
        reason: rules.reason,
      });
    }
  }
  return conflicts;
}

const EMPTY_FORM = {
  category: 'personal',
  title: '', content: '', pinned: false, tags: '',
  // recipe
  ingredients: '', cuisine: '', prepTime: '', servings: '',
  imageUrl: '', sourceUrl: '', mealDbId: '',
  // article
  articleUrl: '', excerpt: '',
  // diet
  dietType: 'General Healthy',
};

export default function Notes() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [notes, setNotes]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearch]  = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [errors, setErrors]       = useState({});
  const [saving, setSaving]       = useState(false);

  // TheMealDB state
  const [mealQuery, setMealQuery]       = useState('');
  const [mealResults, setMealResults]   = useState([]);
  const [mealSearching, setMealSearching] = useState(false);
  const [showMealSearch, setShowMealSearch] = useState(false);
  const [suggestions, setSuggestions]     = useState([]);
  const [showSuggest, setShowSuggest]     = useState(false);

  // ── Real-time listener ──
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'users', user.uid, 'notes'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // ── Open edit form when arriving from detail page via ?edit=<id> ──
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || notes.length === 0) return;
    const target = notes.find((n) => n.id === editId);
    if (target) {
      startEdit(target);
      // clear the param so refreshes don't re-open
      setSearchParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, notes]);

  // ── Helpers ──
  const setField = (field) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((err) => ({ ...err, [field]: '' }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditingId(null);
    setShowForm(false);
    setShowMealSearch(false);
    setMealResults([]);
    setMealQuery('');
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (form.category === 'recipe' && !form.ingredients.trim())
      e.ingredients = 'At least one ingredient is required';
    if (form.category === 'article' && !form.articleUrl.trim())
      e.articleUrl = 'Article URL is required';
    if ((form.category === 'diet' || form.category === 'personal') && !form.content.trim())
      e.content = 'Content is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Create / Update ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    const tags = form.tags.split(',').map((t) => t.trim()).filter(Boolean);
    const payload = {
      category: form.category,
      title: form.title.trim(),
      content: form.content.trim(),
      pinned: form.pinned,
      tags,
      updatedAt: Timestamp.now(),
    };
    if (form.category === 'recipe') {
      Object.assign(payload, {
        ingredients: form.ingredients.trim(),
        cuisine:     form.cuisine.trim(),
        prepTime:    form.prepTime.trim(),
        servings:    form.servings.trim(),
        imageUrl:    form.imageUrl.trim(),
        sourceUrl:   form.sourceUrl.trim(),
        mealDbId:    form.mealDbId,
      });
    }
    if (form.category === 'article') {
      Object.assign(payload, {
        articleUrl: form.articleUrl.trim(),
        excerpt:    form.excerpt.trim(),
      });
    }
    if (form.category === 'diet') {
      payload.dietType = form.dietType;
    }
    try {
      if (editingId) {
        await updateDoc(doc(db, 'users', user.uid, 'notes', editingId), payload);
      } else {
        await addDoc(collection(db, 'users', user.uid, 'notes'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
      }
      resetForm();
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──
  const startEdit = (note) => {
    setForm({
      category:    note.category,
      title:       note.title       || '',
      content:     note.content     || '',
      ingredients: note.ingredients || '',
      cuisine:     note.cuisine     || '',
      prepTime:    note.prepTime    || '',
      servings:    note.servings    || '',
      imageUrl:    note.imageUrl    || '',
      sourceUrl:   note.sourceUrl   || '',
      mealDbId:    note.mealDbId    || '',
      articleUrl:  note.articleUrl  || '',
      excerpt:     note.excerpt     || '',
      dietType:    note.dietType    || 'General Healthy',
      pinned:      note.pinned      || false,
      tags:        (note.tags || []).join(', '),
    });
    setEditingId(note.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Delete ──
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this note?')) return;
    await deleteDoc(doc(db, 'users', user.uid, 'notes', id));
  };

  // ── Pin toggle ──
  const togglePin = async (note) => {
    await updateDoc(doc(db, 'users', user.uid, 'notes', note.id), {
      pinned: !note.pinned,
      updatedAt: Timestamp.now(),
    });
  };

  // ── TheMealDB: debounced auto-suggest ──
  useEffect(() => {
    const q = mealQuery.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res  = await fetch(
          `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`,
        );
        const data = await res.json();
        if (!cancelled) setSuggestions((data.meals || []).slice(0, 6));
      } catch {
        if (!cancelled) setSuggestions([]);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [mealQuery]);

  // ── TheMealDB search ──
  const searchMeals = async () => {
    if (!mealQuery.trim()) return;
    setMealSearching(true);
    try {
      const res  = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(mealQuery)}`,
      );
      const data = await res.json();
      setMealResults(data.meals || []);
    } catch {
      setMealResults([]);
    } finally {
      setMealSearching(false);
    }
  };

  const importMeal = (meal) => {
    const lines = [];
    for (let i = 1; i <= 20; i++) {
      const ing     = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ing && ing.trim()) lines.push(`${measure ? measure.trim() + ' ' : ''}${ing.trim()}`);
    }
    setForm((f) => ({
      ...f,
      category:    'recipe',
      title:       meal.strMeal        || f.title,
      cuisine:     meal.strArea        || '',
      content:     meal.strInstructions || '',
      ingredients: lines.join('\n'),
      imageUrl:    meal.strMealThumb   || '',
      sourceUrl:   meal.strSource      || '',
      mealDbId:    meal.idMeal         || '',
    }));
    setShowMealSearch(false);
    setMealResults([]);
  };

  // ── Filtering ──
  const filtered = notes.filter((n) => {
    if (activeTab !== 'all' && n.category !== activeTab) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      n.title?.toLowerCase().includes(q) ||
      n.content?.toLowerCase().includes(q) ||
      n.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  const pinned   = filtered.filter((n) => n.pinned);
  const unpinned = filtered.filter((n) => !n.pinned);

  // Diet notes the user has saved — used to flag conflicting recipes.
  const activeDiets = useMemo(
    () => notes.filter((n) => n.category === 'diet' && n.dietType),
    [notes],
  );

  const fmtDate = (ts) => {
    if (!ts) return '';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const openAddForm = () => {
    const cat = activeTab === 'all' ? 'personal' : activeTab;
    setForm({ ...EMPTY_FORM, category: cat });
    setShowForm(true);
  };

  // ── Card renderer ──
  const renderCard = (note) => {
    const conflicts = findRecipeConflicts(note, activeDiets);
    const hasConflict = conflicts.length > 0;
    return (
    <div
      key={note.id}
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/notes/${note.id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/notes/${note.id}`);
        }
      }}
      className={
        `note-card note-card-${note.category} note-card-clickable` +
        (note.pinned ? ' note-pinned' : '') +
        (hasConflict ? ' note-conflict' : '')
      }
    >
      {note.pinned && <div className="pin-badge">📌 Pinned</div>}

      {hasConflict && (
        <div className="note-conflict-banner" role="alert">
          <span className="conflict-icon" aria-hidden="true">⚠️</span>
          <div className="conflict-body">
            <strong>
              Conflicts with your {conflicts.map((c) => c.dietType).join(', ')} diet
            </strong>
            {conflicts.map((c) => (
              <p key={c.dietType} className="conflict-line">
                <em>{c.reason}.</em> Flagged: {c.matched.map((m) => (
                  <span key={m} className="conflict-chip">{m}</span>
                ))}
              </p>
            ))}
          </div>
        </div>
      )}

      <div className="note-card-top">
        <span className={`note-cat-badge note-cat-${note.category}`}>
          {CATEGORY_ICONS[note.category]} {CATEGORY_LABELS[note.category]}
        </span>
        {note.category === 'diet'   && note.dietType && <span className="note-sub-badge">{note.dietType}</span>}
        {note.category === 'recipe' && note.cuisine  && <span className="note-sub-badge">{note.cuisine}</span>}
      </div>

      {note.imageUrl && note.category === 'recipe' && (
        <img src={note.imageUrl} alt={note.title} className="note-recipe-img" />
      )}

      <div className="note-card-body">
        <h3 className="note-title">{note.title}</h3>

        {note.category === 'recipe' && (note.prepTime || note.servings) && (
          <div className="note-recipe-meta">
            {note.prepTime && <span>⏱ {note.prepTime}</span>}
            {note.servings && <span>🍴 {note.servings} servings</span>}
          </div>
        )}

        {note.category === 'article' && note.articleUrl && (
          <a
            href={note.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="note-article-link"
            onClick={(e) => e.stopPropagation()}
          >
            🔗 Read Article
          </a>
        )}
        {note.excerpt && <p className="note-excerpt">{note.excerpt}</p>}

        {note.content && (
          <p className="note-preview">
            {note.content.length > 150 ? note.content.slice(0, 150) + '…' : note.content}
          </p>
        )}

        {note.tags && note.tags.length > 0 && (
          <div className="note-tags">
            {note.tags.map((t) => <span key={t} className="note-tag">#{t}</span>)}
          </div>
        )}
        <p className="note-date">Saved {fmtDate(note.createdAt)}</p>
      </div>

      <div className="note-card-actions" onClick={(e) => e.stopPropagation()}>
        <button
          className={`btn-pin${note.pinned ? ' btn-unpin' : ''}`}
          onClick={(e) => { e.stopPropagation(); togglePin(note); }}
        >
          {note.pinned ? 'Unpin' : '📌 Pin'}
        </button>
        <button
          className="btn-edit"
          onClick={(e) => { e.stopPropagation(); startEdit(note); }}
        >
          Edit
        </button>
        <button
          className="btn-delete"
          onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}
        >
          Delete
        </button>
      </div>
    </div>
    );
  };

  return (
    <div className="notes-page">
      {/* ── Nav ── */}
      <header className="dash-nav">
        <Link to="/" className="dash-logo">&#10084; HealthSimplify</Link>
        <Link to="/dashboard" className="notes-back-link">&larr; Dashboard</Link>
      </header>

      <main className="notes-main">
        {/* ── Page Header ── */}
        <div className="notes-header">
          <div>
            <h1>Notes &amp; Recipes</h1>
            <p>Store recipes, pin health articles, track diet plans, and write personal health notes.</p>
          </div>
          {!showForm && (
            <button className="notes-btn-add" onClick={openAddForm}>+ Add Note</button>
          )}
        </div>

        {/* ── Add / Edit Form ── */}
        {showForm && (
          <form className="note-form" onSubmit={handleSubmit}>
            <h2>{editingId ? 'Edit Note' : 'New Note'}</h2>

            {/* Category picker */}
            <div className="field note-full">
              <label>Category</label>
              <div className="cat-selector">
                {['recipe', 'article', 'diet', 'personal'].map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`cat-btn cat-btn-${c}${form.category === c ? ' cat-btn-active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, category: c }))}
                  >
                    {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div className="field note-full">
              <label>Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={setField('title')}
                placeholder={
                  form.category === 'recipe'   ? 'e.g. Grilled Salmon with Lemon'
                  : form.category === 'article' ? 'e.g. Benefits of the Mediterranean Diet'
                  : form.category === 'diet'    ? 'e.g. My Keto Plan'
                  : 'e.g. Post-workout recovery routine'
                }
              />
              {errors.title && <span className="field-error">{errors.title}</span>}
            </div>

            {/* ── RECIPE fields ── */}
            {form.category === 'recipe' && (
              <>
                {/* MealDB search */}
                <div className="field note-full">
                  <div className="mealdb-toggle-row">
                    <label>Import from Open Recipe Database</label>
                    <button
                      type="button"
                      className="btn-mealdb-toggle"
                      onClick={() => setShowMealSearch((v) => !v)}
                    >
                      {showMealSearch ? '✕ Close Search' : '🔍 Search Recipes'}
                    </button>
                  </div>

                  {showMealSearch && (
                    <div className="mealdb-panel">
                      <div className="mealdb-search-wrap">
                        <div className="mealdb-input-row">
                          <input
                            type="text"
                            placeholder="Search TheMealDB (e.g. chicken, pasta, salmon)…"
                            value={mealQuery}
                            onChange={(e) => setMealQuery(e.target.value)}
                            onFocus={() => setShowSuggest(true)}
                            onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                setShowSuggest(false);
                                searchMeals();
                              } else if (e.key === 'Escape') {
                                setShowSuggest(false);
                              }
                            }}
                          />
                          <button type="button" onClick={() => { setShowSuggest(false); searchMeals(); }} disabled={mealSearching}>
                            {mealSearching ? 'Searching…' : 'Search'}
                          </button>
                        </div>

                        {showSuggest && suggestions.length > 0 && (
                          <ul className="mealdb-suggest">
                            {suggestions.map((s) => (
                              <li key={s.idMeal}>
                                <button
                                  type="button"
                                  className="mealdb-suggest-item"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => {
                                    importMeal(s);
                                    setShowSuggest(false);
                                    setSuggestions([]);
                                  }}
                                >
                                  {s.strMealThumb && (
                                    <img src={`${s.strMealThumb}/preview`} alt="" />
                                  )}
                                  <span className="mealdb-suggest-info">
                                    <strong>{s.strMeal}</strong>
                                    <em>{s.strArea} · {s.strCategory}</em>
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {mealResults.length > 0 && (
                        <div className="mealdb-results">
                          {mealResults.map((meal) => (
                            <div key={meal.idMeal} className="mealdb-result-item">
                              {meal.strMealThumb && (
                                <img src={`${meal.strMealThumb}/preview`} alt={meal.strMeal} />
                              )}
                              <div className="mealdb-result-info">
                                <strong>{meal.strMeal}</strong>
                                <span>{meal.strArea} &bull; {meal.strCategory}</span>
                              </div>
                              <button
                                type="button"
                                className="btn-import"
                                onClick={() => importMeal(meal)}
                              >
                                Import
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {mealResults.length === 0 && !mealSearching && mealQuery.trim() && (
                        <p className="mealdb-empty">No recipes found — try a different search term.</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="note-form-grid">
                  <div className="field">
                    <label>Cuisine</label>
                    <input type="text" value={form.cuisine} onChange={setField('cuisine')} placeholder="e.g. Italian" />
                  </div>
                  <div className="field">
                    <label>Prep Time</label>
                    <input type="text" value={form.prepTime} onChange={setField('prepTime')} placeholder="e.g. 30 mins" />
                  </div>
                  <div className="field">
                    <label>Servings</label>
                    <input type="text" value={form.servings} onChange={setField('servings')} placeholder="e.g. 4" />
                  </div>
                  <div className="field">
                    <label>Image URL</label>
                    <input type="url" value={form.imageUrl} onChange={setField('imageUrl')} placeholder="https://…" />
                  </div>
                </div>

                <div className="field note-full">
                  <label>Ingredients *</label>
                  <textarea
                    rows={6}
                    value={form.ingredients}
                    onChange={setField('ingredients')}
                    placeholder={'1 cup flour\n2 large eggs\n1/2 tsp salt\n…'}
                  />
                  {errors.ingredients && <span className="field-error">{errors.ingredients}</span>}
                </div>

                <div className="field note-full">
                  <label>Instructions</label>
                  <textarea
                    rows={7}
                    value={form.content}
                    onChange={setField('content')}
                    placeholder="Step 1: Preheat oven to 375°F…"
                  />
                </div>

                <div className="field note-full">
                  <label>Source / Recipe URL</label>
                  <input type="url" value={form.sourceUrl} onChange={setField('sourceUrl')} placeholder="https://…" />
                </div>
              </>
            )}

            {/* ── ARTICLE fields ── */}
            {form.category === 'article' && (
              <>
                <div className="field note-full">
                  <label>Article URL *</label>
                  <input
                    type="url"
                    value={form.articleUrl}
                    onChange={setField('articleUrl')}
                    placeholder="https://…"
                  />
                  {errors.articleUrl && <span className="field-error">{errors.articleUrl}</span>}
                </div>
                <div className="field note-full">
                  <label>Excerpt / Summary</label>
                  <textarea
                    rows={3}
                    value={form.excerpt}
                    onChange={setField('excerpt')}
                    placeholder="A brief summary of the article…"
                  />
                </div>
                <div className="field note-full">
                  <label>Personal Notes</label>
                  <textarea
                    rows={4}
                    value={form.content}
                    onChange={setField('content')}
                    placeholder="What did you find valuable about this article?"
                  />
                </div>
              </>
            )}

            {/* ── DIET fields ── */}
            {form.category === 'diet' && (
              <>
                <div className="field">
                  <label>Diet Type</label>
                  <select value={form.dietType} onChange={setField('dietType')}>
                    {DIET_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="field note-full">
                  <label>Description / Plan *</label>
                  <textarea
                    rows={8}
                    value={form.content}
                    onChange={setField('content')}
                    placeholder="Describe your diet goals, allowed foods, foods to avoid, meal timing tips…"
                  />
                  {errors.content && <span className="field-error">{errors.content}</span>}
                </div>
              </>
            )}

            {/* ── PERSONAL NOTE fields ── */}
            {form.category === 'personal' && (
              <div className="field note-full">
                <label>Note *</label>
                <textarea
                  rows={9}
                  value={form.content}
                  onChange={setField('content')}
                  placeholder="Write your health note here…"
                />
                {errors.content && <span className="field-error">{errors.content}</span>}
              </div>
            )}

            {/* Tags + Pin */}
            <div className="field note-full">
              <label>Tags</label>
              <input
                type="text"
                value={form.tags}
                onChange={setField('tags')}
                placeholder="e.g. heart-health, low-sodium, favorite (comma-separated)"
              />
            </div>

            <div className="note-pin-row">
              <label className="pin-label">
                <input type="checkbox" checked={form.pinned} onChange={setField('pinned')} />
                Pin this note to the top
              </label>
            </div>

            <div className="note-form-actions">
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Note'}
              </button>
              <button type="button" className="btn-cancel" onClick={resetForm}>Cancel</button>
            </div>
          </form>
        )}

        {/* ── Search + Tabs ── */}
        {!showForm && (
          <>
            <div className="notes-search-bar">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="Search notes, recipes, articles…"
                value={searchQuery}
                onChange={(e) => setSearch(e.target.value)}
              />
              {searchQuery && (
                <button className="search-clear" onClick={() => setSearch('')} aria-label="Clear search">✕</button>
              )}
            </div>

            <div className="notes-tabs">
              {['all', 'recipe', 'article', 'diet', 'personal'].map((c) => (
                <button
                  key={c}
                  className={`notes-tab${activeTab === c ? ' notes-tab-active' : ''}`}
                  onClick={() => setActiveTab(c)}
                >
                  {c !== 'all' && CATEGORY_ICONS[c] + ' '}
                  {c === 'all' ? 'All' : CATEGORY_LABELS[c]}
                  <span className="tab-count">
                    {c === 'all' ? notes.length : notes.filter((n) => n.category === c).length}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Notes Grid ── */}
        {loading ? (
          <div className="notes-loading">Loading notes…</div>
        ) : filtered.length === 0 ? (
          <div className="notes-empty">
            <span className="notes-empty-icon">
              {activeTab === 'recipe' ? '🍽️'
               : activeTab === 'article' ? '📰'
               : activeTab === 'diet' ? '🥗'
               : activeTab === 'personal' ? '📝'
               : '📒'}
            </span>
            <p>
              {searchQuery
                ? 'No notes match your search.'
                : activeTab === 'all'
                ? "No notes yet — add your first note!"
                : `No ${CATEGORY_LABELS[activeTab]?.toLowerCase()} saved yet.`}
            </p>
            {!showForm && (
              <button className="notes-btn-add" onClick={openAddForm}>+ Add Note</button>
            )}
          </div>
        ) : (
          <>
            {pinned.length > 0 && (
              <section className="notes-section">
                <h2 className="notes-section-title">📌 Pinned</h2>
                <div className="notes-grid">{pinned.map(renderCard)}</div>
              </section>
            )}
            {unpinned.length > 0 && (
              <section className="notes-section">
                {pinned.length > 0 && <h2 className="notes-section-title">All Notes</h2>}
                <div className="notes-grid">{unpinned.map(renderCard)}</div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
