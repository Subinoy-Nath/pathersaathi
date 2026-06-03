import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; mode?: string }>
}) {
  const resolvedParams = await searchParams;
  const message = resolvedParams?.message;
  const mode = resolvedParams?.mode;

  return <LoginForm message={message} initialMode={mode} />;
}
