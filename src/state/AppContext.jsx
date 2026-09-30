import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import {
  AI_ACTOR,
  DOCUMENT_TYPES,
  SAMPLE_DOCUMENTS,
  STATE_VERSION,
  buildUploadedDocument,
  createSeedState,
  formatFieldValue,
  getSampleClient,
} from '../data/mock-data.js';
import { nowLocalISO } from '../data/format.js';
import {
  complianceStatus,
  countByStatus,
  getBlockers,
  getClientDocuments,
  getComplianceChecks,
  getDocSummary,
  getPendingFields,
  getReviewQueue,
  makeReference,
  nextDocumentId,
} from '../data/selectors.js';

const STORAGE_KEY = 'cukaismart:state';

const AppContext = createContext(null);

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.version === STATE_VERSION && Array.isArray(parsed.documents)) return parsed;
    }
  } catch {
    // Corrupt or blocked storage — fall back to seed data.
  }
  return createSeedState();
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — the demo keeps working in memory.
  }
}

// ---------------------------------------------------------------------------
// Reducer
// Every action carries `meta: { id, at }` so the reducer stays deterministic.
// ---------------------------------------------------------------------------

const updateDoc = (state, docId, fn) => ({
  ...state,
  documents: state.documents.map((d) => (d.id === docId ? fn(d) : d)),
});

const withEvent = (state, meta, event) => ({
  ...state,
  auditEvents: [
    {
      id: `e${meta.id}`,
      at: meta.at,
      actor: state.user.displayName,
      docId: null,
      clientId: null,
      field: null,
      before: null,
      after: null,
      ...event,
    },
    ...state.auditEvents,
  ],
});

const withNotification = (state, meta, notification) => ({
  ...state,
  notifications: [{ id: `n${meta.id}`, at: meta.at, read: false, docId: null, ...notification }, ...state.notifications],
});

const docEvent = (doc) => ({ docId: doc.id, clientId: doc.clientId });

/** Keeps a compliance-stage document's badge in sync with its current blockers. */
function syncComplianceStatus(state, docId) {
  return updateDoc(state, docId, (d) =>
    d.stage === 'compliance' ? { ...d, status: complianceStatus(d, state.documents) } : d
  );
}

