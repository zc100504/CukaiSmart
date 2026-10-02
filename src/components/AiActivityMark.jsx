import '../styles/ai-activity.css';

/** Reusable, decorative processing mark. Status copy lives outside this element. */
export default function AiActivityMark({ compact = false, complete = false, light = false }) {
  return (
    <div className={`ai-activity ${compact ? 'ai-activity--compact' : ''} ${complete ? 'ai-activity--complete' : ''} ${light ? 'ai-activity--light' : ''}`} aria-hidden="true">
      <span className="ai-activity__aura" />
      <span className="ai-activity__ring ai-activity__ring--outer" />
      <span className="ai-activity__ring ai-activity__ring--middle" />
      <span className="ai-activity__ring ai-activity__ring--inner" />
      <span className="ai-activity__arc ai-activity__arc--one" />
      <span className="ai-activity__arc ai-activity__arc--two" />
      <span className="ai-activity__node ai-activity__node--one" />
      <span className="ai-activity__node ai-activity__node--two" />
      <span className="ai-activity__node ai-activity__node--three" />
      <span className="ai-activity__node ai-activity__node--four" />
      <span className="ai-activity__node ai-activity__node--five" />
      <span className="ai-activity__core">
        <span className="ai-activity__grid" />
        <img src={`${import.meta.env.BASE_URL}processing-mark.png`} alt="" />
        {!complete && <span className="ai-activity__scan" />}
      </span>
      <span className="ai-activity__signal ai-activity__signal--one" />
      <span className="ai-activity__signal ai-activity__signal--two" />
    </div>
  );
}
