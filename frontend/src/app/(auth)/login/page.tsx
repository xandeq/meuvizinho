import LoginForm from "@/components/forms/LoginForm";
import AuthLayout from "@/components/layouts/AuthLayout";
import AuthBrandPanel from "@/components/layouts/AuthBrandPanel";

export default function LoginPage() {
  return (
    <AuthLayout
      title="Bem-vindo de volta"
      subtitle="Entre na sua conta para continuar"
      leftPanel={<AuthBrandPanel />}
    >
      <LoginForm />
    </AuthLayout>
  );
}
