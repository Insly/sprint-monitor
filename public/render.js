// MGA Sprint Board: the page's render code (ES module, no build step). index.html imports it after the
// maintenance check (public/status.json), so nothing here runs while the maintenance panel shows.
import {
  context, sprintDates, sprintByLabel, sprintDetail, keyTimes, zonedNow, formatAcrossZones,
  deviceDiffersFromTallinn, toKey, addDays, fmtDay, fmtDM, isWeekendDay, workingDaysIn, actionsFor,
  ANCHOR, LAST_CONFIRMED, UNCONFIRMED_FROM, ROLES, isNumbered, sprintPhase, ruleTime,
} from './schedule.js';
import { resolveDay, deployPeople, holidayNotice, NOT_ASSIGNED, dayFacts, untilText, sortWithinDay, dutyParts } from './board.js';

// ---------------------------------------------------------------- data (each file may fail on its own)
let RULES = null, SOURCES = {}, DUTY = null, HOLIDAYS = [];
try { const m = await import('./rules.js'); RULES = Array.isArray(m.RULES) ? m.RULES : null; SOURCES = m.SOURCES || {}; }
catch (err) { console.error('rules.js failed to load', err); }
try { DUTY = await import('./duty.js'); } catch { DUTY = null; }
try { const m = await import('./holidays.js'); HOLIDAYS = Array.isArray(m.HOLIDAYS) ? m.HOLIDAYS : []; } catch { HOLIDAYS = []; }

// ---------------------------------------------------------------- helpers
const $ = (id) => document.getElementById(id);
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') for (const [p, x] of Object.entries(v)) el.style.setProperty(p, x);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}
// Sections the viewer can fold. Open by default; a fold lasts for this page visit only (nothing stored).
const folded = new Set();
// Panel (READABILITY.md §3.2) in the disclosure pattern (review B5): tag, <h2><button>title</button></h2>, the open
// aside (count), the inline chevron, then the folded summary; below it the body the button shows and hides.
// CSS shows the aside only when open and "Folded · summary" only when folded. The button's name is the title only;
// the visible aside or summary is its description.
function foldable(key, { tag, title, id = null, tabindex = null, aside = null, sum = null }, ...body) {
  const open = !folded.has(key);
  const bodyId = `fold-${key}`;
  return h('div', { class: `fold${open ? ' is-open' : ''}`, 'data-fold': key },
    h('div', { class: 'fold-head' }, h('div', { class: 'sec-head' },
      h('span', { class: 'ltag', 'aria-hidden': 'true' }, tag),
      h('h2', { id, tabindex }, h('button', { type: 'button', class: 'fold-btn', 'data-focus-key': `fold:${key}`,
        'aria-expanded': String(open), 'aria-controls': bodyId, 'aria-describedby': open ? (aside ? `${bodyId}-aside` : null) : `${bodyId}-sum` }, title)),
      aside ? h('span', { class: 'aside', id: `${bodyId}-aside` }, aside) : null,
      h('i', { class: 'chev', 'aria-hidden': 'true' }),
      h('span', { class: 'aside sum', id: `${bodyId}-sum` }, h('b', null, 'Folded'), sum ? ` · ${sum}` : null))),
    h('div', { class: 'fold-body', id: bodyId, hidden: !open }, body));
}
/** Open or fold a panel (also the static cycle explainer). */
function setFold(panel, open) {
  const btn = panel.querySelector(':scope > .fold-head .fold-btn');
  const body = $(btn.getAttribute('aria-controls'));
  panel.classList.toggle('is-open', open);
  btn.setAttribute('aria-expanded', String(open));
  body.hidden = !open;
  const aside = panel.querySelector(':scope > .fold-head .aside:not(.sum)');
  const desc = open ? aside && aside.id : panel.querySelector(':scope > .fold-head .sum').id;
  if (desc) btn.setAttribute('aria-describedby', desc); else btn.removeAttribute('aria-describedby');
  if (open) folded.delete(panel.dataset.fold); else folded.add(panel.dataset.fold);
}
document.addEventListener('click', (e) => {
  const btn = e.target.closest && e.target.closest('.fold-btn');
  if (btn) setFold(btn.closest('.fold'), btn.getAttribute('aria-expanded') !== 'true');
});
const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
// Phone extras (READABILITY.md §6.1): Coming up shows 3 working days at ≤767 px, 7 above.
const phoneMQ = matchMedia('(max-width: 767px)');
const fill = (el, ...kids) => el.replaceChildren(...kids.flat(Infinity).filter((k) => k != null && k !== false));
const safeUrl = (u) => (typeof u === 'string' && /^https:\/\//i.test(u) ? u : null);
const ext = (href, text) => (safeUrl(href) ? h('a', { href, target: '_blank', rel: 'noopener noreferrer' }, `${text} ↗`) : null);
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtLong(key) { const [y, m, d] = key.split('-').map(Number); const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); return `${DAYS_LONG[wd]} ${d} ${MONTHS_LONG[m - 1]} ${y}`; }
const ROLE_LABEL = { 'IM/AM': 'IM / AM' };
const roleLabel = (r) => ROLE_LABEL[r] || r;
const ROLE_TIP = { 'IM/AM': 'IM, AM and project managers', Lead: 'Dev team leads and delivery leads', Everyone: 'All roles' };
const ROLE_PARAM = { imam: 'IM/AM', dev: 'Dev', qa: 'QA', lead: 'Lead', analyst: 'Analyst', everyone: 'Everyone' };
const PICK_ORDER = ['IM/AM', 'Dev', 'QA', 'Lead', 'Analyst', 'Everyone'];
const confluenceSearch = (text) => `https://insly.atlassian.net/wiki/search?text=${encodeURIComponent(`"${text}"`)}`;
const TALLINN_NOTE = () => (deviceDiffersFromTallinn() ? ' (Tallinn time)' : '');

// ---------------------------------------------------------------- role (one stored key)
const ROLE_KEY = 'mgaSprintBoard.role';
function loadRole() {
  try {
    const r = localStorage.getItem(ROLE_KEY);
    if (r === 'All') return 'Everyone'; // v1 stored "All"
    return ROLES.includes(r) ? r : null;
  } catch { return null; }
}
function saveRole(r) { try { localStorage.setItem(ROLE_KEY, r); } catch { /* storage blocked: the role holds for this visit */ } }
const paramRole = ROLE_PARAM[(new URLSearchParams(location.search).get('role') || '').toLowerCase()] || null;
if (paramRole) saveRole(paramRole);
let storedRole = paramRole || loadRole();
const firstVisit = storedRole == null;
let role = storedRole || 'Everyone';
let sprintViewEveryone = false; // the sprint view's own toggle; never stored, never in the URL

