import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8">Política de Privacidade</h1>

      <div className="prose prose-gray max-w-none space-y-6">
        <section>
          <h2 className="text-xl font-semibold mb-3">Dados Coletados</h2>
          <p className="text-muted-fg">
            Coletamos os seguintes dados para o funcionamento da plataforma
            Meu Vizinho:
          </p>
          <ul className="list-disc pl-6 text-muted-fg space-y-1">
            <li>Nome e e-mail para identificação da conta</li>
            <li>
              CEP e comprovante de residência para verificação de endereço
            </li>
            <li>Conteúdo de publicações e mensagens na plataforma</li>
            <li>Dados de uso e navegação para melhoria do serviço</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Como Usamos</h2>
          <p className="text-muted-fg">
            Seus dados são utilizados exclusivamente para:
          </p>
          <ul className="list-disc pl-6 text-muted-fg space-y-1">
            <li>Verificar sua identidade e endereço de residência</li>
            <li>Exibir conteúdo relevante ao seu bairro</li>
            <li>Permitir interações com vizinhos verificados</li>
            <li>Enviar notificações sobre atividades na sua comunidade</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Seus Direitos</h2>
          <p className="text-muted-fg">
            Em conformidade com a Lei Geral de Proteção de Dados (LGPD), você
            tem direito a:
          </p>
          <ul className="list-disc pl-6 text-muted-fg space-y-1">
            <li>Acessar seus dados pessoais armazenados</li>
            <li>Solicitar correção de dados incorretos</li>
            <li>Solicitar exclusão de seus dados</li>
            <li>Revogar consentimento a qualquer momento</li>
            <li>Solicitar portabilidade dos seus dados</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contato</h2>
          <p className="text-muted-fg">
            Para exercer seus direitos ou tirar dúvidas sobre esta política,
            entre em contato pelo e-mail:{" "}
            <span className="font-medium">privacidade@meuvizinho.com.br</span>
          </p>
        </section>
      </div>

      <div className="mt-8">
        <Link href="/" className="text-primary font-semibold hover:underline">
          Voltar para a página inicial
        </Link>
      </div>
    </div>
  );
}
