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
              <span
                className="text-transparent bg-clip-text animate-gradient-text"
                style={{
                  backgroundImage: "linear-gradient(135deg, #93c5fd 0%, #60a5fa 50%, #bfdbfe 100%)",
                }}
              >
                sem estranhos.
              </span>
            </>
          }
          subhead="Verificamos CEP e comprovante de residência de cada vizinho — sua identidade protege toda a comunidade."
        />
      }
    >
      <RegisterForm />
    </AuthLayout>
  );
}
