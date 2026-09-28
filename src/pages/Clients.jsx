import { useApp } from '../state/AppContext.jsx';
import { countByStatus, getClientDocuments } from '../data/selectors.js';
import Card from '../components/Card.jsx';
import PagePlaceholder from '../components/PagePlaceholder.jsx';

export default function Clients() {
  const { clients, documents } = useApp();

  return (
    <PagePlaceholder title="Clients" description="Businesses you manage e-Invoicing for.">
      <div className="grid-4">
        {clients.map((c) => {
          const counts = countByStatus(getClientDocuments(documents, c.id));
          return (
            <Card key={c.id} title={c.name} subtitle={`TIN ${c.tin}`}>
              <p className="text-caption">
                {counts.total} documents · {counts.pending} pending
              </p>
            </Card>
          );
        })}
      </div>
    </PagePlaceholder>
  );
}
