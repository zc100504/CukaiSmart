import { useEffect, useMemo, useState } from 'react';
import { Building2, RotateCcw, Save, ShieldAlert, UserRound } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { useToast } from '../components/Toast.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import Input from '../components/Input.jsx';
import Modal from '../components/Modal.jsx';
import PageHeader from '../components/PageHeader.jsx';
import '../styles/settings.css';

export default function Settings() {
  const { user, business, updateProfile, resetDemo } = useApp();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: user.name, email: user.email, businessName: business.name, brn: business.brn || '' });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setForm({ name: user.name, email: user.email, businessName: business.name, brn: business.brn || '' });
    setErrors({});
  }, [business.brn, business.name, user.email, user.name]);

  const dirty = useMemo(() => (
    form.name !== user.name
    || form.email !== user.email
    || form.businessName !== business.name
    || form.brn !== (business.brn || '')
  ), [business.brn, business.name, form, user.email, user.name]);

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    if (saving) return;
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Enter a display name.';
    if (!form.email.trim()) nextErrors.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!form.businessName.trim()) nextErrors.businessName = 'Enter an accounting firm name.';
    if (Object.keys(nextErrors).length) { setErrors(nextErrors); toast.error('Check your settings', 'Complete the required fields before saving.'); return; }

    setSaving(true);
    const result = updateProfile({
      user: { name: form.name, email: form.email },
      business: { name: form.businessName, brn: form.brn },
    });
    setSaving(false);
    if (!result.ok) { toast.error('Could not save settings', result.message); return; }
    toast.success('Settings saved', 'Your profile and accounting firm workspace were updated.');
  };

  const handleReset = () => {
    const result = resetDemo();
    if (!result.ok) { toast.error('Could not reset demo data', result.message); return; }
    setConfirmOpen(false);
    toast.success('Demo data reset', 'Clients, documents, review items, notifications and audit events were restored.');
  };

  return (
    <div className="page stack-lg settings-page">
      <PageHeader title="Settings" description="Manage your profile, accounting firm workspace and prototype data." />

      <form className="settings-form stack-lg" onSubmit={handleSave} noValidate>
        <Card title="Profile" subtitle="Details shown in your account menu and audit activity." actions={<span className="settings-section-icon" aria-hidden="true"><UserRound size={20} /></span>}>
          <div className="settings-grid">
            <Input label="Display name" required value={form.name} onChange={(event) => setValue('name', event.target.value)} error={errors.name} autoComplete="name" />
            <Input label="Email address" required type="email" value={form.email} onChange={(event) => setValue('email', event.target.value)} error={errors.email} autoComplete="email" />
            <Input label="Role" value={user.role} readOnly aria-readonly="true" helper="Roles are fixed in this frontend prototype." />
          </div>
        </Card>

        <Card title="Accounting firm workspace" subtitle="Workspace details shown across the signed-in application." actions={<span className="settings-section-icon" aria-hidden="true"><Building2 size={20} /></span>}>
          <div className="settings-grid settings-grid--workspace">
            <Input label="Accounting firm name" required value={form.businessName} onChange={(event) => setValue('businessName', event.target.value)} error={errors.businessName} autoComplete="organization" />
            <Input label="Business registration number" value={form.brn} onChange={(event) => setValue('brn', event.target.value)} helper="Optional workspace registration reference." />
          </div>
        </Card>

        <div className="settings-savebar"><span className="text-caption" aria-live="polite">{dirty ? 'You have unsaved changes.' : 'Your settings are up to date.'}</span><Button type="submit" icon={Save} disabled={!dirty || saving}>{saving ? 'Saving…' : 'Save changes'}</Button></div>
      </form>

      <Card className="settings-danger" title="Demo controls" subtitle="Restore the prototype to its original sample state." actions={<span className="settings-section-icon settings-section-icon--danger" aria-hidden="true"><ShieldAlert size={20} /></span>}>
        <div className="settings-danger__content"><div><strong>Reset demo data</strong><p>Restore clients, documents, review items, notifications and audit events. Your signed-in session remains active.</p></div><Button variant="danger" icon={RotateCcw} onClick={() => setConfirmOpen(true)}>Reset demo data</Button></div>
      </Card>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reset demo data?"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReset}>
              Reset demo data
            </Button>
          </>
        }
      >
        <div className="stack"><div className="alert alert--warning"><ShieldAlert size={18} aria-hidden="true" /><span>This replaces all changes made during this demo session.</span></div><p>Clients, documents, Review Queue items, notifications and audit events will return to their original sample state. You will remain signed in.</p></div>
      </Modal>
    </div>
  );
}
