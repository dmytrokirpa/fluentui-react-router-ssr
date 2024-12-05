import { Button, Card, Title1, Body1 } from '@fluentui/react-components';
import { BookmarkRegular } from '@fluentui/react-icons';

export default function Index() {
  return (
    <Card style={{ maxWidth: '400px', margin: '20px' }}>
      <Title1>Fluent UI + Remix</Title1>
      <Body1>Welcome to your new app!</Body1>
      <Button appearance='primary' icon={<BookmarkRegular />}>Click me</Button>
    </Card>
  );
}