// ---------------------------------------------------------------- route: #date-YYYY-MM-DD, #sprint-LABEL, combined with "~"
const SAFE = /^[A-Za-z0-9._~-]+$/;
function readRoute() {
  const out = { date: null, sprint: null, sprintRaw: null };
  // A malformed link (e.g. #%E0) must not blank the page: treat it as no route (review 2.1).
  let hash = '';
  try { hash = decodeURIComponent(location.hash.slice(1)); } catch { hash = ''; }
  if (hash && SAFE.test(hash)) {
    for (const seg of hash.split('~')) {
      if (seg.startsWith('date-')) { try { out.date = toKey(seg.slice(5)); } catch { /* ignore */ } }
      else if (seg.startsWith('sprint-')) { out.sprintRaw = seg.slice(7); out.sprint = sprintByLabel(out.sprintRaw); }
    }
  }
  if (!out.date) {
    const q = new URLSearchParams(location.search).get('date');
    if (q && SAFE.test(q)) { try { out.date = toKey(q); } catch { /* ignore */ } }
  }
  return out;
}
function routeHref({ date = null, sprint = null } = {}) {
  const parts = [];
  if (date) parts.push(`date-${date}`);
  if (sprint) parts.push(`sprint-${sprint}`);
  return parts.length ? `#${parts.join('~')}` : '#';
}

// ---------------------------------------------------------------- clock
let previewTime = null; // "Show after 12:00" toggle on a previewed cut-off day
function now() {
  const route = readRoute();
  const real = zonedNow();
  const preview = route.date && route.date !== real.date ? route.date : null;
  return { route, real, preview, date: preview || real.date, time: preview ? (previewTime || '09:00') : real.time };
}

