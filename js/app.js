// ClassSplitter: split a class into random groups.
// Everything is saved in this browser (localStorage); nothing is sent anywhere.

const STORAGE_KEY = 'classsplitter';
const ATTEMPTS = 500;   // random tries when looking for the best grouping
const ROLES = ['Leader', 'Writer', 'Timekeeper', 'Presenter', 'Researcher', 'Checker'];
const GROUP_COLORS = [
    ['Blue', '#2b59c3'], ['Red', '#d13b3b'], ['Green', '#1d8f4e'], ['Orange', '#d06a08'], ['Purple', '#7b4bc4'],
    ['Teal', '#0f8585'], ['Pink', '#c4386f'], ['Brown', '#8a5a2b'], ['Gray', '#5b6472'],
];
const EXAMPLE_CLASS = ['Anna', 'Ben', 'Chloe', 'Daniel', 'Ella', 'Felix', 'Grace', 'Henry', 'Isla', 'Jack',
    'Kate', 'Leo', 'Mia', 'Noah', 'Olivia', 'Peter', 'Ruby', 'Sam', 'Tara', 'Victor'];

const $ = (id) => document.getElementById(id);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

/* ---------- Saved data ---------- */

function load() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
}

function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch (e) { /* not saved, page still works */ }
}

function newClass(name) {
    return {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        students: [],     // { name, absent }
        apart: [],        // pairs of names that must not share a group
        lastGroups: [],   // previous groups, used by "Mix it up"
        picked: [],       // names already picked in this round of "Pick a student"
    };
}

const data = load() || { classes: [], currentId: null, settings: { mode: 'size', amount: 3, roles: false, mix: true } };
if (!data.classes.length) data.classes.push(newClass('My class'));
if (!data.classes.some((c) => c.id === data.currentId)) data.currentId = data.classes[0].id;

let currentGroups = null;   // names per group from the last "Make groups"
let currentResult = null;   // the same groups with colors and roles, as shown on screen

/* ---------- Small helpers ---------- */

function currentClass() {
    return data.classes.find((c) => c.id === data.currentId);
}

function presentStudents() {
    return currentClass().students.filter((s) => !s.absent);
}

const sameName = (a, b) => a.toLowerCase() === b.toLowerCase();

// Creates an element. Text always goes in as textContent, so a name can never inject HTML.
function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
        if (key === 'text') node.textContent = value;
        else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
        else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
}

// Fisher–Yates shuffle on a copy of the list
function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function showNotice(id, text, type = 'info') {
    $(id).textContent = text;
    $(id).dataset.type = type;
}

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

/* ---------- Classes ---------- */

function renderClassPicker() {
    $('class-select').replaceChildren(...data.classes.map((c) =>
        el('option', { value: c.id, text: `${c.name} (${c.students.length})` })));
    $('class-select').value = data.currentId;
}

function switchClass(id) {
    data.currentId = id;
    save();
    renderAll();
}

function createClass() {
    const name = (prompt('Name of the new class (for example 10.a):') || '').trim();
    if (!name) return;
    const created = newClass(name.slice(0, 40));
    data.classes.push(created);
    switchClass(created.id);
}

function renameClass() {
    const name = (prompt('New name for this class:', currentClass().name) || '').trim();
    if (!name) return;
    currentClass().name = name.slice(0, 40);
    save();
    renderClassPicker();
}

function deleteClass() {
    const c = currentClass();
    if (!confirm(`Delete "${c.name}" and its student list? This can't be undone.`)) return;
    data.classes = data.classes.filter((other) => other !== c);
    if (!data.classes.length) data.classes.push(newClass('My class'));
    switchClass(data.classes[0].id);
}

/* ---------- Students ---------- */

// Adds every name from the text: one per line, or separated by commas or semicolons
function addNames(text) {
    const c = currentClass();
    const names = text.split(/[\n,;\t]+/).map((n) => n.trim().replace(/\s+/g, ' ')).filter(Boolean);
    const added = [], duplicates = [], tooLong = [];

    for (const name of names) {
        if (name.length > 40) tooLong.push(name.slice(0, 20) + '…');
        else if (c.students.some((s) => sameName(s.name, name))) duplicates.push(name);
        else { c.students.push({ name, absent: false }); added.push(name); }
    }
    save();
    renderStudents();
    renderClassPicker();

    const parts = [];
    if (added.length) parts.push(`Added ${plural(added.length, 'student')}.`);
    if (duplicates.length) parts.push(`Already on the list: ${duplicates.join(', ')}.`);
    if (tooLong.length) parts.push(`Too long (max 40 characters): ${tooLong.join(', ')}.`);
    showNotice('add-notice', parts.join(' '), duplicates.length || tooLong.length ? 'warn' : 'ok');
}

