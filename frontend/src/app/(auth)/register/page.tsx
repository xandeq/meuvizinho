import RegisterForm from "@/components/forms/RegisterForm";
import AuthLayout from "@/components/layouts/AuthLayout";
import AuthBrandPanel from "@/components/layouts/AuthBrandPanel";

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Junte-se aos vizinhos verificados"
      leftPanel={
        <AuthBrandPanel
          headline={
            <>
              Seu bairro,<br />
              <span className="text-[#93C5FD]">
                sem estranhos.
              </span>
            </>
          }
          subhead="Verificamos CEP e comprovante de residência de cada vizinho. Isso protege toda a comunidade."
        />
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
