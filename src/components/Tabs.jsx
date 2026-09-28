import { useRef } from 'react';

/**
 * Accessible tab list (arrow keys, Home, End). Pair with <TabPanel idPrefix=...>.
 * tabs: [{ value, label, count? }]
 */
export default function Tabs({ tabs, value, onChange, label, idPrefix }) {
  const refs = useRef([]);

  const focusTab = (index) => {
    const i = (index + tabs.length) % tabs.length;
    refs.current[i]?.focus();
    onChange(tabs[i].value);
  };

  const onKeyDown = (e, index) => {
    if (e.key === 'ArrowRight') focusTab(index + 1);
    else if (e.key === 'ArrowLeft') focusTab(index - 1);
    else if (e.key === 'Home') focusTab(0);
    else if (e.key === 'End') focusTab(tabs.length - 1);
    else return;
    e.preventDefault();
  };

  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {tabs.map((tab, i) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            id={`${idPrefix}-tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`${idPrefix}-panel`}
            tabIndex={selected ? 0 : -1}
            className="tabs__tab"
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
          >
            {tab.label}
            {tab.count !== undefined && <span className="tabs__count">{tab.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({ idPrefix, value, children, className = '' }) {
  return (
    <div
      role="tabpanel"
      id={`${idPrefix}-panel`}
      aria-labelledby={`${idPrefix}-tab-${value}`}
      className={className}
    >
      {children}
    </div>
  );
}
