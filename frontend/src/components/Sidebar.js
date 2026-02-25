import React from 'react';

const COLOR_CLASSES = ['color-0', 'color-1', 'color-2']; // red, blue, yellow rotation

export default function Sidebar({ streak, nextMilestone, unlockedAchievements, fibonacci, achievementNames }) {
  const daysToNext = nextMilestone ? nextMilestone - streak : null;

  return (
    <aside className="sidebar">
      {/* Streak counter */}
      <div className="streak-block">
        <div className="streak-block__label">Current Streak</div>
        <div className="streak-block__number">{streak}</div>
        <div className="streak-block__unit">{streak === 1 ? 'night' : 'nights'}</div>
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