function toggleAbsent(name) {
    const student = currentClass().students.find((s) => s.name === name);
    student.absent = !student.absent;
    save();
    renderStudents();
}

function removeStudent(name) {
    const c = currentClass();
    c.students = c.students.filter((s) => s.name !== name);
    c.apart = c.apart.filter((pair) => !pair.includes(name));
    c.picked = c.picked.filter((n) => n !== name);
    save();
    renderStudents();
    renderClassPicker();
}

function renderStudents() {
    const c = currentClass();
    $('student-list').replaceChildren(...c.students.map((s) => el('li', { class: s.absent ? 'tag absent' : 'tag' },
        el('button', {
            type: 'button',
            class: 'tag-name',
            text: s.name,
            'aria-label': `${s.name}, ${s.absent ? 'absent' : 'present'}. Click to mark ${s.absent ? 'present' : 'absent'}.`,
            onclick: () => toggleAbsent(s.name),
        }),
        el('button', { type: 'button', class: 'tag-remove', text: '×', 'aria-label': `Remove ${s.name}`, onclick: () => removeStudent(s.name) }),
    )));

    const total = c.students.length;
    const absent = total - presentStudents().length;
    $('student-count').textContent = total ? `${total - absent} present${absent ? `, ${absent} absent` : ''}` : '';
    $('empty-students').hidden = total > 0;
    $('students-foot').hidden = total === 0;

    renderApart();
    renderPreview();
    renderPicker();
}

/* ---------- Keep apart ---------- */

function renderApart() {
    const c = currentClass();
    const options = () => c.students.map((s) => el('option', { value: s.name, text: s.name }));
    $('apart-a').replaceChildren(...options());
    $('apart-b').replaceChildren(...options());
    if (c.students.length > 1) $('apart-b').selectedIndex = 1;
    $('apart-form').querySelectorAll('select, button').forEach((field) => { field.disabled = c.students.length < 2; });

    $('apart-list').replaceChildren(...c.apart.map(([a, b], index) => el('li', {},
        el('span', { text: `${a} and ${b}` }),
        el('button', {
            type: 'button', class: 'tag-remove', text: '×', 'aria-label': `Let ${a} and ${b} be in the same group again`,
            onclick: () => { c.apart.splice(index, 1); save(); renderApart(); },
        }),
    )));
}

function addApartPair(a, b) {
    const c = currentClass();
    if (sameName(a, b)) return showNotice('make-notice', 'Choose two different students.', 'warn');
    if (c.apart.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
        return showNotice('make-notice', `${a} and ${b} are already kept apart.`, 'warn');
    }
    c.apart.push([a, b]);
    save();
    renderApart();
    showNotice('make-notice', '');
}

/* ---------- Making groups ---------- */

