export type TalentProposalStatus = 'none' | 'pending' | 'accepted';

const STORAGE_KEY = 'job365.talentProposals';

type ProposalStore = Record<string, Record<string, Exclude<TalentProposalStatus, 'none'>>>;

function readStore(): ProposalStore {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProposalStore;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: ProposalStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getTalentProposalStatus(recruiterId: string, talentId: string): TalentProposalStatus {
  return readStore()[recruiterId]?.[talentId] ?? 'none';
}

export function saveTalentProposal(
  recruiterId: string,
  talentId: string,
  status: Exclude<TalentProposalStatus, 'none'>,
): void {
  const store = readStore();
  store[recruiterId] = { ...store[recruiterId], [talentId]: status };
  writeStore(store);
}