function reducer(state, action) {
  const { meta } = action;
  const findDoc = (id) => state.documents.find((d) => d.id === id);

  switch (action.type) {
    case 'LOGIN':
      return withEvent({ ...state, auth: { loggedIn: true } }, meta, {
        action: 'login',
        message: `Signed in as ${action.email || state.user.email}`,
      });

    case 'SIGNUP': {
      const { name, email, company, accountType } = action;
      const user = {
        ...state.user,
        name,
        email,
        displayName: name.trim().split(/\s+/)[0],
        accountType,
        role: accountType === 'firm' ? 'Firm administrator' : 'Business owner',
      };
      const next = { ...state, auth: { loggedIn: true }, user, business: { ...state.business, name: company } };
      return withEvent(next, meta, {
        actor: user.displayName,
        action: 'signup',
        message: `Created ${accountType === 'firm' ? 'Accounting firm' : 'SME'} account for ${company}`,
      });
    }

    case 'LOGOUT':
      return withEvent({ ...state, auth: { loggedIn: false } }, meta, { action: 'logout', message: 'Signed out' });

    case 'SWITCH_CLIENT': {
      const client = state.clients.find((c) => c.id === action.clientId);
      if (!client || client.id === state.activeClientId) return state;
      return withEvent({ ...state, activeClientId: client.id }, meta, {
        action: 'client_switched',
        clientId: client.id,
        message: `Switched active client to ${client.name}`,
      });
    }

    case 'ADD_CLIENT':
      return withEvent({ ...state, clients: [...state.clients, action.client] }, meta, {
        action: 'client_added',
        clientId: action.client.id,
        message: `Added client ${action.client.name}`,
      });

    case 'UPLOAD_DOCUMENTS': {
      const { docs } = action;
      let next = {
        ...state,
        documents: [...docs, ...state.documents],
        usage: { ...state.usage, used: state.usage.used + docs.length },
      };
      docs.forEach((doc, i) => {
        next = withEvent(next, { ...meta, id: `${meta.id}-${i}` }, {
          ...docEvent(doc),
          action: 'uploaded',
          message: `Uploaded ${doc.fileName} as ${DOCUMENT_TYPES[doc.type]}${doc.sampleImage ? ' (demo sample)' : ''}`,
        });
      });
      return next;
    }

    case 'FINISH_PROCESSING': {
      const doc = findDoc(action.docId);
      if (!doc || doc.status !== 'processing') return state;
      const low = getPendingFields(doc).length;
      const { number } = getDocSummary(doc);
      let next = updateDoc(state, doc.id, (d) => ({ ...d, status: 'needs-review', stage: 'review', processedAt: meta.at }));
      next = withEvent(next, meta, {
        ...docEvent(doc),
        actor: AI_ACTOR,
        action: 'extracted',
        message: `AI extracted ${doc.fields.length} fields${low ? ` — ${low} need attention` : ''}`,
      });
      return withNotification(next, meta, {
        title: `${number} ready for review`,
        message: low ? `${low} ${low === 1 ? 'field needs' : 'fields need'} attention.` : 'All fields extracted with high confidence.',
        docId: doc.id,
      });
    }

    case 'UPDATE_FIELD': {
      const doc = findDoc(action.docId);
      const field = doc?.fields.find((f) => f.key === action.key);
      if (!field || field.value === action.value) return state;
      const before = formatFieldValue(field.format, field.value);
      const after = formatFieldValue(field.format, action.value);
      let next = updateDoc(state, doc.id, (d) => ({
        ...d,
        fields: d.fields.map((f) =>
          f.key === action.key ? { ...f, value: action.value, edited: true, confirmed: true } : f
        ),
      }));
      next = syncComplianceStatus(next, doc.id);
      return withEvent(next, meta, {
        ...docEvent(doc),
        action: 'field_edited',
        field: field.label,
        before,
        after,
        message: `${field.label} edited from ${before} to ${after}`,
      });
    }

    case 'CLEAR_DUPLICATE': {
      const doc = findDoc(action.docId);
      if (!doc || doc.duplicateCleared) return state;
      let next = updateDoc(state, doc.id, (d) => ({ ...d, duplicateCleared: true }));
      next = syncComplianceStatus(next, doc.id);
      return withEvent(next, meta, {
        ...docEvent(doc),
        action: 'duplicate_cleared',
        message: 'Possible duplicate reviewed and cleared as a separate document',
      });
    }

    case 'CONFIRM_FIELD': {
      const doc = findDoc(action.docId);
      const field = doc?.fields.find((f) => f.key === action.key);
      if (!field || field.confirmed) return state;
      const next = updateDoc(state, doc.id, (d) => ({
        ...d,
        fields: d.fields.map((f) => (f.key === action.key ? { ...f, confirmed: true } : f)),
      }));
      return withEvent(next, meta, {
        ...docEvent(doc),
        action: 'field_confirmed',
        field: field.label,
        message: `${field.label} confirmed as ${formatFieldValue(field.format, field.value)}`,
      });
    }

    case 'SAVE_DRAFT': {
      const doc = findDoc(action.docId);
      if (!doc) return state;
      return withEvent(state, meta, { ...docEvent(doc), action: 'draft_saved', message: 'Review progress saved as draft' });
    }

    case 'APPROVE': {
      const doc = findDoc(action.docId);
      if (!doc) return state;
      let next = updateDoc(state, doc.id, (d) => ({ ...d, stage: 'compliance', approvedAt: meta.at }));
      next = syncComplianceStatus(next, doc.id);
      return withEvent(next, meta, {
        ...docEvent(doc),
        action: 'approved',
        message: `Approved extracted data for ${getDocSummary(doc).number}`,
      });
    }

    case 'MARK_READY': {
      const doc = findDoc(action.docId);
      if (!doc) return state;
      const next = updateDoc(state, doc.id, (d) => ({ ...d, status: 'ready', stage: 'finish', readyAt: meta.at }));
      return withEvent(next, meta, {
        ...docEvent(doc),
        action: 'marked_ready',
        message: 'Marked ready — all blocking compliance checks passed',
      });
    }

    case 'EXPORT': {
      const doc = findDoc(action.docId);
      if (!doc) return state;
      const labels = {
        json: 'Generated MyInvois JSON',
        csv: doc.type === 'sales' ? 'Exported CSV' : 'Exported CSV for accounting software',
      };
      // Purchase documents end their journey in accounting records; sales exports are copies only.
      const next =
        doc.type === 'purchase'
          ? updateDoc(state, doc.id, (d) => ({ ...d, status: 'exported', stage: 'done', exportedAt: meta.at }))
          : updateDoc(state, doc.id, (d) => ({ ...d, exportedAt: meta.at }));
      return withEvent(next, meta, {
        ...docEvent(doc),
        action: 'exported',
        message: labels[action.format] || `Exported ${action.format.toUpperCase()}`,
      });
    }

    case 'SUBMIT': {
      const doc = findDoc(action.docId);
      if (!doc) return state;
      const { number } = getDocSummary(doc);
      let next = updateDoc(state, doc.id, (d) => ({
        ...d,
        status: 'submitted',
        stage: 'done',
        submittedAt: meta.at,
        submissionRef: action.reference,
      }));
      next = withEvent(next, meta, {
        ...docEvent(doc),
        action: 'submitted',
        message: `Submitted to MyInvois (sandbox — simulated). Ref ${action.reference}`,
      });
      return withNotification(next, meta, {
        title: 'Submitted to MyInvois (simulated)',
        message: `${number} accepted in sandbox. Not sent to LHDN.`,
        docId: doc.id,
      });
    }

    case 'ADD_AUDIT_EVENT':
      return withEvent(state, meta, action.event);

    case 'UPDATE_PROFILE': {
      const user = { ...state.user, ...action.user };
      user.displayName = (user.name || '').trim().split(/\s+/)[0] || state.user.displayName;
      return withEvent({ ...state, user, business: { ...state.business, ...action.business } }, meta, {
        action: 'settings_updated',
        message: 'Profile and business details updated',
      });
    }

    case 'MARK_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map((n) =>
          !action.ids || action.ids.includes(n.id) ? { ...n, read: true } : n
        ),
      };

    case 'RESET': {
      const seed = createSeedState();
      return withEvent({ ...seed, auth: state.auth }, meta, { action: 'reset', message: 'Demo data reset' });
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

let metaCounter = 0;
const makeMeta = () => {
  metaCounter += 1;
  return { id: `${Date.now().toString(36)}${metaCounter}`, at: nowLocalISO() };
};

const ok = (extra = {}) => ({ ok: true, ...extra });
const fail = (message) => ({ ok: false, message });

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Latest state for guards inside stable action callbacks.
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const run = useCallback((action) => dispatch({ ...action, meta: makeMeta() }), []);
  const getDoc = (id) => stateRef.current.documents.find((d) => d.id === id);

  const actions = useMemo(
    () => ({
      login: (email) => {
        run({ type: 'LOGIN', email });
        return ok();
      },

      /** @param {{ name, email, company, accountType: 'sme'|'firm' }} details */
      signup: ({ name, email, company, accountType }) => {
        if (!name?.trim() || !email?.trim() || !company?.trim()) return fail('Name, email and company are required.');
        if (!['sme', 'firm'].includes(accountType)) return fail('Choose an account type.');
        run({ type: 'SIGNUP', name: name.trim(), email: email.trim(), company: company.trim(), accountType });
        return ok();
      },

      logout: () => {
        run({ type: 'LOGOUT' });
        return ok();
      },

      switchClient: (clientId) => {
        if (!stateRef.current.clients.some((c) => c.id === clientId)) return fail('Client not found.');
        run({ type: 'SWITCH_CLIENT', clientId });
        return ok();
      },

      addClient: (details) => {
        const { clients } = stateRef.current;
        const tin = (details.tin || '').trim().toUpperCase();
        if (!details.name?.trim()) return fail('Business name is required.');
        if (!tin) return fail('TIN is required.');
        const duplicate = clients.find((c) => c.tin.toUpperCase() === tin);
        if (duplicate) return fail(`This TIN already belongs to ${duplicate.name}.`);
        const id = `c${clients.reduce((m, c) => Math.max(m, Number(c.id.slice(1)) || 0), 0) + 1}`;
        const client = {
          sst: '',
          industry: '',
          contact: '',
          email: '',
          address: '',
          ...details,
          name: details.name.trim(),
          tin,
          id,
        };
        run({ type: 'ADD_CLIENT', client });
        return ok({ id });
      },

      /**
       * Creates one or more documents with status Processing and adds them to pooled usage.
       * Accepts a single upload or an array (a batch gets sequential ids in one state update).
       * @param {{ clientId, type: 'sales'|'purchase', fileName, fileSize, sample?: boolean } | Array} input
       * @returns {{ ok, ids, id }} id = first document's id
       */
      uploadDocument: (input) => {
        const s = stateRef.current;
        const items = Array.isArray(input) ? input : [input];
        if (items.length === 0) return fail('Add at least one file.');
        if (s.usage.used + items.length > s.usage.limit) {
          return fail(`Only ${s.usage.limit - s.usage.used} documents left in this billing period.`);
        }

        const uploadedAt = nowLocalISO();
        const firstNumber = Number(nextDocumentId(s.documents).slice(1));
        const docs = [];
        for (const [i, item] of items.entries()) {
          const client = s.clients.find((c) => c.id === (item.clientId || s.activeClientId));
          if (!client) return fail('Choose a client first.');
          if (!DOCUMENT_TYPES[item.type]) return fail('Choose a document type.');
          const sample = item.sample ? SAMPLE_DOCUMENTS[item.type] : null;
          if (sample?.clientId && sample.clientId !== client.id) {
            return fail(`The sample sales invoice was issued by ${getSampleClient(s.clients)?.name}. Upload it for that client.`);
          }
          docs.push(
            buildUploadedDocument({
              id: `d${firstNumber + i}`,
              client,
              type: item.type,
              fileName: item.fileName,
              fileSize: item.fileSize,
              uploadedAt,
              uploadedBy: s.user.displayName,
              sequence: s.documents.length + i,
              sample: Boolean(sample),
            })
          );
        }
        run({ type: 'UPLOAD_DOCUMENTS', docs });
        const ids = docs.map((d) => d.id);
        return ok({ ids, id: ids[0] });
      },

      finishProcessing: (docId) => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        if (doc.status !== 'processing') return ok();
        run({ type: 'FINISH_PROCESSING', docId });
        return ok();
      },

      updateField: (docId, key, value) => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        if (['submitted', 'exported'].includes(doc.status)) return fail('This document is locked after submission or export.');
        if (!doc.fields.some((f) => f.key === key)) return fail('Field not found.');
        run({ type: 'UPDATE_FIELD', docId, key, value });
        return ok();
      },

      clearDuplicate: (docId) => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        if (doc.stage !== 'compliance') return fail('Duplicate review is only available during compliance checks.');
        if (doc.duplicateCleared) return ok();
        run({ type: 'CLEAR_DUPLICATE', docId });
        return ok();
      },

      confirmField: (docId, key) => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        run({ type: 'CONFIRM_FIELD', docId, key });
        return ok();
      },

      saveDraft: (docId) => {
        if (!getDoc(docId)) return fail('Document not found.');
        run({ type: 'SAVE_DRAFT', docId });
        return ok();
      },

      approveDocument: (docId) => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        if (doc.stage !== 'review') return fail('This document is not waiting for review.');
        const pending = getPendingFields(doc).length;
        if (pending > 0) {
          return fail(`${pending} low-confidence ${pending === 1 ? 'field still needs' : 'fields still need'} review.`);
        }
        run({ type: 'APPROVE', docId });
        return ok();
      },

      markReady: (docId) => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        if (doc.stage !== 'compliance') return fail('Approve the extracted data first.');
        const blockers = getBlockers(doc, stateRef.current.documents).length;
        if (blockers > 0) return fail(`${blockers} blocking ${blockers === 1 ? 'issue' : 'issues'} must be fixed first.`);
        run({ type: 'MARK_READY', docId });
        return ok();
      },

      /** format: 'csv' | 'json' (json = MyInvois JSON, sales only) */
      exportDocument: (docId, format = 'csv') => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        if (!['ready', 'submitted', 'exported'].includes(doc.status)) return fail('Mark the document ready before exporting.');
        if (format === 'json' && doc.type !== 'sales') return fail('MyInvois JSON is only for sales e-Invoices.');
        run({ type: 'EXPORT', docId, format });
        return ok();
      },

      submitDocument: (docId) => {
        const doc = getDoc(docId);
        if (!doc) return fail('Document not found.');
        if (doc.type !== 'sales') return fail('Only sales e-Invoices are submitted to MyInvois.');
        if (doc.status === 'submitted') return fail('Already submitted.');
        if (doc.status !== 'ready') return fail('Mark the document ready before submitting.');
        const reference = makeReference();
        run({ type: 'SUBMIT', docId, reference });
        return ok({ reference });
      },

      /** event: { action, message, docId?, clientId?, field?, before?, after?, actor? } */
      addAuditEvent: (event) => {
        run({ type: 'ADD_AUDIT_EVENT', event });
        return ok();
      },

      updateProfile: ({ user, business }) => {
        const name = user?.name?.trim();
        const email = user?.email?.trim();
        const businessName = business?.name?.trim();
        if (!name || !email || !businessName) return fail('Display name, email and workspace name are required.');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail('Enter a valid email address.');
        run({
          type: 'UPDATE_PROFILE',
          user: { name, email },
          business: { name: businessName, brn: business?.brn?.trim() || '' },
        });
        return ok();
      },

      markNotificationsRead: (ids) => {
        run({ type: 'MARK_NOTIFICATIONS_READ', ids });
        return ok();
      },

      resetDemo: () => {
        run({ type: 'RESET' });
        return ok();
      },
    }),
    [run]
  );

  const derived = useMemo(() => {
    const activeClient = state.clients.find((c) => c.id === state.activeClientId) || state.clients[0];
    const clientDocuments = getClientDocuments(state.documents, activeClient.id);
    return {
      activeClient,
      clientDocuments,
      counts: countByStatus(clientDocuments),
      reviewQueue: getReviewQueue(clientDocuments),
      unreadCount: state.notifications.filter((n) => !n.read).length,
    };
  }, [state.clients, state.activeClientId, state.documents, state.notifications]);

  const helpers = useMemo(
    () => ({
      getDocument: (id) => state.documents.find((d) => d.id === id) || null,
      getChecks: (doc) => getComplianceChecks(doc, state.documents),
      getDocumentEvents: (docId) => state.auditEvents.filter((e) => e.docId === docId),
    }),
    [state.documents, state.auditEvents]
  );

  const value = useMemo(
    () => ({
      ...state,
      isLoggedIn: state.auth.loggedIn,
      ...derived,
      ...helpers,
      ...actions,
    }),
    [state, derived, helpers, actions]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

/** Document by id plus its derived checks and events; null when not found. */
export function useDocument(id) {
  const { getDocument, getChecks, getDocumentEvents } = useApp();
  const doc = getDocument(id);
  return useMemo(
    () => (doc ? { doc, checks: getChecks(doc), events: getDocumentEvents(doc.id) } : null),
    [doc, getChecks, getDocumentEvents]
  );
}
