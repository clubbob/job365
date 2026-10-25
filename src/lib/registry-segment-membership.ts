import { isItComputingCompany, isItComputingCompanyName } from '@/lib/it-companies/catalog';
import { masterSeedNormalizeKey } from '@/lib/it-companies/master-seed';
import { loadSeedCareersRegistryDbCompanies } from '@/lib/seed-careers/registry-db';
import {
  isSemiDisplayEquipmentCompany,
  isSemiDisplayEquipmentCompanyName,
} from '@/lib/semi-display-equipment/catalog';
import { semiEquipmentSeedNormalizeKey } from '@/lib/semi-display-equipment/master-seed';

export function itSeedRegistryDedupeKeys(): Set<string> {
  const keys = new Set<string>();
  for (const row of loadSeedCareersRegistryDbCompanies('it')) {
    const key = masterSeedNormalizeKey(row.companyName);
    if (key) keys.add(key);
  }
  return keys;
}

export function semiSeedRegistryDedupeKeys(): Set<string> {
  const keys = new Set<string>();
  for (const row of loadSeedCareersRegistryDbCompanies('semi-equipment')) {
    const key = semiEquipmentSeedNormalizeKey(row.companyName);
    if (key) keys.add(key);
  }
  return keys;
}

export function companyNameItSeedRegistryKey(companyName: string): string {
  return masterSeedNormalizeKey(companyName);
}

export function companyNameSemiSeedRegistryKey(companyName: string): string {
  return semiEquipmentSeedNormalizeKey(companyName);
}

export function isCompanyInItSeedRegistry(companyName: string): boolean {
  const key = companyNameItSeedRegistryKey(companyName);
  return key ? itSeedRegistryDedupeKeys().has(key) : false;
}

export function isCompanyInSemiSeedRegistry(companyName: string): boolean {
  const key = companyNameSemiSeedRegistryKey(companyName);
  return key ? semiSeedRegistryDedupeKeys().has(key) : false;
}

/** IT·장비 전용 DB에 속하면 대기업·중견 명단·수집 대상이 아님 */
export function isReservedForItOrSemiSeedRegistry(companyName: string, industry?: string | null): boolean {
  if (isCompanyInItSeedRegistry(companyName) || isCompanyInSemiSeedRegistry(companyName)) {
    return true;
  }
  if (isItComputingCompany(companyName, industry ?? undefined)) return true;
  if (isSemiDisplayEquipmentCompany(companyName, industry ?? undefined)) return true;
  return false;
}

export function isReservedEnterpriseGroupForItOrSemi(groupName: string): boolean {
  if (isCompanyInItSeedRegistry(groupName) || isCompanyInSemiSeedRegistry(groupName)) {
    return true;
  }
  if (isItComputingCompanyName(groupName)) return true;
  if (isSemiDisplayEquipmentCompanyName(groupName)) return true;
  return false;
}
