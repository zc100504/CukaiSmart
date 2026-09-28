import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext.jsx';
import { formatDateTime } from '../data/format.js';
import { getDocRoute, getDocSummary, getLastActivityMap, sortDocuments } from '../data/selectors.js';
import Badge, { STATUSES } from './Badge.jsx';
import Table from './Table.jsx';

export const TYPE_LABELS = { sales: 'Sales e-Invoice', purchase: 'Purchase' };

/**
 * Sortable document table shared by Dashboard (and later Records).
 * Rows open the document's current workflow step.
 * sort / onSort are controlled by the page so they can live in the URL.
 */
export default function DocumentTable({ documents, sort, onSort, caption = 'Documents', onRowClick }) {
  const { auditEvents } = useApp();
  const navigate = useNavigate();
  const lastActivity = useMemo(() => getLastActivityMap(auditEvents), [auditEvents]);
  const rows = useMemo(() => sortDocuments(documents, sort, lastActivity), [documents, sort, lastActivity]);

  const columns = [
    {
      key: 'document',
      header: 'Document',
      sortable: true,
      render: (d) => {
        const { number, counterparty } = getDocSummary(d);
        return (
          <span className="doc-cell">
            <span className="text-label">{number}</span>
            <span className="text-caption">{counterparty}</span>
          </span>
        );
      },
    },
    { key: 'type', header: 'Type', sortable: true, render: (d) => TYPE_LABELS[d.type] },
    {
      key: 'uploaded',
      header: 'Uploaded',
      sortable: true,
      render: (d) => (
        <span className="doc-cell">
          <span>{formatDateTime(d.uploadedAt)}</span>
          <span className="text-caption">by {d.uploadedBy}</span>
        </span>
      ),
    },
    {
      key: 'lastEdited',
      header: 'Last edited',
      sortable: true,
      render: (d) => {
        const e = lastActivity[d.id];
        if (!e) return <span className="text-secondary">—</span>;
        return (
          <span className="doc-cell">
            <span>{formatDateTime(e.at)}</span>
            <span className="text-caption">by {e.actor}</span>
          </span>
        );
      },
    },
    { key: 'status', header: 'Status', sortable: true, render: (d) => <Badge status={d.status} /> },
  ];

  return (
    <Table
      columns={columns}
      rows={rows}
      caption={caption}
      sort={sort}
      onSort={onSort}
      onRowClick={onRowClick || ((d) => navigate(getDocRoute(d)))}
      rowLabel={(d) => `${getDocSummary(d).number}, ${TYPE_LABELS[d.type]}, ${STATUSES[d.status]}. Open document.`}
    />
  );
}
