import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { verificationApi } from '../lib/api';
import { refreshUserFromProfile } from '../lib/refreshUser';
import { EmptyState } from './EmptyState';
import { useTheme } from '../theme/ThemeContext';

type Status = 'none' | 'pending' | 'approved' | 'rejected' | string;

/**
 * Estado de "ainda não verificado" das abas. Antes, 7 telas mostravam só "Complete sua
 * verificação", sem botão e sem dizer que o documento já estava em análise: beco sem saída
 * para quem acabou de se cadastrar.
 */
export function VerificationGate({ what = 'o conteúdo do seu bairro' }: { what?: string }) {
  const router = useRouter();
  const { colors } = useTheme();
  const [status, setStatus] = useState<Status | null>(null);
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    verificationApi
      .getMyStatus()
      .then((s) => {
        if (!alive) return;
        setReason(s.rejectionReason);
        // Aprovado, mas a sessão no aparelho ainda é a antiga: atualiza e a tela se refaz sozinha.
        if (s.status === 'approved') {
          setStatus('approved');
          // Se der certo, a tela-mãe passa a ter o bairro e este bloqueio some sozinho.
          refreshUserFromProfile()
            .then((ok) => { if (alive && !ok) setStatus('approved-stale'); })
            .catch(() => { if (alive) setStatus('approved-stale'); });
        } else {
          setStatus(s.status);
        }
      })
      .catch(() => { if (alive) setStatus('none'); });
    return () => { alive = false; };
  }, []);

  if (status === null || status === 'approved') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (status === 'approved-stale') {
    return (
      <EmptyState
        icon="checkmark-circle-outline"
        title="Endereço aprovado"
        subtitle="Não conseguimos atualizar agora. Tente de novo em instantes."
        actionLabel="Atualizar"
        actionIcon="refresh"
        onAction={() => {
          setStatus('approved');
          refreshUserFromProfile()
            .then((ok) => { if (!ok) setStatus('approved-stale'); })
            .catch(() => setStatus('approved-stale'));
        }}
      />
    );
  }

  if (status === 'pending') {
    return (
      <EmptyState
        icon="hourglass-outline"
        title="Documento em análise"
        subtitle={`Você vê ${what} assim que o comprovante for aprovado.`}
        actionLabel="Ver andamento"
        actionIcon="time-outline"
        onAction={() => router.push('/pending')}
      />
    );
  }

  if (status === 'rejected') {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="Comprovante não aprovado"
        subtitle={reason ?? 'Envie outro comprovante de residência para continuar.'}
        actionLabel="Enviar outro comprovante"
        actionIcon="cloud-upload-outline"
        onAction={() => router.push('/proof-upload')}
      />
    );
  }

  return (
    <EmptyState
      icon="shield-checkmark-outline"
      title="Confirme seu endereço"
      subtitle={`Leva 2 minutos: CEP e uma foto de comprovante. Depois você vê ${what}.`}
      actionLabel="Começar verificação"
      actionIcon="arrow-forward"
      onAction={() => router.push('/cep-lookup')}
    />
  );
}
