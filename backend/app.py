from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from supabase import create_client
from dotenv import load_dotenv
from datetime import date, timedelta

load_dotenv()

app = Flask(__name__)
CORS(app)

# ── Data layer (Supabase) ─────────────────────────────────────────────────────

_sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])


def load_data():
    entries_resp = _sb.table('routine_entries').select('*').execute()
    entries = {}
    for row in entries_resp.data:
        entries[str(row['entry_date'])] = {
            'completed': row['completed'],
            'phase1': row['phase1'],
            'phase2': row['phase2'],
            'phase3': row['phase3'],
        }

    labels_resp = _sb.table('item_labels').select('*').execute()
    labels = {}
    for row in labels_resp.data:
        labels.setdefault(row['phase_id'], {})[row['item_id']] = row['label']

    order_resp = _sb.table('item_order').select('*').order('position').execute()
    item_order = {}
    for row in order_resp.data:
        item_order.setdefault(row['phase_id'], []).append(row['item_id'])

    return {'entries': entries, 'labels': labels, 'item_order': item_order}


def save_data(data):
    for date_str, entry in data['entries'].items():
        _sb.table('routine_entries').upsert({
            'entry_date': date_str,
            'completed': entry.get('completed', False),
            'phase1': entry.get('phase1', {}),
            'phase2': entry.get('phase2', {}),
            'phase3': entry.get('phase3', {}),
        }).execute()

    for phase_id, items in data.get('labels', {}).items():
        for item_id, label in items.items():
            _sb.table('item_labels').upsert({
                'phase_id': phase_id,
                'item_id': item_id,
                'label': label,
            }).execute()


# ── Routine definition ────────────────────────────────────────────────────────

PHASES = [
    {
        'id': 'phase1',
        'name': 'Phase I',
        'subtitle': 'Close the Day',
        'color': 'red',
        'items': [
            {'id': 'review_schedule', 'label': 'Review tomorrow\'s schedule'},
            {'id': 'gratitude', 'label': 'Write 3 things you\'re grateful for'},
            {'id': 'clear_workspace', 'label': 'Clear your workspace'},
            {'id': 'set_intentions', 'label': 'Set intentions for tomorrow'},
            {'id': 'close_comms', 'label': 'Close all work communications'},
        ]
    },
    {
        'id': 'phase2',
        'name': 'Phase II',
        'subtitle': 'Transition the Body',
        'color': 'blue',
        'items': [
            {'id': 'dim_lights', 'label': 'Dim the lights'},
            {'id': 'comfortable_clothes', 'label': 'Change into comfortable clothes'},
            {'id': 'stretching', 'label': '10 minutes of gentle stretching'},
            {'id': 'warm_shower', 'label': 'Take a warm shower or bath'},
            {'id': 'bedroom_prep', 'label': 'Prepare the bedroom'},
        ]
    },
    {
        'id': 'phase3',
        'name': 'Phase III',
        'subtitle': 'Down Regulate',
        'color': 'yellow',
        'items': [
            {'id': 'no_screens', 'label': 'No phone or screens'},
            {'id': 'deep_breathing', 'label': '5 minutes of deep breathing'},
            {'id': 'read_book', 'label': 'Read a physical book'},
            {'id': 'journal', 'label': 'Journal or reflect'},
            {'id': 'muscle_relax', 'label': 'Progressive muscle relaxation'},
        ]
    }
]

FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233]

