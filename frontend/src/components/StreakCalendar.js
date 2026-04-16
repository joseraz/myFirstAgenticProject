import React, { useEffect, useState } from 'react';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKS = 52;

/**
 * Builds an array of 52 week columns, each with 7 day cells (Mon–Sun).
 * Each cell: { dateStr: 'YYYY-MM-DD' | null, isToday: boolean }
 * The grid ends with today in the rightmost column.
 */
function buildGrid() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the Sunday that ends the current week (or today if Sunday)
  const dayOfWeek = today.getDay(); // 0=Sun, 1=Mon … 6=Sat
  // We want Mon–Sun columns. Day index in our grid: Mon=0 … Sun=6
  const todayIdx = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // 0-based Mon=0

  // The grid is WEEKS×7 cells. Today sits at column (WEEKS-1), row todayIdx.
  // Total cells = WEEKS * 7. Today is at absolute index (WEEKS-1)*7 + todayIdx.
  const todayAbsolute = (WEEKS - 1) * 7 + todayIdx;

  const cells = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const daysFromToday = i - todayAbsolute;
    if (daysFromToday > 0) {
      cells.push({ dateStr: null, isToday: false }); // future — blank
    } else {
      const d = new Date(today);
      d.setDate(d.getDate() + daysFromToday);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      cells.push({ dateStr: `${y}-${m}-${day}`, isToday: daysFromToday === 0 });
    }
  }

  // Reshape into WEEKS columns of 7 rows
  const weeks = [];
  for (let w = 0; w < WEEKS; w++) {
    weeks.push(cells.slice(w * 7, w * 7 + 7));
  }
  return weeks;
}

/**
 * Returns an array of { label, colIndex } for month labels.
 * A label appears at the first column where a new month begins.
 */
function buildMonthLabels(weeks) {
  const labels = [];
  let lastMonth = null;
  weeks.forEach((week, wi) => {
    // Use first non-null cell in the week to determine month
    const cell = week.find(c => c.dateStr);
    if (!cell) return;
    const month = parseInt(cell.dateStr.split('-')[1], 10) - 1;
    if (month !== lastMonth) {
      labels.push({ label: MONTHS[month], colIndex: wi });
      lastMonth = month;
    }
  });
  return labels;
}

export default function StreakCalendar({ compact = false }) {
  const [history, setHistory] = useState({});

  useEffect(() => {
    fetch('/api/history')
      .then(r => r.json())
      .then(d => setHistory(d.history || {}))
      .catch(() => {}); // silently degrade — grid stays empty
  }, []);

  const weeks = buildGrid();
  const monthLabels = buildMonthLabels(weeks);

  // Build a lookup from colIndex → label
  const monthMap = {};
  monthLabels.forEach(({ label, colIndex }) => { monthMap[colIndex] = label; });

  return (
    <div className={`streak-calendar${compact ? ' streak-calendar--compact' : ''}`}>
      {/* Month labels row — hidden in compact mode */}
      {!compact && <div className="streak-calendar__months">
        {weeks.map((_, wi) => (
          <div key={wi} className="streak-calendar__month-slot">
            {monthMap[wi] ? (
              <span className="streak-calendar__month-label">{monthMap[wi]}</span>
            ) : null}
          </div>
        ))}
      </div>}

      {/* Grid */}
      <div className="streak-calendar__grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="streak-calendar__week">
            {week.map((cell, di) => {
              const done = cell.dateStr ? history[cell.dateStr] === true : false;
              const empty = !cell.dateStr;
              let cls = 'streak-calendar__cell';
              if (empty) cls += ' streak-calendar__cell--empty';
              else if (done) cls += ' streak-calendar__cell--done';
              if (cell.isToday) cls += ' streak-calendar__cell--today';
              return (
                <div
                  key={di}
                  className={cls}
                  title={cell.dateStr || ''}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