// Sizes of each group, as even as possible (7 people in groups of 3 gives 3, 2, 2, not 3, 3, 1)
function groupSizes(people, mode, amount) {
    const count = mode === 'size' ? Math.ceil(people / amount) : Math.min(amount, people);
    const base = Math.floor(people / count);
    const extra = people % count;
    return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

function renderPreview() {
    const { mode, amount } = data.settings;
    const people = presentStudents().length;
    $('amount').setAttribute('aria-label', mode === 'size' ? 'Group size' : 'Number of groups');
    if (people < 2) {
        $('preview').textContent = 'Add at least 2 present students.';
        return;
    }
    const sizes = groupSizes(people, mode, amount);
    const min = Math.min(...sizes), max = Math.max(...sizes);
    $('preview').textContent = `${plural(people, 'student')} → ${plural(sizes.length, 'group')} of ${min === max ? min : `${min}–${max}`}`;
}

const pairKey = (a, b) => [a.toLowerCase(), b.toLowerCase()].sort().join('|');

// Every pair of people who shared a group
function pairsIn(groups) {
    const pairs = new Set();
    for (const group of groups) {
        for (let i = 0; i < group.length; i++) {
            for (let j = i + 1; j < group.length; j++) pairs.add(pairKey(group[i], group[j]));
        }
    }
    return pairs;
}

// Lower score = better. A "keep apart" pair together counts far more than meeting someone again.
function rate(groups, apart, lastPairs) {
    const together = pairsIn(groups);
    const broken = apart.filter(([a, b]) => together.has(pairKey(a, b)));
    let repeats = 0;
    for (const pair of together) if (lastPairs.has(pair)) repeats++;
    return { score: broken.length * 1000 + repeats, broken, repeats };
}

function makeGroups() {
    const c = currentClass();
    const people = presentStudents().map((s) => s.name);
    if (people.length < 2) return showNotice('make-notice', 'Add at least 2 present students first.', 'warn');

    const sizes = groupSizes(people.length, data.settings.mode, data.settings.amount);
    const lastPairs = data.settings.mix ? pairsIn(c.lastGroups) : new Set();

    // Try many random shuffles and keep the one that breaks the fewest rules
    let best = null;
    for (let attempt = 0; attempt < ATTEMPTS && !(best && best.score === 0); attempt++) {
        const shuffled = shuffle(people);
        let start = 0;
        const groups = sizes.map((size) => shuffled.slice(start, start += size));
        const result = rate(groups, c.apart, lastPairs);
        if (!best || result.score < best.score) best = { groups, ...result };
    }

    c.lastGroups = best.groups;
    currentGroups = best.groups;
    save();
    showNotice('make-notice', '');
    renderGroups();

    if (best.broken.length) {
        const pairs = best.broken.map(([a, b]) => `${a} and ${b}`).join('; ');
        showNotice('results-notice', `Couldn't keep these students apart: ${pairs}. Try making more, smaller groups.`, 'warn');
    } else if (best.repeats) {
        showNotice('results-notice', `${plural(best.repeats, 'pair')} from last time ended up together again. With these group sizes it couldn't be avoided.`, 'info');
    } else {
        showNotice('results-notice', '');
    }

    $('results').hidden = false;
    $('results').scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'start' });
}

function groupName(index) {
    const [color] = GROUP_COLORS[index % GROUP_COLORS.length];
    const round = Math.floor(index / GROUP_COLORS.length);
    return round ? `${color} ${round + 1}` : color;
}

// Adds colors and (optionally) roles, then draws the groups
function renderGroups() {
    currentResult = currentGroups.map((names, index) => {
        const roles = shuffle(ROLES);
        return {
            name: groupName(index),
            color: GROUP_COLORS[index % GROUP_COLORS.length][1],
            members: names.map((name, i) => ({ name, role: data.settings.roles ? (roles[i] || 'Team member') : '' })),
        };
    });

    let order = 0;   // used for the "dealing cards" animation delay
    $('groups').replaceChildren(...currentResult.map((group) => el('article', { class: 'group', style: `--group: ${group.color}` },
        el('h3', {}, el('span', { text: `${group.name} group` }), el('span', { class: 'group-size', text: plural(group.members.length, 'person').replace('persons', 'people') })),
        el('ul', {}, ...group.members.map((member) => el('li', { style: `--i: ${order++}` },
            el('span', { class: 'member', text: member.name }),
            member.role ? el('span', { class: 'role', text: member.role }) : '',
        ))),
    )));
}

function resultAsText() {
    return currentResult.map((group) => `${group.name} group: ` + group.members
        .map((m) => (m.role ? `${m.name} (${m.role})` : m.name)).join(', ')).join('\n');
}

async function copyResult() {
    const text = resultAsText();
    try {
        await navigator.clipboard.writeText(text);
    } catch (e) {
        // Older browsers: copy through a hidden text box
        const box = el('textarea', { class: 'visually-hidden' });
        box.value = text;
        document.body.append(box);
        box.select();
        document.execCommand('copy');
        box.remove();
    }
    $('copy').textContent = 'Copied';
    setTimeout(() => { $('copy').textContent = 'Copy as text'; }, 2000);
}

// Big, distraction-free view of the groups for the classroom projector
function setPresenting(on) {
    document.body.classList.toggle('presenting', on);
    $('present').textContent = on ? 'Exit presentation' : 'Present';
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
}

/* ---------- Pick a student ---------- */

function renderPicker() {
    const present = presentStudents();
    const picked = currentClass().picked.filter((name) => present.some((s) => s.name === name));
    $('picker-count').textContent = present.length ? `${picked.length} of ${present.length} picked this round` : '';
    $('pick').disabled = present.length === 0 || rolling !== null;
}

let rolling = null;

