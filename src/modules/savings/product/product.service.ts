import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from 'src/main';
import { CreateSavingProductDto, UpdateSavingProductDto } from './product.dto';
import { SavingProduct } from './product.model';

@Injectable()
export class SavingProductsService {
  private collection = 'savingProducts';

  async create(dto: CreateSavingProductDto): Promise<SavingProduct> {
    const docRef = db.collection(this.collection).doc();
    const now = new Date();
    const product: SavingProduct = {
      id: docRef.id,
      ...dto,
      createdAt: now,
      updatedAt: now,
    };
    await docRef.set(product);
    return product;
  }

  async findAll(): Promise<SavingProduct[]> {
    const snapshot = await db.collection(this.collection).get();
    return snapshot.docs.map((doc) => doc.data() as SavingProduct);
  }

  async findOne(id: string): Promise<SavingProduct> {
    const doc = await db.collection(this.collection).doc(id).get();
    if (!doc.exists)
      throw new NotFoundException(`Saving product ${id} not found`);
    return doc.data() as SavingProduct;
  }

  async update(
    id: string,
    dto: UpdateSavingProductDto,
  ): Promise<SavingProduct> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Saving product ${id} not found`);
    const updated: SavingProduct = {
      ...(doc.data() as SavingProduct),
      ...dto,
      updatedAt: new Date(),
    };
    await docRef.update(updated as unknown as Record<string, unknown>);
    return updated;
  }

  async remove(id: string): Promise<void> {
    const docRef = db.collection(this.collection).doc(id);
    const doc = await docRef.get();
    if (!doc.exists)
      throw new NotFoundException(`Saving product ${id} not found`);
    await docRef.delete();
  }
}
