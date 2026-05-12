import { useState } from 'react';

const TIPS = [
  {
    icon: '📍',
    title: 'Clock In at MDIHub',
    text: 'You must be within the MDIHub geofence (100m radius) to clock in. Your GPS location is verified automatically.'
  },
  {
    icon: '☕',
    title: 'Break Reminders',
    text: 'Tea break is 10:00-10:30 and lunch is 13:00-14:00. The app will remind you automatically when it\'s time.'
  },
  {
    icon: '⏰',
    title: 'Clock In Before 08:30',
    text: 'Work starts at 08:00. If you clock in after 08:30 you\'ll be flagged as "Late". Clock out by 16:30.'
  },
  {
    icon: '📋',
    title: 'Track Your Attendance',
    text: 'View your clock-in/out times and daily hours in the Attendance page. Your history is always available.'
  },
  {
    icon: '📅',
    title: 'Request Leave',
    text: 'Need time off? Submit a leave request from the Leave page. Admin will review and approve it.'
  },
  {
    icon: '📡',
    title: 'Works Offline',
    text: 'MDIHub works without internet. Your clock-ins are saved locally and sync automatically when you\'re back online.'
  }
];

export function TutorialOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const total = TIPS.length;
  const tip = TIPS[step];

  const handleFinish = () => {
    localStorage.setItem('mdihub_tutorial_seen', 'true');
    onClose();
  };

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-card">
        <div className="tutorial-steps">
          {TIPS.map((_, i) => (
            <span key={i} className={`tutorial-step-dot ${i === step ? 'active' : ''} ${i < step ? 'done' : ''}`} />
          ))}
        </div>
        <div className="tutorial-icon">{tip.icon}</div>
        <h3 className="tutorial-title">{tip.title}</h3>
        <p className="tutorial-text">{tip.text}</p>
        <div className="tutorial-actions">
          {step > 0 && (
            <button className="btn btn-ghost" onClick={() => setStep(s => s - 1)}>
              Back
            </button>
          )}
          <button
            className={`btn ${step < total - 1 ? 'btn-primary' : 'btn-success'}`}
            onClick={() => step < total - 1 ? setStep(s => s + 1) : handleFinish()}
          >
            {step < total - 1 ? 'Next' : 'Get Started'}
          </button>
        </div>
        {step < total - 1 && (
          <button className="tutorial-skip" onClick={handleFinish}>
            Skip tutorial
          </button>
        )}
      </div>
    </div>
  );
}
