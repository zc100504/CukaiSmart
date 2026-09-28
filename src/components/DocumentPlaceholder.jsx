import { useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion } from 'lucide-react';
import { useDocument } from '../state/AppContext.jsx';
import { DOCUMENT_TYPES } from '../data/mock-data.js';
import { formatDate, formatRM } from '../data/format.js';
import { getDocSummary } from '../data/selectors.js';
import Badge from './Badge.jsx';
import Button from './Button.jsx';
import Card from './Card.jsx';
import ComingSoon from './ComingSoon.jsx';
import PageHeader from './PageHeader.jsx';

/** Temporary shell for document screens until each is built in its own phase. */
export default function DocumentPlaceholder({ title, description }) {
  const { id } = useParams();
  const found = useDocument(id);

  if (!found) {
    return (
      <div className="page">
        <Card>
          <div className="empty-state">
            <span className="empty-state__icon" aria-hidden="true">
              <FileQuestion size={20} />
            </span>
            <p className="empty-state__title">Document not found</p>
            <p>No document with ID “{id}”. It may have been removed when the demo data was reset.</p>
            <Button to="/app/records" variant="secondary" icon={ArrowLeft}>
              Back to Records
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { doc } = found;
  const summary = getDocSummary(doc);

  return (
    <div className="page stack-lg">
      <PageHeader title={title} description={description}>
        <div className="row-sm">
          <span className="text-caption">
            {DOCUMENT_TYPES[doc.type]} · {summary.number}
          </span>
          <Badge status={doc.status} />
        </div>
      </PageHeader>
      <Card>
        <dl className="meta-grid">
          <div>
            <dt>{doc.type === 'sales' ? 'Buyer' : 'Supplier'}</dt>
            <dd>{summary.counterparty}</dd>
          </div>
          <div>
            <dt>Invoice date</dt>
            <dd>{formatDate(summary.date)}</dd>
          </div>
          <div>
            <dt>Total</dt>
            <dd>{formatRM(summary.total)}</dd>
          </div>
          <div>
            <dt>File</dt>
            <dd>{doc.fileName}</dd>
          </div>
        </dl>
      </Card>
      <Card>
        <ComingSoon title="Screen coming in a later phase" message="The app shell, routing and data for this document are ready.">
          <Button to="/app/review-queue" variant="secondary" icon={ArrowLeft}>
            Back to Review Queue
          </Button>
        </ComingSoon>
      </Card>
    </div>
  );
}
