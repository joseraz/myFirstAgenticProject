import React, { useState } from 'react';

const COLOR_CLASSES = ['color-0', 'color-1', 'color-2']; // red, blue, yellow rotation

function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export default function Sidebar({ streak, nextMilestone, unlockedAchievements, fibonacci, achievementNames, onBackfill }) {
  const daysToNext = nextMilestone ? nextMilestone - streak : null;
  const maxDate = yesterdayStr();

  const [backfillDate, setBackfillDate] = useState(maxDate);
  const [confirmed, setConfirmed] = useState(false);

  const handleMarkDone = async () => {
    await onBackfill(backfillDate);
    setConfirmed(true);
    setTimeout(() => setConfirmed(false), 2000);
  };

  return (
    <aside className="sidebar">
      {/* Streak counter */}
      <div className="streak-block">
        <div className="streak-block__label">Current Streak</div>
        <div className="streak-block__number">{streak}</div>
        <div className="streak-block__unit">{streak === 1 ? 'night' : 'nights'}</div>
      </div>

      {/* Backfill a missed night */}
      <div className="backfill-block">
        <div className="backfill-block__label">Missed a night?</div>
        <div className="backfill-block__row">
          <input
            type="date"
            className="backfill-block__date"
            value={backfillDate}
            max={maxDate}
            onChange={e => setBackfillDate(e.target.value)}
          />
          <button className="backfill-block__btn" onClick={handleMarkDone}>
            Mark Done
          </button>
        </div>
        {confirmed && <div className="backfill-block__confirm">Added!</div>}
      </div>

      {/* Next milestone */}
      <div className="next-block">
        {nextMilestone ? (
          <>
            <div className="next-block__label">Next Milestone</div>
            <div className="next-block__value">{nextMilestone}</div>
            <div className="next-block__sub">
              {daysToNext === 1 ? '1 night away' : `${daysToNext} nights away`}
              {' — '}{achievementNames[nextMilestone]}
            </div>
          </>
        ) : (
          <>
            <div className="next-block__label">Status</div>
            <div className="next-block__value" style={{ fontSize: '14px', letterSpacing: '0.05em' }}>
              All Unlocked
            </div>
          </>
        )}
      </div>

      {/* Achievements */}
      <div className="achievements-block">
        <div className="achievements-block__label">Achievements</div>
        <div className="achievement-list">
          {fibonacci.map((days, i) => {
            const unlocked = unlockedAchievements.includes(days);
            const colorClass = COLOR_CLASSES[i % 3];
            return (
              <div
                key={days}
                className={`achievement-item${unlocked ? ` achievement-item--unlocked ${colorClass}` : ''}`}
              >
                <div className="achievement-item__dot" />
                <span className="achievement-item__days">{days}</span>
                <span className="achievement-item__name">{achievementNames[days]}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