// ---------------------------------------------------------------- favicon
function setFavicon(kind) {
  const svg = kind === 'key'
    ? "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='3' fill='#1A1A1A'/><rect x='3' y='3' width='10' height='10' rx='1' fill='none' stroke='#FF7D00' stroke-width='2'/></svg>"
    : "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><rect width='16' height='16' rx='3' fill='#FF7D00'/></svg>";
  $('favicon').href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------- top bar and role controls
function renderTop(n, model) {
  $('date-long').textContent = fmtLong(n.date);
  $('date-short').textContent = fmtDay(n.date);
  const c = context(n.date);
  $('day-short').textContent = model && model.range ? model.range.text : c.dayOfSprint ? `${c.current.label} · day ${c.dayOfSprint}` : `${c.current.label} · weekend`;
  const seg = $('role-seg');
  if (!seg.childElementCount) {
    for (const r of ROLES) {
      const id = `role-${r.replace(/\W/g, '')}`;
      seg.append(h('label', { title: ROLE_TIP[r] || null },
        h('input', { type: 'radio', name: 'role', value: r, id, onchange: () => setRole(r, { from: 'control' }) }),
        h('span', null, roleLabel(r))));
    }
    const sel = $('role-select');
    for (const r of ROLES) sel.append(h('option', { value: r }, roleLabel(r)));
    sel.addEventListener('change', () => setRole(sel.value, { from: 'control' }));
  }
  for (const input of seg.querySelectorAll('input')) input.checked = input.value === role;
  $('role-select').value = role;
  $('viewdate-input').value = n.date;
}

// The one live region (#status). Cleared first, so the same message twice is announced twice.
function announce(text) {
  const st = $('status');
  st.textContent = '';
  setTimeout(() => { st.textContent = text; }, 50);
}

// What the role change shows, counted from the page (review B15): the day's items, or the sprint view's actions.
function roleMessage(r) {
  const who = roleLabel(r);
  if (!$('sprint-view').hidden) {
    const n = $('sprint-view').querySelectorAll('[data-fold="sv-actions"] .cu > li > ul > li').length;
    return n ? `Showing ${plural(n, 'action')} for ${sprintViewEveryone ? 'Everyone' : who}` : `No actions for ${who} in this sprint`;
  }
  const n = $('yourday').querySelectorAll('.fold-body > ul.agenda > li').length;
  const a = lastModel && lastModel.agenda;
  if (n) return `Showing ${plural(n, 'item')} for ${who}`;
  return a && a.weekend ? `Nothing due on ${a.heading} for ${who}` : `Nothing due today for ${who}`;
}

function setRole(r, { from } = {}) {
  role = r;
  storedRole = r;
  saveRole(r);
  render();
  announce(roleMessage(r));
  if (from === 'picker') { const h2 = $('yourday-h'); if (h2) h2.focus(); }
}

// ---------------------------------------------------------------- band (persistent skeleton, h1 text node only when changed)
function renderBand(n, m) {
  const band = $('band');
  band.className = `band band--${m.band}`;
  $('band-tag').textContent = m.tag || '';
  $('band-meta').textContent = m.meta || '';
  // The hidden state tag is skipped when the headline already starts with it ("Cut-off passed. Cut-off passed. …").
  const srTag = m.srTag && !m.headline.startsWith(m.srTag.trim()) ? `${m.srTag.trim()} ` : '';
  if ($('headline-sr').textContent !== srTag) $('headline-sr').textContent = srTag;
  if ($('headline-text').textContent !== m.headline) $('headline-text').textContent = m.headline;
  $('band-sub').textContent = m.sub || '';
  $('band-sub').hidden = !m.sub;
  fill($('band-links'), (m.blinks || []).map((k) => SOURCES[k] && ext(SOURCES[k].url, 'Demo/Live matrix')));

  const right = $('band-right');
  if (m.countdown && !n.preview) {
    const diff = deviceDiffersFromTallinn();
    let yours = null;
    if (diff) {
      const t = new Date(Date.now() + m.countdown.minutes * 60000);
      yours = `${m.countdown.until} Tallinn time = ${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')} your time`;
    }
    fill(right, h('div', { class: 'countdown' },
      h('div', { class: 'big' }, m.countdown.text.replace(/ left$/, '')),
      h('div', { class: 'lbl' }, `left until ${m.countdown.until}`),
      yours && h('div', { class: 'tz' }, yours)));
  } else if (m.countdown && n.preview) {
    fill(right, h('div', { class: 'nextbox' }, h('div', { class: 'k' }, 'Cut-off'), h('div', { class: 'big' }, `${m.countdown.until} today`), h('div', { class: 'what' }, 'No live countdown in a preview')));
  } else if (m.next) {
    fill(right, h('a', { class: 'nextbox nextbox-link', href: linkTo(m.next.href) },
      h('div', { class: 'k' }, m.next.kicker),
      h('div', { class: 'big' }, m.next.big, /,\s\d\d:\d\d$/.test(m.next.big) ? TALLINN_NOTE() : ''),
      h('div', { class: 'what' }, m.next.what, m.next.extra ? [h('br'), m.next.extra] : null)));
  } else fill(right);

  const ol = $('band-order');
  if (m.order) {
    ol.hidden = false;
    fill(ol, m.order.map((s) => h('li', { class: s.state === 'earlier' ? 'earlier' : null, 'aria-current': s.state === 'current' ? 'step' : null },
      h('span', null, s.when), h('b', null, s.what))));
  } else { ol.hidden = true; fill(ol); }
}

// ---------------------------------------------------------------- duty line
function personNodes(people) {
  if (people.every((p) => !p.name)) return [h('span', { class: 'na' }, NOT_ASSIGNED)];
  return people.flatMap((p, i) => [i ? ', ' : null, p.name ? p.name : h('span', { class: 'na' }, NOT_ASSIGNED), p.role ? ` (${p.role})` : null]);
}
function renderDuty(m) {
  const line = m.duty;
  $('duty').hidden = !line;
  if (!line) return;
  // The text comes from board.js dutyParts, as in the tests. A text space after the key keeps screen readers from
  // running "London:" and the name together.
  const p = dutyParts(line);
  const dep = p ? h('span', { class: p.state === 'tonight' ? 'tonight' : null },
    h('span', { class: 'dk' }, p.before, h('a', { href: linkTo(`#sprint-${p.label}`) }, p.label), p.after), p.people.length ? [' ', personNodes(p.people)] : null) : null;
  $('duty').hidden = !dep;
  fill($('duty-inner'), dep);
}

// ---------------------------------------------------------------- your day
const linkTo = (href) => {
  // Keep the previewed date on in-page links (#sprint-… becomes #date-…~sprint-…).
  const r = readRoute();
  const realToday = zonedNow().date;
  if (!href.startsWith('#sprint-') || !r.date || r.date === realToday) return href;
  return routeHref({ date: r.date, sprint: href.slice(8) });
};

function itemLinks(it) {
  const links = [];
  for (const k of it.links || []) if (SOURCES[k]) links.push(ext(SOURCES[k].url, SOURCES[k].title.replace(/ \(.*\)$/, '')));
  if (it.releasePages) {
    links.push(ext(confluenceSearch(`Release ${it.releasePages.release}`), `Release ${it.releasePages.release} page`));
    if (it.releasePages.golive) links.push(ext(confluenceSearch(`Golive Release ${it.releasePages.release}`), `Golive Release ${it.releasePages.release} page`));
  }
  if (it.id === 'revert-missed-fixes' && SOURCES.lifecycle) links.push(ext(SOURCES.lifecycle.url, 'Revert procedure'));
  if (it.tag) links.push(h('a', { href: linkTo(it.tag.href) }, `Sprint ${it.tag.label} ›`));
  if (it.source && SOURCES[it.source]) links.push(ext(SOURCES[it.source].url, 'Source'));
  return links.filter(Boolean);
}

// Copy a fact. Without clipboard access the fact's text is selected instead, as in Home page setup (review B20).
function copyButton(text, shown) {
  return h('button', { type: 'button', class: 'btn', onclick: async (e) => {
    try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied'; announce('Copied'); }
    catch { getSelection().selectAllChildren(shown); e.target.textContent = 'Press Ctrl+C'; }
    setTimeout(() => { e.target.textContent = 'Copy'; }, 2000);
  } }, 'Copy');
}

const KIND_CLASS = { Due: 'due', Meeting: 'meet', Update: 'upd' };
function itemNode(it, { everyoneView = false, todaySlot = false } = {}) {
  const chip = it.chip || { text: 'Check', cls: 'check' };
  const cls = ['item', it.other || chip.cls === 'passed' || chip.cls === 'outl' ? null : KIND_CLASS[chip.text], it.key ? 'key' : null].filter(Boolean).join(' ');
  const roles = everyoneView && Array.isArray(it.who) ? h('span', { class: 'roles' }, it.who.map((w) => h('span', null, w === 'All' ? 'Everyone' : roleLabel(w)))) : null;
  const tagText = it.tag ? (it.tag.text ? `${it.tag.label} · ${it.tag.text}` : it.tag.label) : null;
  return h('li', null, h('details', { class: cls, 'data-k': `item:${it.id}:${it.slot}` },
    h('summary', null,
      // Under a "Today" slot heading the default "Today" is redundant; phones hide it (READABILITY.md §6.4).
      h('span', { class: `when${/^\d\d:\d\d$|^Tonight$|^Now$/.test(it.when || '') ? '' : ' soft'}${todaySlot && (!it.when || it.when === 'Today') ? ' tw' : ''}` }, it.when || 'Today'),
      h('span', { class: `chip ${chip.cls}` }, chip.text),
      h('span', { class: 'ttl' }, it.title, it.sub ? h('small', null, it.sub) : null),
      roles || (tagText ? h('span', { class: 'stag' }, tagText) : h('span')),
      h('i', { class: 'chev', 'aria-hidden': 'true' })),
    h('div', { class: 'more' },
      it.facts.map((f) => { const shown = h('span', null, f.text, TALLINN_NOTE()); return h('div', { class: 'fact' }, shown, copyButton(f.copy, shown)); }),
      h('p', null, it.detail),
      h('div', { class: 'links' }, itemLinks(it)))));
}

// Folded summary (READABILITY.md §3.1): board.js computes it, so the tests read the same text.
const todaySummary = (a) => (a ? a.summary : 'The action list could not load');

function renderYourDay(n, m) {
  const a = m.agenda;
  const kids = [];
  if (firstVisit && storedRole == null) {
    kids.push(h('div', { class: 'picker', role: 'group', 'aria-labelledby': 'picker-h' },
      h('h3', { id: 'picker-h' }, 'Show only what is yours'),
      h('p', null, 'Which of these are you? You can change it any time under "Viewing as".'),
      h('div', { class: 'grid' }, PICK_ORDER.map((r) => h('button', { type: 'button', title: ROLE_TIP[r] || null, onclick: () => setRole(r, { from: 'picker' }) }, roleLabel(r)))),
      // In-page jump without touching the hash: a hash change would end a preview (#date-…).
      h('a', { class: 'new', href: '#cycle', onclick: (e) => { e.preventDefault(); setFold($('cycle'), true); const b = $('cycle-btn'); b.scrollIntoView({ block: 'start' }); b.focus(); } }, 'New here? See how the 2-week cycle works ↓')));
  }
  const heading = a && a.weekend ? `${a.heading} for ${roleLabel(role)}` : `Today for ${roleLabel(role)}`;
  // The picker sits at the top of the Today panel's body, as a card (READABILITY.md §5).
  const head = { tag: '<today>', title: heading, id: 'yourday-h', tabindex: '-1',
    aside: a && a.weekend ? 'Next working day' : a && a.count ? plural(a.count, 'item') : null,
    sum: todaySummary(a) };
  const out = () => fill($('yourday'), foldable('today', head, kids));
  if (m.holidayWarnings && m.holidayWarnings.length) kids.push(h('ul', { class: 'notices' }, m.holidayWarnings.map((w) => h('li', null, h('span', { 'aria-hidden': 'true' }, 'ⓘ '), w.text))));

  if (!a) {
    kids.push(h('p', { class: 'empty' }, m.range ? `${m.range.text}. ${m.sub}` : 'The action list could not load. Sprint dates below are still correct.'));
    out();
    return;
  }
  const everyoneView = role === 'Everyone';
  // A lone "Today" group needs no slot heading (mockup H and J); it saves a row above the fold.
  const loneToday = a.groups.length === 1 && a.groups[0].heading === 'Today';
  a.groups.forEach((g, i) => {
    if (!loneToday) kids.push(h('div', { class: `slot${i === 0 && ['urgent', 'after', 'evening'].includes(m.band) ? ' hot' : ''}` }, g.heading));
    const todaySlot = !loneToday && g.heading === 'Today';
    kids.push(h('ul', { class: 'agenda' }, g.items.map((it) => itemNode(it, { everyoneView, todaySlot }))));
  });
  // Gates for planning follow the day's items directly (mockup H; DESIGN §4.4 fold target for Lead).
  if (a.gates && a.gates.items.length) {
    kids.push(h('details', { class: 'group', open: true, 'data-k': 'gates' },
      h('summary', null, h('b', null, a.gates.heading), h('span', { class: 'cnt' }, `due ${fmtDay(a.gates.due)}`), h('i', { class: 'chev', 'aria-hidden': 'true' })),
      h('ul', { class: 'rows' }, a.gates.items.map((it) => h('li', null, h('b', null, it.title), h('span', null, (it.who || []).map(roleLabel).join(', ')))))));
  }
  if (!a.groups.length) {
    const nf = a.next;
    const x = nf && nf.items[0];
    const next = x ? ` Next: ${x.prefix}${x.title} ${fmtDay(nf.date)}${x.time ? ` ${x.time}` : ''}${x.suffix ? ` (${x.suffix})` : ''}.` : '';
    kids.push(h('p', { class: 'empty' }, `Nothing due for ${roleLabel(role)} ${a.weekend ? `on ${a.heading}` : 'today'}.${next}`));
  }
  if (a.running.length) {
    kids.push(h('details', { class: 'group', open: true, 'data-k': 'running' },
      h('summary', null, h('b', null, 'Running'), h('span', { class: 'cnt' }, String(a.running.length)), h('i', { class: 'chev', 'aria-hidden': 'true' })),
      h('ul', { class: 'rows' }, a.running.map((it) => h('li', null, h('b', null, it.title), h('span', null, [it.tag?.label, it.sub].filter(Boolean).join(' · ')))))));
  }
  if (a.everyday.length) {
    kids.push(h('details', { class: 'group', 'data-k': 'everyday' },
      h('summary', null, h('b', null, 'Every day this sprint'), h('span', { class: 'cnt' }, String(a.everyday.length), h('span', { class: 'cnt-list' }, ` · ${a.everyday.map((x) => x.title).join(' · ')}`)), h('i', { class: 'chev', 'aria-hidden': 'true' })),
      h('ul', { class: 'agenda' }, a.everyday.map((it) => itemNode({ ...it, chip: { text: 'Every day', cls: 'check' }, when: 'Daily' }, { everyoneView })))));
  }
  if (a.next && a.groups.length) {
    const nf = a.next;
    const k = nf.heading; // board.js: "Tomorrow, …" only for the real next day; "Next · …" for Everyone
    // A dot-separated run on >=768 px; on phones a short list of up to 3, then "+N more" (READABILITY.md §6.3).
    kids.push(h('div', { class: 'nextfor' }, h('b', { class: 'k' }, k),
      h('ul', { class: 'nf-list' }, nf.items.map((x, i) => h('li', { class: i >= 3 ? 'nf-x' : null }, x.time ? `${x.time} ` : null, x.prefix, x.title, x.suffix ? h('span', { class: 's' }, ` · ${x.suffix}`) : null)),
        nf.items.length > 3 ? h('li', { class: 'nf-more' }, `+${nf.items.length - 3} more`) : null)));
  }
  out();
  $('body').dataset.band = m.band;
}

// ---------------------------------------------------------------- rail and coming up
function stepsBar(phase) {
  return h('ol', { class: 'steps', 'aria-label': 'Release steps' }, ['Plan', 'Build', 'Freeze', 'UAT', 'Live'].map((p) =>
    h('li', { class: p === phase ? 'now' : null, 'aria-current': p === phase ? 'step' : null }, p)));
}
function renderRail(m) {
  if (m.range) { fill($('rail-sec'), foldable('sprints', { tag: '<sprints>', title: 'Three sprints in play', id: 'rail-h', sum: m.range.text }, h('p', { class: 'empty' }, `${m.range.text}.`))); return; }
  const hot = m.rail.find((r) => r.hot) || m.rail[1] || m.rail[0];
  fill($('rail-sec'),
    foldable('sprints', { tag: '<sprints>', title: 'Three sprints in play', id: 'rail-h', sum: hot ? `${hot.label} · ${hot.phaseLabel}` : null },
    h('ul', { class: 'rail' }, m.rail.map((r) => h('li', { class: r.hot ? 'hot' : null },
      h('div', { class: 'r1' },
        h('a', { class: 'lab', href: linkTo(r.href), 'data-sprint': r.label }, r.label),
        h('span', { class: 'st' }, r.phaseLabel),
        r.unconfirmed ? h('span', { class: 'chip outl' }, 'plain projection') : r.projected ? h('span', { class: 'chip outl' }, 'projected') : null),
      stepsBar(r.phase),
      r.holidayNotice ? h('p', { class: 'note' }, h('span', { 'aria-hidden': 'true' }, 'ⓘ '), r.holidayNotice) : null))),
    m.notices.length ? h('ul', { class: 'notices' }, m.notices.map((t) => h('li', null, h('span', { 'aria-hidden': 'true' }, 'ⓘ '), t))) : null));
}

let cuLimit = null; // working days shown; null = the default for the width (3 on phones, 7 above)
function renderComingUp(m) {
  const days = m.comingUp;
  const limit = cuLimit ?? (phoneMQ.matches ? 3 : 7);
  const visible = days.filter((d) => d.index < limit);
  let nextLimit = limit < 7 ? 7 : 10;
  let hiddenDays = days.filter((d) => d.index >= limit && d.index < nextLimit);
  if (!hiddenDays.length && nextLimit === 7) { nextLimit = 10; hiddenDays = days.filter((d) => d.index >= limit); }
  const first = days[0];
  const sum = first ? `${first.label} · ${first.items.length} for ${role === 'Everyone' ? 'everyone' : 'you'}` : 'Nothing in the next working days';
  fill($('cu-sec'), foldable('coming',
    { tag: '<coming up>', title: `Next ${limit} working days`, id: 'cu-h', aside: roleLabel(role), sum },
    visible.length ? h('ul', { class: 'cu' }, visible.map((d) => h('li', { 'data-focus-key': `cu-day:${d.index}`, tabindex: '-1' },
      h('div', { class: 'd' }, h('b', null, d.label), d.cutoff ? 'cut-off' : null, d.holiday ? h('span', null, ` · ${d.holiday}`) : null),
      h('ul', null, d.items.map((x) => h('li', { class: x.unit ? 'unit' : null },
        x.unit ? h('span', { class: 'sr' }, 'Unit milestone: ') : null,
        x.time ? h('span', { class: 't' }, x.time) : null,
        x.prefix, x.title,
        h('span', { class: x.ifNeeded ? 's ifn' : 's' }, x.suffix || ''))))))) : h('p', { class: 'empty' }, 'Nothing in the next working days.'),
    hiddenDays.length && limit < 10 ? h('button', { type: 'button', class: 'btn cu-more', 'data-focus-key': 'cu-more', onclick: () => {
      // Focus moves to the first newly shown day (review B4); the button itself is gone or moved.
      cuLimit = nextLimit; renderComingUp(lastModel);
      const first = $('cu-sec').querySelector(`[data-focus-key="cu-day:${hiddenDays[0].index}"]`);
      if (first) first.focus();
    } }, `+${plural(hiddenDays.length, 'more day', 'more days')} to ${hiddenDays[hiddenDays.length - 1].label}`) : null));
}

// ---------------------------------------------------------------- preview bar
function renderPreview(n) {
  const el = $('preview');
  if (!n.preview) { el.hidden = true; fill(el); previewTime = null; return; }
  el.hidden = false;
  const r = n.route;
  const go = (d) => { previewTime = null; location.hash = routeHref({ date: d, sprint: r.sprintRaw && r.sprint != null ? r.sprintRaw : null }); };
  const f = RULES ? dayFacts(n.date, RULES) : null;
  const isCut = f && f.cut;
  const T = keyTimes(RULES || []);
  const cycle = [T.cutoff > '09:00' ? '09:00' : '08:00', '13:00', T.live];
  const nextTime = cycle[(cycle.indexOf(n.time) + 1) % cycle.length];
  fill(el, h('div', { class: 'wrap pad' },
    h('span', null, 'Preview · ', h('b', null, fmtLong(n.date)), isCut ? ` · ${n.time} Tallinn` : null),
    h('button', { type: 'button', class: 'pbtn', 'aria-label': 'Previous day', 'data-focus-key': 'pv-prev', onclick: () => go(addDays(n.date, -1)) }, '‹'),
    h('button', { type: 'button', class: 'pbtn', 'aria-label': 'Next day', 'data-focus-key': 'pv-next', onclick: () => go(addDays(n.date, 1)) }, '›'),
    h('label', { class: 'sr', for: 'pv-date' }, 'Pick a date'),
    h('input', { type: 'date', id: 'pv-date', value: n.date, onchange: (e) => { if (e.target.value) go(e.target.value); } }),
    isCut ? h('button', { type: 'button', class: 'pbtn', 'data-focus-key': 'pv-time', onclick: () => { previewTime = nextTime; render(); } }, `Show at ${nextTime}`) : null,
    h('a', { class: 'back', href: r.sprintRaw ? `#sprint-${r.sprintRaw}` : location.pathname, onclick: (e) => {
      if (!r.sprintRaw) { e.preventDefault(); history.pushState(null, '', location.pathname); render(); }
    } }, 'Back to today')));
}

// ---------------------------------------------------------------- sprint view (#sprint-LABEL)
const MILESTONE_NAME = { planning: 'Sprint planning', start: 'Sprint starts', freezeStart: 'Code freeze starts', bugRetro: 'Bug retro', demoStart: 'Demo update', uatStart: 'UAT opens, Beta reopens', cutoff: 'Fix cut-off', live: 'Live update' };
let returnFocusTo = null;

function renderSprintView(n) {
  const view = $('sprint-view');
  const r = n.route;
  const todayHref = n.preview ? routeHref({ date: n.date }) : '#';
  const sNum = r.sprint;
  const bad = sNum == null || sNum < ANCHOR.number;
  const ctx = context(n.date);
  if (bad) {
    const label = r.sprintRaw || '';
    document.title = `No sprint ${label} · Sprint Board`;
    fill(view, h('div', { class: 'sv-head' }, h('div', { class: 'wrap pad' }, h('div', null,
      h('h1', { tabindex: '-1', id: 'sv-h' }, `No sprint ${label}`),
      h('p', null, h('a', { href: todayHref }, '← Today'), ' · ', h('a', { href: linkTo(`#sprint-${ctx.current.label}`) }, `Current sprint ${ctx.current.label}`))))));
    return;
  }
  const det = sprintDetail(sNum, n.date, RULES || [], { role: sprintViewEveryone ? null : role, time: n.time, holidays: HOLIDAYS });
  const s = det.sprint;
  const T = keyTimes(RULES || []);
  document.title = `${n.preview ? `Preview ${fmtDay(n.date)} · ` : ''}Sprint ${s.label} · Sprint Board`;
  const prev = sNum - 1 >= ANCHOR.number ? sprintDates(sNum - 1) : null;
  const next = isNumbered(sNum + 1) ? sprintDates(sNum + 1) : null; // no link to an unlabelled sprint (review 2.3)
  const svHref = (label) => (n.preview ? routeHref({ date: n.date, sprint: label }) : `#sprint-${label}`);
  // Names can be switched off in duty.js (SHOW_NAMES = false): then only the deploy times show.
  const showNames = Boolean(DUTY) && DUTY.SHOW_NAMES !== false;
  const demoPeople = showNames ? deployPeople(DUTY, 'Demo', s.demoStart) : null;
  const livePeople = showNames ? deployPeople(DUTY, 'Live', s.live) : null;

  const nav = h('nav', { class: 'sv-nav', 'aria-label': 'Sprint navigation' }, h('div', { class: 'wrap pad' },
    h('a', { href: todayHref }, '← Today'),
    h('span', { class: 'sv-arrows' },
      prev ? h('a', { href: svHref(prev.label), 'aria-label': `Previous sprint ${prev.label}` }, `‹ ${prev.label}`) : null,
      next ? h('a', { href: svHref(next.label), 'aria-label': `Next sprint ${next.label}` }, `${next.label} ›`) : null),
    h('button', { type: 'button', class: 'btn', onclick: async () => {
      const url = `${location.origin}${location.pathname}#sprint-${s.label}`;
      try { await navigator.clipboard.writeText(url); announce('Link copied'); } catch { announce(url); }
    } }, 'Copy link')));

  const flags = [];
  if (s.yearEndUnconfirmed) flags.push(h('span', { class: 'chip outl' }, 'plain projection'));
  else if (s.projected) flags.push(h('span', { class: 'chip outl' }, 'projected'));
  const notes = [];
  // A sprint that OVERRIDES make longer than the 2-week cadence (2027-1): its dates, and the release the cadence would have had.
  if (s.end > addDays(s.start, 11)) {
    const yearEnd = s.end.slice(0, 4) !== s.start.slice(0, 4) ? 'year-end ' : '';
    notes.push(`${s.label} is the longer ${yearEnd}sprint (owner): ${fmtDay(s.start)} to ${fmtDay(s.end)}, ${workingDaysIn(s)} working days. There is no release on ${fmtDM(addDays(s.start, 21))}.`);
  }
  if (s.yearEndUnconfirmed) notes.push(`Dates from ${sprintDates(UNCONFIRMED_FROM).label} on are plain projections of the 2-week cadence. Nobody has confirmed them yet.`);
  const notice = holidayNotice(s, HOLIDAYS);

  const head = h('section', { class: 'sv-head' }, h('div', { class: 'wrap pad' },
    h('div', null,
      h('h1', { tabindex: '-1', id: 'sv-h' }, `Sprint ${s.label}`),
      h('p', { class: 'sv-status' }, det.phase.label, ' · ', h('span', { class: 'muted' }, `${fmtDay(s.start)} – ${fmtDay(s.end)} · release ${fmtDay(s.live)}`), ' ', flags),
      h('div', { class: 'sv-steps' }, stepsBar(det.phase.phase)),
      notes.map((t) => h('p', { class: 'muted sv-notep' }, t))),
    h('div', null,
      DUTY ? h('div', { class: 'sv-duty' },
        h('span', { class: 'ltag', 'aria-hidden': 'true' }, '<deploys>'),
        h('div', null, h('span', { class: 'dk' }, `Demo update · ${fmtDay(s.demoStart)} · ${formatAcrossZones(s.demoStart, T.demo)}`), demoPeople ? [h('br'), personNodes(demoPeople)] : null),
        h('div', null, h('span', { class: 'dk' }, `Live update · ${fmtDay(s.live)} · ${formatAcrossZones(s.live, T.live)}`), livePeople ? [h('br'),
          'Lead ', livePeople[0].name || h('span', { class: 'na' }, NOT_ASSIGNED), ' · Backup ', livePeople[1].name || h('span', { class: 'na' }, NOT_ASSIGNED)] : null)) : null,
      notice ? h('div', { class: 'sv-note' }, h('span', { 'aria-hidden': 'true' }, 'ⓘ '), notice) : null)));

  // Timeline with a Today marker as its own list item.
  const holidayOn = (d) => HOLIDAYS.filter((x) => x.date === d);
  const items = [];
  let markerPlaced = false;
  const marker = () => h('li', { class: 'now', 'aria-current': 'step' },
    h('span', { class: 'tld' }, fmtDay(n.date)),
    h('b', null, det.relation === 'current' && ctx.dayOfSprint ? `Today · sprint day ${ctx.dayOfSprint} of ${workingDaysIn(s)}` : 'Today'),
    h('span', { class: 'tls' }));
  let firstComing = true;
  for (const ms of det.milestones) {
    if (!markerPlaced && ms.status !== 'passed') { items.push(marker()); markerPlaced = true; }
    const hol = holidayOn(ms.date);
    let extra = null;
    if (ms.key === 'freezeStart') extra = `until the Demo update ${fmtDay(s.demoStart)} (evening)`;
    if (ms.key === 'uatStart') extra = `UAT deadline ${fmtDay(s.cutoff)} ${T.cutoff}`;
    if (ms.key === 'demoStart' && demoPeople) extra = ['Deployer: ', personNodes(demoPeople)];
    if (ms.key === 'live' && livePeople) extra = livePeople.every((p) => !p.name) ? 'Lead and backup: not assigned yet' : ['Lead: ', livePeople[0].name || NOT_ASSIGNED, ' · Backup: ', livePeople[1].name || NOT_ASSIGNED];
    const status = ms.status === 'passed' ? 'Passed' : ms.status === 'today' ? 'Today'
      : firstComing ? `Coming · in ${ms.workingDaysAway} working day${ms.workingDaysAway === 1 ? '' : 's'}` : 'Coming';
    if (ms.status === 'coming') firstComing = false;
    items.push(h('li', { class: ms.status === 'passed' ? 'past' : null },
      h('span', { class: 'tld' }, fmtDay(ms.date), ms.time ? h('small', null, formatAcrossZones(ms.date, ms.time)) : null),
      h('b', null, MILESTONE_NAME[ms.key], extra ? h('small', null, extra) : null,
        hol.length ? h('small', null, `ⓘ ${[...new Set(hol.map((x) => x.country))].join(', ')} holiday (${hol[0].name})`) : null),
      h('span', { class: 'tls' }, status)));
  }
  if (!markerPlaced) items.push(marker());

  // Actions, grouped Passed / Today / Every day this sprint / Coming. "Running" is kept for Your day's short windows (review 1.14).
  const groups = [['passed', 'Passed', false], ['today', 'Today', true], ['running', 'Every day this sprint', true], ['coming', 'Coming', true]];
  const toggle = role === 'Everyone' ? null : h('div', { class: 'seg2', role: 'radiogroup', 'aria-label': 'Show actions for' },
    h('button', { type: 'button', role: 'radio', 'aria-checked': String(!sprintViewEveryone), 'data-focus-key': 'sv-role', onclick: () => { sprintViewEveryone = false; render(); } }, roleLabel(role)),
    h('button', { type: 'button', role: 'radio', 'aria-checked': String(sprintViewEveryone), 'data-focus-key': 'sv-everyone', onclick: () => { sprintViewEveryone = true; render(); } }, 'Everyone'));
  const byDate = (list) => {
    const dates = [...new Set(list.map((a) => a.date))];
    return h('ul', { class: 'cu cu-sv' }, dates.map((d) => h('li', null,
      h('div', { class: 'd' }, h('b', null, fmtDay(d))),
      h('ul', null, sortWithinDay(list.filter((a) => a.date === d)).map((a) => h('li', null,
        a.time ? h('span', { class: 't' }, a.time) : null,
        a.dates && a.dates.to ? `${a.title}, ${untilText(a, T)}` : a.title,
        h('span', { class: 's' }, a.slot === 'after-cutoff' ? 'if needed' : a.slot === 'after-deploy' ? 'after the update' : '')))))));
  };
  const count = (st) => det.actions.filter((a) => a.status === st).length;
  const actionsSum = RULES ? groups.map(([st]) => [count(st), st]).filter(([c]) => c).map(([c, st]) => `${c} ${st === 'running' ? 'every day' : st}`).join(' · ') || 'No actions' : 'Actions unavailable';
  const actions = foldable('sv-actions',
    { tag: '<actions>', title: `Actions for ${sprintViewEveryone ? 'Everyone' : roleLabel(role)}`, sum: actionsSum },
    h('div', { class: 'sv-toggle' }, toggle),
    RULES ? groups.map(([st, label, open]) => {
      const list = det.actions.filter((a) => a.status === st);
      if (!list.length) return null;
      return h('details', { class: 'group', open: open || null, 'data-k': `sv-${st}` },
        h('summary', null, h('b', null, label), h('span', { class: 'cnt' }, String(list.length)), h('i', { class: 'chev', 'aria-hidden': 'true' })),
        byDate(list));
    }) : h('p', { class: 'empty' }, 'Actions unavailable.'));

  // Holidays is its own panel only when a holiday exists; otherwise one line at the foot of Timeline (READABILITY.md §5).
  const hols = !det.holidays.length ? null : foldable('sv-holidays',
    { tag: '<holidays>', title: 'Holidays', sum: plural(det.holidays.length, 'public holiday') },
    // One row per date: 'Thu 24 Dec  Christmas Eve · EE, PL' (review B22).
    h('ul', { class: 'rows' }, [...new Set(det.holidays.map((x) => x.date))].map((d) => {
      const on = det.holidays.filter((x) => x.date === d);
      const names = [...new Set(on.map((x) => x.name))];
      const text = names.length === 1 ? `${names[0]} · ${[...new Set(on.map((x) => x.country))].join(', ')}` : on.map((x) => `${x.name} · ${x.country}`).join('; ');
      return h('li', null, h('b', null, fmtDay(d)), h('span', null, text));
    })),
    det.holidaysAffecting.length ? h('p', { class: 'note' }, 'Key dates affected: ', [...new Set(det.holidaysAffecting.map((x) => x.date))].map((d) => {
      const k = Object.entries(MILESTONE_NAME).find(([key]) => s[key] === d);
      const c = [...new Set(det.holidaysAffecting.filter((x) => x.date === d).map((x) => x.country))].join(', ');
      return `${k ? `${k[1]} ` : ''}${fmtDay(d)} (${c} holiday)`;
    }).join(' · ')) : null);

  const nextMs = det.milestones.find((ms) => ms.status !== 'passed');
  const tlSum = [
    det.relation === 'current' && ctx.dayOfSprint ? `Today · day ${ctx.dayOfSprint} of ${workingDaysIn(s)}` : null,
    nextMs ? `next ${MILESTONE_NAME[nextMs.key]} ${nextMs.status === 'today' ? 'today' : fmtDay(nextMs.date)}` : 'all key dates passed',
  ].filter(Boolean).join(' · ');
  const timeline = foldable('sv-timeline', { tag: '<timeline>', title: 'Timeline', aside: 'Tallinn time', sum: tlSum },
    h('ol', { class: 'tl' }, items),
    hols ? null : h('p', { class: 'muted tl-foot' }, 'No public holidays (EE, PL) between planning and Live.'));
  fill(view, nav, head, h('div', { class: 'wrap pad body' },
    h('div', null, timeline, hols),
    actions));
}

// ---------------------------------------------------------------- cycle explainer
function renderCycle(n) {
  const c = context(isWeekendDay(n.date) ? addDays(n.date, 2) : n.date);
  const sprints = [c.previous, c.current, c.next];
  const start = (() => { let d = sprints[0].planning; while (new Date(`${d}T12:00:00Z`).getUTCDay() !== 1) d = addDays(d, -1); return d; })();
  const endKey = addDays(sprints[2].live, 7);
  const days = (d) => Math.round((Date.parse(`${d}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000);
  const total = days(endKey);
  // Positions in % of the track so the whole cycle fits the page width (no sideways scroll at 100% zoom).
  const pc = (d) => (days(d) / total) * 100;
  const dx = (d, px = 0) => `calc(${pc(d).toFixed(3)}% + ${px}px)`;
  const span = (a, b, px = 0) => `calc(${(pc(b) - pc(a)).toFixed(3)}% + ${px}px)`;
  const axis = [];
  for (let d = start; d < endKey; d = addDays(d, 7)) axis.push(h('span', { style: { left: dx(d) } }, fmtDM(d)));
  const T = keyTimes(RULES || []);
  // The lane label follows the sprint's phase on this date (review B22), not its position.
  const laneWord = (s) => {
    const p = sprintPhase(s, n.date, n.time, T).phase;
    if (p === 'Plan') return n.date < s.planning ? 'being refined' : 'planned';
    return { Build: 'building', Freeze: 'code freeze', UAT: 'in UAT' }[p] || (n.date <= s.live ? 'release' : 'released');
  };
  const lanes = sprints.map((s, i) => {
    const kids = [
      h('span', { class: 'ln', style: { left: `max(4px, ${dx(s.planning, -40)})` } }, h('b', null, s.label), laneWord(s)),
      h('span', { class: 'bar build', style: { left: dx(s.start), width: span(s.start, addDays(s.end, 1), -2) } }),
      h('span', { class: 'blab', style: { left: dx(s.start, 30) } }, 'Build on Beta'),
      h('span', { class: 'bar freeze', style: { left: dx(s.freezeStart), width: span(s.freezeStart, addDays(s.demoStart, 1), -2) } }),
      h('span', { class: 'blab', style: { left: dx(s.freezeStart, 2) } }, 'Freeze'),
      h('span', { class: 'bar uat', style: { left: dx(s.uatStart), width: span(s.uatStart, addDays(s.cutoff, 1), -2) } }),
      h('span', { class: 'blab', style: { left: dx(s.uatStart, 6) } }, 'UAT'),
      h('span', { class: 'stn plan', style: { left: dx(s.planning, 8) } }), h('span', { class: 'stl', style: { left: dx(s.planning, 8) } }, `Plan ${fmtDM(s.planning)}`),
      h('span', { class: 'stn', style: { left: dx(s.demoStart, 8) } }), h('span', { class: 'stl stl-low', style: { left: dx(s.demoStart, 8) } }, `Demo ${fmtDM(s.demoStart)}`),
      h('span', { class: 'stn live', style: { left: dx(s.live, 8) } }), h('span', { class: 'stl', style: { left: dx(s.live, 30) } }, `Live ${fmtDM(s.live)}`),
    ];
    if (RULES) {
      // Refinement sessions that feed this sprint's planning.
      for (let d = sprintDates(s.n - 1).start; d < s.planning; d = addDays(d, 1)) {
        if (actionsFor(d, RULES).some((a) => (a.id === 'pre-refinement' || a.id === 'full-refinement') && a.sprintNumber === s.n)) kids.push(h('span', { class: 'ref', style: { left: dx(d, 8) } }));
      }
    }
    return h('div', { class: `lane lane-${i + 1}` }, kids);
  });
  const today = h('div', { class: 'todayline', style: { left: dx(n.date, 8) } }, h('span', null, fmtDay(n.date)));
  const alt = sprints.map((s) => `${s.label}: planning ${fmtDay(s.planning)}, built on Beta ${fmtDM(s.start)} to ${fmtDM(s.end)}, code freeze from ${fmtDay(s.freezeStart)} until the Demo update ${fmtDay(s.demoStart)} evening, UAT on Demo from ${fmtDay(s.uatStart)}, fix cut-off and Live update ${fmtDay(s.live)}.`).join(' ');
  fill($('cycle-body'),
    h('div', { class: 'track-wrap', tabindex: '0', role: 'region', 'aria-label': 'Cycle timeline' },
      h('div', { class: 'track', role: 'img', 'aria-label': alt, style: { '--weeks': String(total / 7) } }, h('div', { class: 'axis' }, axis), lanes, today)),
    h('p', { class: 'muted cycle-legend' }, 'Bars: outlined grey = build on Beta (working days of the sprint) · blue "Freeze" = code freeze until the Demo update (Tue evening) · light orange "UAT" = clients test on Demo until the fix cut-off · ◆ = refinement sessions, which feed the next sprint\'s planning · weekends shaded.'),
    h('dl', { class: 'gloss' }, [
      ['Beta → Demo → Live', 'The three environments. A sprint is built on Beta, moves to Demo on Tuesday evening, and to Live on Monday evening.'],
      ['Code freeze', 'From the sprint\'s last Friday until the Demo update on Tuesday evening. Beta reopens Wednesday.'],
      ['Demo update / Live update', `The 2-weekly deploys, usually ${T.demo} and ${T.live} Tallinn time. Client project go-lives are not on this board.`],
      ['Demo/Live matrix', 'Per-tenant configuration switches. Code always deploys to all tenants.'],
      ['UAT', 'Clients test on Demo from Wednesday until the fix cut-off.'],
      ['Fix cut-off', `Monday ${T.cutoff} Tallinn time. After it: reverts, not fixes.`],
      ['Ready for Demo / Ready for Live', 'Task states set by QA before the Demo update, and by IM / AM after the client signs off.'],
      ['Release / Golive Release page', 'Confluence pages "Release YYYY-NN" and "Golive Release YYYY-NN", written by developers after each update.'],
      ['Pre-Refinement / Full Refinement', `Wednesday ${ruleTime(RULES, 'pre-refinement', '14:00')} every week / Thursday ${ruleTime(RULES, 'full-refinement', '14:00')} in week 1. Both estimate work for the next sprint.`],
      ['Definition of Ready, priority call', 'What a ticket needs before planning; the call where each client fixes its priorities.'],
      ['Bug retro', 'Monday after a sprint ends: review its bugs and escaped defects.'],
      ['Hotfix', 'The only change that bypasses the freeze. Event-driven, not on this calendar.'],
    ].map(([t, d]) => h('div', null, h('dt', null, t), h('dd', null, d)))));
}

// ---------------------------------------------------------------- footer
function renderFooter() {
  const diff = deviceDiffersFromTallinn();
  const rota = DUTY && DUTY.ROTA_UPDATED ? `Rota updated ${fmtDM(DUTY.ROTA_UPDATED)}` : null;
  fill($('foot-row'),
    h('span', null, diff ? 'Times are Tallinn time (your device is in another time zone)' : 'Times are Tallinn time'),
    h('span', null, `Dates confirmed up to ${sprintDates(LAST_CONFIRMED).label}`),
    rota ? h('span', null, rota) : null);
  const list = $('sources-list');
  if (!list.childElementCount) {
    for (const s of Object.values(SOURCES)) if (s && safeUrl(s.url)) list.append(h('li', null, ext(s.url, s.title)));
    $('sources-n').textContent = list.childElementCount ? String(list.childElementCount) : '';
  }
}

// ---------------------------------------------------------------- render
// One bad data line (a rule's `when`, an override date, a time) must not blank the page (review 2.2): log it and
// fall back to the error band (rules: null), which still shows the sprint dates.
function safeResolve(args) {
  try { return resolveDay(args); } catch (err) {
    console.error('resolveDay failed; showing the error band', err);
    return resolveDay({ ...args, rules: null });
  }
}
let lastModel = null;
let lastHref = null;
let lastKey = null;
let lastView = null;
let lastSprint = null;

// What a tick compares. Includes the time-dependent parts (passed items, the summary's "next"), so a meeting
// moves to "Earlier today" when its time comes without a reload (review 1.7).
function stateKey(n, m) {
  const a = m.agenda;
  return JSON.stringify([n.date, n.preview, m.band, m.headline, m.sub, m.tab, m.order, m.next, m.rail.map((r) => r.phaseLabel),
    a && a.summary, a && a.groups.map((g) => [g.slot, g.items.map((it) => `${it.id}:${it.chip ? it.chip.text : ''}`)])]);
}
function openKeys() { return new Set([...document.querySelectorAll('details[data-k][open]')].map((d) => d.dataset.k)); }
function closedKeys() { return new Set([...document.querySelectorAll('details[data-k]:not([open])')].map((d) => d.dataset.k)); }

// Keep focus on the same control across a re-render (nodes are rebuilt): by id, data-focus-key (panel buttons,
// the sprint view's role toggle, preview buttons, Coming up days), sprint link, or details summary (review B4).
function focusSelector(ae) {
  if (!ae || ae === document.body) return null;
  if (ae.id) return `#${CSS.escape(ae.id)}`;
  if (ae.dataset.focusKey) return `[data-focus-key="${CSS.escape(ae.dataset.focusKey)}"]`;
  if (ae.matches('a.lab[data-sprint]')) return `a.lab[data-sprint="${CSS.escape(ae.dataset.sprint)}"]`;
  if (ae.matches('details[data-k] > summary')) return `details[data-k="${CSS.escape(ae.parentElement.dataset.k)}"] > summary`;
  return null;
}

function render() {
  const n = now();
  const opened = openKeys();
  const closed = closedKeys();
  const focusSel = focusSelector(document.activeElement);
  const view = n.route.sprintRaw != null ? 'sprint' : 'today';

  const m = safeResolve({ date: n.date, time: n.time, role, rules: RULES, duty: DUTY, holidays: HOLIDAYS, preview: !!n.preview });
  lastModel = m;
  renderPreview(n);
  renderTop(n, m);
  setFavicon(m.favicon);

  $('today-view').hidden = view !== 'today';
  $('sprint-view').hidden = view !== 'sprint';
  if (view === 'today') {
    document.title = m.tab;
    renderBand(n, m);
    renderDuty(m);
    renderYourDay(n, m);
    renderRail(m);
    renderComingUp(m);
  } else {
    renderSprintView(n);
  }
  if (m.range) fill($('cycle-body'), h('p', { class: 'muted' }, `${m.range.text}.`));
  else renderCycle(n);
  renderFooter();

  for (const d of document.querySelectorAll('details[data-k]')) {
    if (opened.has(d.dataset.k)) d.open = true;
    else if (closed.has(d.dataset.k)) d.open = false;
  }
  if (focusSel && view === lastView && !(view === 'sprint' && n.route.sprintRaw !== lastSprint)) { const el = document.querySelector(focusSel); if (el && el !== document.activeElement) el.focus(); }
  // ‹ › inside the sprint view load another sprint: focus its h1 as on any route entry (v2.1-A).
  if (view === 'sprint' && lastView === 'sprint' && n.route.sprintRaw !== lastSprint) { const h1 = $('sv-h'); if (h1) h1.focus(); }
  lastSprint = view === 'sprint' ? n.route.sprintRaw : null;
  if (view !== lastView) {
    if (view === 'sprint') { const h1 = $('sv-h'); if (h1) h1.focus(); }
    else if (lastView === 'sprint' && returnFocusTo) {
      const back = document.querySelector(`a.lab[data-sprint="${returnFocusTo}"]`);
      if (back) back.focus();
    }
    lastView = view;
  }
  lastHref = location.href;
  lastKey = stateKey(n, m);
}

// Every 20 s: a full render only when something visible changed (state, phase, day); otherwise just the countdown.
function tick() {
  const n = now();
  if (n.preview) return;
  const m = safeResolve({ date: n.date, time: n.time, role, rules: RULES, duty: DUTY, holidays: HOLIDAYS });
  if (stateKey(n, m) !== lastKey) {
    // The h1 is not a live region (one announcement per change, review B15): a headline the clock changed is announced here.
    const before = $('headline').textContent;
    render();
    const after = $('headline').textContent;
    if (after !== before && !$('today-view').hidden) announce(after);
    return;
  }
  if (m.countdown && $('today-view').hidden === false) {
    const big = document.querySelector('#band-right .countdown .big');
    if (big) big.textContent = m.countdown.text.replace(/ left$/, '');
  }
}

// ---------------------------------------------------------------- wiring
document.addEventListener('click', (e) => {
  const a = e.target.closest && e.target.closest('a.lab[data-sprint]');
  if (a) returnFocusTo = a.dataset.sprint;
});
// Skip link: move focus to the Your day heading without changing the hash (that would end a preview).
document.querySelector('.skip').addEventListener('click', (e) => {
  e.preventDefault();
  const target = $('today-view').hidden ? $('sv-h') : $('yourday-h');
  if (target) { target.scrollIntoView({ block: 'start' }); target.focus(); }
});
$('viewdate-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const v = $('viewdate-input').value;
  if (!v) return;
  const r = readRoute();
  $('viewdate').open = false;
  location.hash = routeHref({ date: v, sprint: r.sprintRaw && r.sprint != null ? r.sprintRaw : null });
});
$('viewdate-today').addEventListener('click', () => {
  $('viewdate').open = false;
  history.pushState(null, '', location.pathname + location.search.replace(/([?&])date=[^&]*&?/, '$1').replace(/[?&]$/, ''));
  render();
});
{
  const url = location.origin.startsWith('http') ? `${location.origin}/` : 'https://insly-sprint-monitor.onrender.com';
  $('howto-url').textContent = url;
  $('howto-copy').addEventListener('click', async (e) => {
    try { await navigator.clipboard.writeText(url); e.target.textContent = 'Copied'; }
    catch { getSelection().selectAllChildren($('howto-url')); e.target.textContent = 'Press Ctrl+C'; }
    setTimeout(() => { e.target.textContent = 'Copy'; }, 2000);
  });
}
setFold($('cycle'), firstVisit); // open on a first visit only; not persisted

render();
setInterval(tick, 20_000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
// hashchange and popstate both fire on Back; render once per route.
window.addEventListener('hashchange', () => { if (location.href !== lastHref) { cuLimit = null; render(); } });
phoneMQ.addEventListener('change', () => { if (lastModel && !$('today-view').hidden) renderComingUp(lastModel); });
window.addEventListener('popstate', () => { if (location.href !== lastHref) render(); });
