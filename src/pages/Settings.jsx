import { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Modal from '../components/Modal.jsx';
import PagePlaceholder from '../components/PagePlaceholder.jsx';

export default function Settings() {
  const { resetDemo } = useApp();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleReset = () => {
    resetDemo();
    setConfirmOpen(false);
    toast.success('Demo data reset', 'Clients, documents and audit trail are back to the original sample data.');
  };

  return (
    <PagePlaceholder title="Settings" description="Profile, business details and demo controls.">
      <Card
        title="Reset demo data"
        subtitle="Restore every client, document, notification and audit event to the original sample data. You stay signed in."
        actions={
          <Button variant="danger" icon={RotateCcw} onClick={() => setConfirmOpen(true)}>
            Reset demo data
          </Button>
        }
      />
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep my data
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset data
            </Button>
          </>
        }
      >
        <p>Uploads, edits, approvals and audit events from this session will be replaced. This can't be undone.</p>
      </Modal>
    </PagePlaceholder>
  );
}
