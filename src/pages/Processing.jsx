import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, FileQuestion, FileText, Sparkles, TriangleAlert } from 'lucide-react';
import { useApp, useDocument } from '../state/AppContext.jsx';
import { DOCUMENT_TYPES } from '../data/mock-data.js';
import { formatFileSize } from '../data/format.js';
import { getPendingFields } from '../data/selectors.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';
import ProgressBar from '../components/ProgressBar.jsx';
import ProgressSteps from '../components/ProgressSteps.jsx';
import AiActivityMark from '../components/AiActivityMark.jsx';
import { usePrefersReducedMotion } from '../components/useMediaQuery.js';
import '../styles/processing.css';

const DURATION_MS = 5600;
const STAGES = [
  { label: 'Uploaded', message: 'Reading the document structure…', start: 0 },
  { label: 'AI Extraction', message: 'Extracting invoice fields…', start: 15 },
  { label: 'Tax Validation', message: 'Checking tax and MyInvois requirements…', start: 49 },
  { label: 'Ready for Review', message: 'Preparing the document for review…', start: 79 },
];

function ProcessingExperience({ doc, client, finishProcessing }) {
  const reducedMotion = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const completionRequested = useRef(false);
  const complete = doc.status !== 'processing';

  useEffect(() => {
    if (complete) return undefined;

    if (reducedMotion) {
      if (!completionRequested.current) {
        completionRequested.current = true;
        finishProcessing(doc.id);
      }
      return undefined;
    }

    let frame;
    const started = performance.now();
    const tick = (now) => {
      const next = Math.min(100, Math.floor(((now - started) / DURATION_MS) * 100));
      setProgress(next);
      if (next === 100) {
        if (!completionRequested.current) {
          completionRequested.current = true;
          finishProcessing(doc.id);
        }
      } else {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [complete, doc.id, finishProcessing, reducedMotion]);

  const percent = complete || reducedMotion ? 100 : progress;
  const currentStage = complete ? STAGES.length : STAGES.reduce((index, stage, i) => (percent >= stage.start ? i : index), 0);
  const message = complete ? 'Extraction complete. You can review the extracted data.' : STAGES[currentStage].message;
  const stageLabel = complete ? 'Ready for Review' : STAGES[currentStage].label;
  const attentionCount = getPendingFields(doc).length;

  return (
    <div className={`page stack-lg processing-page ${complete ? 'processing-page--complete' : ''}`}>
      <PageHeader title="AI Processing Queue" description="CukaiSmart is reading and validating your document." />

      <Card className="processing-document">
        <div className="processing-document__icon" aria-hidden="true"><FileText size={24} /></div>
        <div className="processing-document__details">
          <p className="processing-document__name">{doc.fileName}</p>
          <p className="text-caption">
            {DOCUMENT_TYPES[doc.type]} <span aria-hidden="true">·</span> {client?.name || 'Unknown client'} <span aria-hidden="true">·</span> {formatFileSize(doc.fileSize)}
            {doc.sampleImage && <> <span aria-hidden="true">·</span> Demo sample</>}
          </p>
        </div>
        <Badge status={doc.status} />
      </Card>

      <Card className="processing-workspace">
        <div className="processing-workspace__visual">
          <AiActivityMark complete={complete} light />
          <span className="chip chip--ai"><Sparkles size={12} aria-hidden="true" /> CukaiSmart AI</span>
          <span className="processing-workspace__stage-label">{complete ? 'Processing complete' : 'Current stage'}</span>
          <h2 className="text-h2" key={stageLabel}>{stageLabel}</h2>
          <p className="processing-workspace__message text-secondary" role="status" aria-live="polite" aria-atomic="true">
            <span key={message}>{message}</span>
          </p>
        </div>

        <div className="processing-workspace__progress">
          <ProgressSteps steps={STAGES.map((stage) => stage.label)} current={currentStage} />
          <ProgressBar variant="ai" value={percent} label="AI processing" />
        </div>

        {complete && (
          <div className="processing-results" aria-live="polite">
            <div className="processing-results__item">
              <span className="processing-results__icon processing-results__icon--success" aria-hidden="true"><CheckCircle2 size={20} /></span>
              <span><strong>{doc.fields.length} fields extracted</strong><span className="text-caption">Ready for your review</span></span>
            </div>
            <div className="processing-results__item">
              <span className={`processing-results__icon ${attentionCount ? 'processing-results__icon--attention' : 'processing-results__icon--success'}`} aria-hidden="true">
                {attentionCount ? <TriangleAlert size={20} /> : <CheckCircle2 size={20} />}
              </span>
              <span><strong>{attentionCount} {attentionCount === 1 ? 'field needs' : 'fields need'} attention</strong><span className="text-caption">{attentionCount ? 'Confirm or correct before approval' : 'No low-confidence fields to confirm'}</span></span>
            </div>
          </div>
        )}

        <div className="processing-workspace__footer">
          <p className="text-caption">{complete ? 'Review the extracted values before you approve them.' : 'You can review the results as soon as processing finishes.'}</p>
          <Button to={`/app/documents/${doc.id}/review`} iconRight={ArrowRight} aria-disabled={!complete} tabIndex={complete ? undefined : -1} onClick={complete ? undefined : (event) => event.preventDefault()}>
            Review Results
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function Processing() {
  const { id } = useParams();
  const found = useDocument(id);
  const { clients, finishProcessing } = useApp();

  if (!found) {
    return (
      <div className="page">
        <Card>
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true"><FileQuestion size={20} /></span>
            <p className="empty-state__title">Document not found</p>
            <p>No document with ID “{id}”. It may have been removed when the demo data was reset.</p>
            <Button to="/app/dashboard" variant="secondary" icon={ArrowLeft}>Back to dashboard</Button>
          </div>
        </Card>
      </div>
    );
  }

  const client = clients.find((item) => item.id === found.doc.clientId);
  return <ProcessingExperience key={id} doc={found.doc} client={client} finishProcessing={finishProcessing} />;
}
