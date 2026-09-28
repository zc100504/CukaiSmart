import { useApp } from '../state/AppContext.jsx';
import PagePlaceholder from '../components/PagePlaceholder.jsx';

export default function Upload() {
  const { activeClient } = useApp();
  return (
    <PagePlaceholder
      title="Upload documents"
      description={`Add sales invoices or purchase receipts for ${activeClient.name}. PDF, JPG or PNG.`}
    />
  );
}
