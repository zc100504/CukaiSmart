import { useParams } from 'react-router-dom';
import { ArrowLeft, FileQuestion, Hourglass } from 'lucide-react';
import { useApp, useDocument } from '../state/AppContext.jsx';
import { DOCUMENT_TYPES } from '../data/mock-data.js';
import { formatFileSize } from '../data/format.js';
import Badge from '../components/Badge.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import PageHeader from '../components/PageHeader.jsx';

/** Placeholder until the timed AI-processing screen is built. */
export default function Processing() {
  const { id } = useParams();
  const found = useDocument(id);
  const { clients } = useApp();

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
            <Button to="/app/dashboard" variant="secondary" icon={ArrowLeft}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const { doc } = found;
  const client = clients.find((c) => c.id === doc.clientId);

  return (
    <div className="page stack-lg">
      <PageHeader title="AI processing">
        <div className="row-sm">
          <span className="text-caption">
            {DOCUMENT_TYPES[doc.type]} · {client?.name}
          </span>
          <Badge status={doc.status} />
        </div>
      </PageHeader>
      <Card>
        <div className="empty-state">
          <span className="empty-state__icon" aria-hidden="true">
            <Hourglass size={20} />
          </span>
          <p className="empty-state__title">{doc.fileName}</p>
          <p>
            {formatFileSize(doc.fileSize)}
            {doc.sampleImage ? ' · Demo sample' : ''}
          </p>
          <p className="text-body-lg">AI processing screen coming soon</p>
          <Button to="/app/dashboard" icon={ArrowLeft}>
            Back to dashboard
          </Button>
        </div>
      </Card>
    </div>
  );
}
