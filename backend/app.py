from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
from datetime import date, timedelta

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data', 'routines.json')

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


def load_data():
    if not os.path.exists(DATA_FILE):
        os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
        return {'entries': {}}
    try:
        with open(DATA_FILE, 'r') as f:
            return json.load(f)
    except Exception:
        return {'entries': {}}


def save_data(data):
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def build_phases(data):
    """Return PHASES with any user-customized labels applied."""
    labels = data.get('labels', {})
    result = []
    for phase in PHASES:
        items = []
        for item in phase['items']:
            custom = labels.get(phase['id'], {}).get(item['id'])
            items.append({'id': item['id'], 'label': custom if custom else item['label']})
        result.append({**phase, 'items': items})
    return result


def get_default_entry():
    entry = {'completed': False}
    for phase in PHASES:
        entry[phase['id']] = {item['id']: False for item in phase['items']}
    return entry


def is_all_completed(entry):
    for phase in PHASES:
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


@app.route('/api/state', methods=['GET'])
def get_state():
    data = load_data()
    today = str(date.today())

    if today not in data['entries']:
        data['entries'][today] = get_default_entry()
        save_data(data)

    streak = calculate_streak(data['entries'])
    unlocked = [f for f in FIBONACCI if f <= streak]
    next_milestone = next((f for f in FIBONACCI if f > streak), None)

    return jsonify({
        'today': data['entries'][today],
        'phases': build_phases(data),
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

    if today not in data['entries']:
        data['entries'][today] = get_default_entry()

    entry = data['entries'][today]
    entry[phase_id][item_id] = not entry[phase_id][item_id]

    was_completed = entry.get('completed', False)
    all_done = is_all_completed(entry)
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
