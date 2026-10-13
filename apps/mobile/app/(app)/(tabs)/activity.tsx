import { Card, Muted, Screen } from '../../../src/components/ui';

export default function ActivityScreen() {
  return (
    <Screen title="Activity">
      <Card>
        <Muted>
          Reviews, notifications and challenge results appear here once content and the review
          loop ship. No activity yet.
        </Muted>
      </Card>
    </Screen>
  );
}
