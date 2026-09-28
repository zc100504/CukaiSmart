import { useApp } from '../state/AppContext.jsx';
import PagePlaceholder from '../components/PagePlaceholder.jsx';

export default function ReviewQueue() {
  const { activeClient, reviewQueue } = useApp();
  return (
    <PagePlaceholder
      title="Review Queue"
      description={`${reviewQueue.length} ${reviewQueue.length === 1 ? 'document needs' : 'documents need'} attention for ${activeClient.name}, most urgent first.`}
    />
  );
}
