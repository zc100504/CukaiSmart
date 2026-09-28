import { useState } from 'react';
import { Building2, FileDigit, Hash, Receipt, User } from 'lucide-react';
import { useApp } from '../state/AppContext.jsx';
import { BRN_PATTERN, SST_PATTERN, TIN_PATTERN } from '../data/selectors.js';
import { useToast } from './Toast.jsx';
import Button from './Button.jsx';
import Input from './Input.jsx';
import Modal from './Modal.jsx';

const EMPTY = { name: '', tin: '', brn: '', sst: '', contact: '' };
const FIELD_ORDER = ['name', 'tin', 'brn', 'sst', 'contact'];
const FORM_ID = 'add-client-form';

const normalise = (v) => ({
  name: v.name.trim(),
  tin: v.tin.trim().toUpperCase(),
  brn: v.brn.replace(/\s|-/g, ''),
  sst: v.sst.trim().toUpperCase(),
  contact: v.contact.trim(),
});

/** Hard errors block saving. */
function validate(raw, clients) {
  const v = normalise(raw);
  const errors = {};
  if (!v.name) errors.name = 'Enter the business name.';
  if (!v.tin) {
    errors.tin = 'Enter the TIN.';
  } else {
    const duplicate = clients.find((c) => c.tin.toUpperCase() === v.tin);
    if (duplicate) errors.tin = `This TIN already belongs to ${duplicate.name}.`;
  }
  if (!v.brn) errors.brn = 'Enter the BRN.';
  else if (!BRN_PATTERN.test(v.brn)) errors.brn = 'BRN must be 12 digits, e.g. 202001012345.';
  if (v.sst && !SST_PATTERN.test(v.sst)) errors.sst = 'Use the format W10-1808-31000123, or leave blank.';
  if (!v.contact) errors.contact = 'Enter a contact person.';
  return errors;
}

/** Soft warnings are shown but never block saving. */
function warnings(raw) {
  const tin = raw.tin.trim().toUpperCase();
  return tin && !TIN_PATTERN.test(tin) ? { tin: 'Unusual TIN format, please double-check.' } : {};
}

export default function AddClientModal({ open, onClose }) {
  const { clients, addClient } = useApp();
  const toast = useToast();
  const [values, setValues] = useState(EMPTY);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const errors = validate(values, clients);
  const warn = warnings(values);
  const show = (f) => (touched[f] || submitted ? errors[f] : undefined);

  const set = (f) => (e) => setValues((v) => ({ ...v, [f]: e.target.value }));
  const blur = (f) => () => setTouched((t) => ({ ...t, [f]: true }));

  const close = () => {
    setValues(EMPTY);
    setTouched({});
    setSubmitted(false);
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    const firstInvalid = FIELD_ORDER.find((f) => errors[f]);
    if (firstInvalid) {
      document.getElementById(`client-${firstInvalid}`)?.focus();
      return;
    }
    const v = normalise(values);
    const result = addClient(v);
    if (!result.ok) {
      toast.error('Could not add client', result.message);
      return;
    }
    toast.success('Client added', `${v.name} is now in your client list.`);
    close();
  };

  const field = (name, props) => (
    <Input
      id={`client-${name}`}
      value={values[name]}
      onChange={set(name)}
      onBlur={blur(name)}
      error={show(name)}
      {...props}
    />
  );

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add client"
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID}>
            Add client
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="stack" onSubmit={handleSubmit} noValidate>
        <p className="text-caption">Fields marked * are required. Details can be changed later in client settings.</p>
        {field('name', { label: 'Business name', icon: Building2, required: true, autoComplete: 'organization' })}
        <div className="grid-2">
          {field('tin', {
            label: 'TIN',
            icon: Hash,
            required: true,
            warning: touched.tin || submitted ? warn.tin : undefined,
            helper: 'e.g. C20880145020 or IG21475839010',
          })}
          {field('brn', { label: 'BRN', icon: FileDigit, required: true, inputMode: 'numeric', helper: '12 digits' })}
        </div>
        <div className="grid-2">
          {field('sst', { label: 'SST registration no.', icon: Receipt, helper: 'Optional' })}
          {field('contact', { label: 'Contact person', icon: User, required: true, autoComplete: 'name' })}
        </div>
      </form>
    </Modal>
  );
}