ACHIEVEMENT_NAMES = {
    1:   'First Night',
    2:   'Two Nights',
    3:   'Three Pillars',
    5:   'Work Week',
    8:   'Eight Nights',
    13:  'Thirteen',
    21:  'Three Weeks',
    34:  'Month Strong',
    55:  'Fifty-Five',
    89:  'Eighty-Nine',
    144: 'Golden Ratio',
    233: 'Master of Rest',
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def build_phases(data):
    """Return PHASES with any user-customized labels and ordering applied."""
    labels = data.get('labels', {})
    item_order = data.get('item_order', {})

    # Build a flat map of all items with labels applied
    all_items = {}
    for phase in PHASES:
        for item in phase['items']:
            custom = labels.get(phase['id'], {}).get(item['id'])
            all_items[item['id']] = {'id': item['id'], 'label': custom if custom else item['label']}

    # If no custom order, return default
    if not item_order:
        result = []
        for phase in PHASES:
            items = [all_items[item['id']] for item in phase['items']]
            result.append({**phase, 'items': items})
        return result

    # Apply custom ordering (supports cross-phase moves)
    placed = set()
    result = []
    for phase in PHASES:
        order = item_order.get(phase['id'], [])
        items = []
        for item_id in order:
            if item_id in all_items:
                items.append(all_items[item_id])
                placed.add(item_id)
        result.append({**phase, 'items': items})

    # Safety net: append any unplaced items to their default phase
    for phase_idx, phase in enumerate(PHASES):
        for item in phase['items']:
            if item['id'] not in placed:
                result[phase_idx]['items'].append(all_items[item['id']])

    return result


def get_default_entry(phases=None):
    phases = phases or PHASES
    entry = {'completed': False}
    for phase in phases:
        entry[phase['id']] = {item['id']: False for item in phase['items']}
    return entry


def is_all_completed(entry, phases=None):
    phases = phases or PHASES
    for phase in phases:
        phase_data = entry.get(phase['id'], {})
        for item in phase['items']:
            if not phase_data.get(item['id'], False):
                return False
    return True


def calculate_streak(entries):
    today = date.today()
    today_str = str(today)

    # If today is complete, start counting from today; otherwise from yesterday
    if today_str in entries and entries[today_str].get('completed', False):
        current = today
    else:
        current = today - timedelta(days=1)

    streak = 0
    while True:
        day_str = str(current)
        if day_str in entries and entries[day_str].get('completed', False):
            streak += 1
            current -= timedelta(days=1)
        else:
            break

    return streak


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route('/api/state', methods=['GET'])
def get_state():
    data = load_data()
    today = str(date.today())
    phases = build_phases(data)

    if today not in data['entries']:
        data['entries'][today] = get_default_entry(phases)
        save_data(data)

    streak = calculate_streak(data['entries'])
    unlocked = [f for f in FIBONACCI if f <= streak]
    next_milestone = next((f for f in FIBONACCI if f > streak), None)

    return jsonify({
        'today': data['entries'][today],
        'phases': phases,
        'streak': streak,
        'fibonacci': FIBONACCI,
        'unlocked_achievements': unlocked,
        'next_milestone': next_milestone,
        'achievement_names': ACHIEVEMENT_NAMES,
        'date': today,
    })


@app.route('/api/toggle', methods=['POST'])
def toggle_item():
    req = request.json
    phase_id = req['phase_id']
    item_id = req['item_id']

    data = load_data()
    today = str(date.today())
    phases = build_phases(data)

    if today not in data['entries']:
        data['entries'][today] = get_default_entry(phases)

    entry = data['entries'][today]
    entry.setdefault(phase_id, {})[item_id] = not entry.get(phase_id, {}).get(item_id, False)

    was_completed = entry.get('completed', False)
    all_done = is_all_completed(entry, phases)
    entry['completed'] = all_done
    just_completed = all_done and not was_completed

    save_data(data)

    streak = calculate_streak(data['entries'])
    unlocked = [f for f in FIBONACCI if f <= streak]
    next_milestone = next((f for f in FIBONACCI if f > streak), None)

    return jsonify({
        'today': entry,
        'streak': streak,
        'unlocked_achievements': unlocked,
        'next_milestone': next_milestone,
        'just_completed': just_completed,
    })


@app.route('/api/rename-item', methods=['POST'])
def rename_item():
    req = request.json
    phase_id = req['phase_id']
    item_id = req['item_id']
    label = req['label'].strip()

    data = load_data()
    data.setdefault('labels', {}).setdefault(phase_id, {})[item_id] = label
    save_data(data)

    return jsonify({'ok': True, 'phase_id': phase_id, 'item_id': item_id, 'label': label})


@app.route('/api/backfill-day', methods=['POST'])
def backfill_day():
    req = request.json
    date_str = (req.get('date') or '').strip()

    try:
        entry_date = date.fromisoformat(date_str)
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400

    if entry_date >= date.today():
        return jsonify({'error': 'Cannot backfill today or a future date.'}), 400

    data = load_data()

    if date_str in data['entries']:
        data['entries'][date_str]['completed'] = True
    else:
        data['entries'][date_str] = {'completed': True}

    save_data(data)

    streak = calculate_streak(data['entries'])
    unlocked = [f for f in FIBONACCI if f <= streak]
    next_milestone = next((f for f in FIBONACCI if f > streak), None)

    return jsonify({
        'ok': True,
        'streak': streak,
        'unlocked_achievements': unlocked,
        'next_milestone': next_milestone,
    })


@app.route('/api/reorder', methods=['POST'])
def reorder_items():
    req = request.json
    order = req.get('order', [])

    # Save new ordering
    # Delete existing rows (supabase requires a filter for delete)
    _sb.table('item_order').delete().neq('id', '00000000-0000-0000-0000-000000000000').execute()

    rows = []
    for phase_entry in order:
        phase_id = phase_entry['phase_id']
        for position, item_id in enumerate(phase_entry['items']):
            rows.append({
                'phase_id': phase_id,
                'item_id': item_id,
                'position': position,
            })

    if rows:
        _sb.table('item_order').insert(rows).execute()

    # Migrate today's completion data to match new phase assignments
    data = load_data()
    today_str = str(date.today())
    if today_str in data['entries']:
        entry = data['entries'][today_str]
        # Build a map of item_id -> current checked value across all phases
        checked_map = {}
        for phase in PHASES:
            phase_data = entry.get(phase['id'], {})
            for item in phase['items']:
                checked_map[item['id']] = phase_data.get(item['id'], False)

        # Rebuild phase entries from new ordering
        for phase_entry in order:
            phase_id = phase_entry['phase_id']
            entry[phase_id] = {}
            for item_id in phase_entry['items']:
                entry[phase_id][item_id] = checked_map.get(item_id, False)

        phases = build_phases(data)
        entry['completed'] = is_all_completed(entry, phases)
        save_data(data)

    return jsonify({'ok': True})


@app.route('/api/reset-today', methods=['POST'])
def reset_today():
    """Dev utility: reset today's entry."""
    data = load_data()
    today = str(date.today())
    data['entries'][today] = get_default_entry()
    save_data(data)
    return jsonify({'ok': True})


if __name__ == '__main__':
    print('\n  Bedtime Routine Tracker — Backend')
    print('  Running on http://localhost:5001\n')
    app.run(debug=True, port=5001, host='0.0.0.0')
