import { useApp } from '../state/AppContext.jsx';
import PagePlaceholder from '../components/PagePlaceholder.jsx';

export default function Records() {
  const { activeClient, counts } = useApp();
  return (
    <PagePlaceholder
      title="Records"
      description={`${counts.total} documents for ${activeClient.name}. Open a row to see its audit trail.`}
    />
  );
}
