import { Injectable, NotFoundException } from '@nestjs/common';

import { db } from 'src/main';
import {
  CreateInvestmentProductDto,
  UpdateInvestmentProductDto,
} from './product.dto';
import { InvestmentProduct } from './product.model';

@Injectable()
export class InvestmentProductsService {
  private collection = 'products';

  async create(dto: CreateInvestmentProductDto): Promise<InvestmentProduct> {
    const docRef = db.collection(this.collection).doc();
    const now = new Date();

    const product: InvestmentProduct = {
      id: docRef.id,
      ...dto,
      createdAt: now,
      updatedAt: now,
    };

    await docRef.set(product);
    return product;
  }

  async findAll(): Promise<InvestmentProduct[]> {
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map((doc) => doc.data() as InvestmentProduct);
  }

  async findOne(id: string): Promise<InvestmentProduct> {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists)
      throw new NotFoundException(`Product with id ${id} not found`);
    return doc.data() as InvestmentProduct;
  }

  async update(
    id: string,
    dto: UpdateInvestmentProductDto,
  ): Promise<InvestmentProduct> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Product with id ${id} not found`);

    const updated = {
      ...doc.data(),
      ...dto,
      updatedAt: new Date(),
    } as InvestmentProduct;

    await docRef.update(updated as any);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Product with id ${id} not found`);
    await docRef.delete();
  }
}
