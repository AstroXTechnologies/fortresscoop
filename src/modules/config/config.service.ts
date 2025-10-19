import { Injectable } from '@nestjs/common';
import { db } from 'src/main';

export type AllowedTypesRecord = {
  allowedSavingTypes: string[];
  allowedInvestmentProductIds: string[];
  updatedAt?: Date;
};

@Injectable()
export class ConfigService {
  private collection = 'app_config';
  private docId = 'allowed_types';

  private getRef() {
    return db.collection(this.collection).doc(this.docId);
  }

  async getAllowedTypes(): Promise<AllowedTypesRecord> {
    const doc = await this.getRef().get();
    if (!doc.exists) {
      // return sensible defaults if not present
      return {
        allowedSavingTypes: ['FLEXIBLE', 'FIXED', 'TARGET'],
        allowedInvestmentProductIds: [],
      };
    }
    const data = doc.data() as AllowedTypesRecord | undefined;
    return {
      allowedSavingTypes: data?.allowedSavingTypes ?? [
        'FLEXIBLE',
        'FIXED',
        'TARGET',
      ],
      allowedInvestmentProductIds: data?.allowedInvestmentProductIds ?? [],
      updatedAt: data?.updatedAt,
    };
  }

  async updateAllowedTypes(
    payload: AllowedTypesRecord,
  ): Promise<AllowedTypesRecord> {
    const now = new Date();
    // Validate investment product ids exist in products collection
    const validProductIds: string[] = [];
    if (Array.isArray(payload.allowedInvestmentProductIds)) {
      const checks = payload.allowedInvestmentProductIds.map(async (id) => {
        try {
          const doc = await db.collection('products').doc(id).get();
          if (doc.exists) return id;
        } catch {
          // ignore individual errors and treat as non-existent
        }
        return null;
      });
      const results = await Promise.all(checks);
      for (const r of results) if (r) validProductIds.push(r);
    }

    const updated = {
      allowedSavingTypes: Array.isArray(payload.allowedSavingTypes)
        ? payload.allowedSavingTypes
        : [],
      allowedInvestmentProductIds: validProductIds,
      updatedAt: now,
    } as AllowedTypesRecord & { updatedAt: Date };

    await this.getRef().set(updated, { merge: true });
    return updated;
  }
}
