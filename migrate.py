"""
One-time migration script: copies data from backend/data/routines.json into Supabase.

Run once after creating your Supabase project and tables:
    python migrate.py

Then delete this file.
"""
import json
import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

sb = create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_KEY'])

data_file = os.path.join(os.path.dirname(__file__), 'backend', 'data', 'routines.json')

if not os.path.exists(data_file):
    print(f'No data file found at {data_file} — nothing to migrate.')
    raise SystemExit(0)

with open(data_file, 'r') as f:
    data = json.load(f)

entries = data.get('entries', {})
labels = data.get('labels', {})

print(f'Migrating {len(entries)} entries and {sum(len(v) for v in labels.values())} label overrides...')

for date_str, entry in entries.items():
    sb.table('routine_entries').upsert({
        'entry_date': date_str,
        'completed': entry.get('completed', False),
        'phase1': entry.get('phase1', {}),
        'phase2': entry.get('phase2', {}),
        'phase3': entry.get('phase3', {}),
    }).execute()
    print(f'  migrated entry {date_str}')

for phase_id, items in labels.items():
    for item_id, label in items.items():
        sb.table('item_labels').upsert({
            'phase_id': phase_id,
            'item_id': item_id,
            'label': label,
        }).execute()
        print(f'  migrated label {phase_id}.{item_id} = "{label}"')

print('\nMigration complete. You can delete this file.')
