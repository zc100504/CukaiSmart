import Card from './Card.jsx';
import ComingSoon from './ComingSoon.jsx';
import PageHeader from './PageHeader.jsx';

/** Temporary page body for screens built in later phases. */
export default function PagePlaceholder({ title, description, actions, children }) {
  return (
    <div className="page stack-lg">
      <PageHeader title={title} description={description} actions={actions} />
      {children}
      <Card>
        <ComingSoon title="Screen coming in a later phase" message="Navigation, state and sample data for this page are ready." />
      </Card>
    </div>
  );
}