function pickStudent() {
    const c = currentClass();
    const present = presentStudents().map((s) => s.name);
    if (!present.length || rolling) return;

    // Only students who haven't had a turn yet; when everyone has, a new round starts
    let pool = present.filter((name) => !c.picked.includes(name));
    if (!pool.length) {
        c.picked = [];
        pool = present;
    }
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    const stage = $('picked');

    const finish = () => {
        rolling = null;
        stage.textContent = chosen;
        stage.classList.add('landed');
        $('picked-announce').textContent = `${chosen} was picked.`;
        c.picked.push(chosen);
        save();
        renderPicker();
    };

    stage.classList.remove('landed');
    if (reduceMotion.matches || present.length === 1) return finish();

    // Flick through random names for a moment before landing on the chosen one
    let ticks = 0;
    rolling = setInterval(() => {
        stage.textContent = present[Math.floor(Math.random() * present.length)];
        if (++ticks >= 14) {
            clearInterval(rolling);
            finish();
        }
    }, 60);
    renderPicker();
}

function newRound() {
    currentClass().picked = [];
    save();
    $('picked').textContent = '?';
    $('picked').classList.remove('landed');
    renderPicker();
}

/* ---------- Settings ---------- */

function setAmount(value) {
    const amount = Math.min(50, Math.max(1, parseInt(value, 10) || 1));
    data.settings.amount = amount;
    $('amount').value = amount;
    save();
    renderPreview();
}

function restoreSettings() {
    const s = data.settings;
    document.querySelector(`input[name="mode"][value="${s.mode}"]`).checked = true;
    $('amount').value = s.amount;
    $('opt-roles').checked = s.roles;
    $('opt-mix').checked = s.mix;
}

/* ---------- Events ---------- */

$('class-select').addEventListener('change', (event) => switchClass(event.target.value));
$('new-class').addEventListener('click', createClass);
$('rename-class').addEventListener('click', renameClass);
$('delete-class').addEventListener('click', deleteClass);

$('add-form').addEventListener('submit', (event) => {
    event.preventDefault();
    const input = $('name-input');
    if (!input.value.trim()) return;
    addNames(input.value);
    input.value = '';
    input.style.height = '';
    input.focus();
});
// Enter adds the name(s); Shift+Enter starts a new line
$('name-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        $('add-form').requestSubmit();
    }
});
// The box grows when a long list is pasted
$('name-input').addEventListener('input', (event) => {
    event.target.style.height = '';
    event.target.style.height = Math.min(event.target.scrollHeight, 240) + 'px';
});

$('load-example').addEventListener('click', () => addNames(EXAMPLE_CLASS.join('\n')));
$('all-present').addEventListener('click', () => {
    currentClass().students.forEach((s) => { s.absent = false; });
    save();
    renderStudents();
});
$('clear-students').addEventListener('click', () => {
    if (!confirm(`Remove all students from "${currentClass().name}"?`)) return;
    Object.assign(currentClass(), { students: [], apart: [], lastGroups: [], picked: [] });
    save();
    renderAll();
});

document.querySelectorAll('input[name="mode"]').forEach((radio) => radio.addEventListener('change', () => {
    data.settings.mode = radio.value;
    save();
    renderPreview();
}));
$('amount').addEventListener('change', (event) => setAmount(event.target.value));
$('minus').addEventListener('click', () => setAmount(data.settings.amount - 1));
$('plus').addEventListener('click', () => setAmount(data.settings.amount + 1));
$('opt-roles').addEventListener('change', (event) => {
    data.settings.roles = event.target.checked;
    save();
    if (currentGroups) renderGroups();
});
$('opt-mix').addEventListener('change', (event) => {
    data.settings.mix = event.target.checked;
    save();
});

$('apart-form').addEventListener('submit', (event) => {
    event.preventDefault();
    addApartPair($('apart-a').value, $('apart-b').value);
});

$('make-groups').addEventListener('click', makeGroups);
$('reshuffle').addEventListener('click', makeGroups);
$('copy').addEventListener('click', copyResult);
$('present').addEventListener('click', () => setPresenting(!document.body.classList.contains('presenting')));
document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('presenting')) setPresenting(false);
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && document.body.classList.contains('presenting')) setPresenting(false);
});

$('pick').addEventListener('click', pickStudent);
$('pick-reset').addEventListener('click', newRound);

/* ---------- Start ---------- */

function renderAll() {
    currentGroups = null;
    $('results').hidden = true;
    $('picked').textContent = '?';
    $('picked').classList.remove('landed');
    ['add-notice', 'make-notice', 'results-notice'].forEach((id) => showNotice(id, ''));
    renderClassPicker();
    renderStudents();
}

$('year').textContent = new Date().getFullYear();
restoreSettings();
renderAll();
