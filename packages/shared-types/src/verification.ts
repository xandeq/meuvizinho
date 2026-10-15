import type { CepAddress, ProofStatus } from './onboarding';

export interface CepLookupResult extends CepAddress {
  bairroId: number | null;
  bairroNome: string | null;
}

export interface VerificationStatusDto {
  status: ProofStatus;
  submittedAt: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  bairroNome: string | null;
}

export interface AdminVerificationListItem {
  id: number;
  userId: string;
  userEmail: string;
  cep: string;
  logradouro: string;
  bairroNome: string | null;
  proofUrl: string;
  submittedAt: string;
  isSuspectedDuplicate: boolean;
}

export interface ProfileDto {
  displayName: string | null;
  photoUrl: string | null;
  bio: string | null;
  bairroNome: string | null;
  bairroId?: number | null;
  isVerified: boolean;
  isBusinessAccount: boolean;
  businessName: string | null;
  businessCategory: string | null;
  businessDescription: string | null;
  businessPhone: string | null;
  businessWebsite: string | null;
}

export interface UpdateProfileRequest {
  displayName: string;
  bio: string;
  isBusinessAccount: boolean;
  businessName?: string;
  businessCategory?: string;
  businessDescription?: string;
  businessPhone?: string;
  businessWebsite?: string;
}
