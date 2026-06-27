import GroupEventsRedirectClient from './GroupEventsRedirectClient';

// Required for Next.js static export: must return at least one entry
export function generateStaticParams() {
  return [{ groupId: 'placeholder' }];
}

export default function GroupEventsPage() {
  return <GroupEventsRedirectClient />;
}
