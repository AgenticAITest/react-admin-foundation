import { eq } from 'drizzle-orm';
import { db } from '../index';
import { productTypes, packageTypes, products } from '../schema/master';
import { tenant } from '../schema/system';

export async function seedMasterData() {
  try {
    console.log('🌱 Seeding master data...');

    // Get the first tenant for seeding
    const tenantRecord = await db.select().from(tenant).limit(1);
    if (tenantRecord.length === 0) {
      console.log('❌ No tenants found. Please run system seed first.');
      return;
    }

    const tenantId = tenantRecord[0].id;

    // Check if master data already exists
    const existingProductTypes = await db.select().from(productTypes).where(eq(productTypes.tenantId, tenantId)).limit(1);
    if (existingProductTypes.length > 0) {
      console.log('✅ Master data already seeded');
      return;
    }

    // Seed product types
    const productTypesData = [
      {
        tenantId,
        name: 'Electronics',
        description: 'Electronic devices and components',
        category: 'Technology',
        isActive: true,
      },
      {
        tenantId,
        name: 'Clothing',
        description: 'Apparel and fashion items',
        category: 'Fashion',
        isActive: true,
      },
      {
        tenantId,
        name: 'Food & Beverages',
        description: 'Consumable food and drink products',
        category: 'Consumables',
        isActive: true,
      },
    ];

    const insertedProductTypes = await db
      .insert(productTypes)
      .values(productTypesData)
      .returning({ id: productTypes.id, name: productTypes.name });

    console.log(`✅ Created ${insertedProductTypes.length} product types`);

    // Seed package types
    const packageTypesData = [
      {
        tenantId,
        name: 'Small Box',
        description: 'Standard small cardboard box',
        unitsPerPackage: 1,
        barcode: 'PKG001',
        dimensions: '20x15x10 cm',
        weight: '0.500',
        isActive: true,
      },
      {
        tenantId,
        name: 'Medium Box',
        description: 'Standard medium cardboard box',
        unitsPerPackage: 1,
        barcode: 'PKG002',
        dimensions: '40x30x20 cm',
        weight: '1.200',
        isActive: true,
      },
      {
        tenantId,
        name: 'Pallet',
        description: 'Wooden pallet for bulk items',
        unitsPerPackage: 24,
        barcode: 'PKG003',
        dimensions: '120x100x15 cm',
        weight: '25.000',
        isActive: true,
      },
    ];

    const insertedPackageTypes = await db
      .insert(packageTypes)
      .values(packageTypesData)
      .returning({ id: packageTypes.id, name: packageTypes.name });

    console.log(`✅ Created ${insertedPackageTypes.length} package types`);

    // Seed products
    const productsData = [
      {
        tenantId,
        inventoryTypeId: insertedProductTypes.find(pt => pt.name === 'Electronics')?.id,
        packageTypeId: insertedPackageTypes.find(pk => pk.name === 'Small Box')?.id,
        sku: 'ELEC001',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless optical mouse',
        minimumStockLevel: 50,
        reorderPoint: 25,
        weight: '0.150',
        dimensions: '12x6x4 cm',
        active: true,
        hasExpiryDate: false,
      },
      {
        tenantId,
        inventoryTypeId: insertedProductTypes.find(pt => pt.name === 'Clothing')?.id,
        packageTypeId: insertedPackageTypes.find(pk => pk.name === 'Medium Box')?.id,
        sku: 'CLOTH001',
        name: 'Cotton T-Shirt',
        description: 'Premium quality cotton t-shirt',
        minimumStockLevel: 100,
        reorderPoint: 50,
        weight: '0.200',
        dimensions: '30x25x2 cm',
        active: true,
        hasExpiryDate: false,
      },
      {
        tenantId,
        inventoryTypeId: insertedProductTypes.find(pt => pt.name === 'Food & Beverages')?.id,
        packageTypeId: insertedPackageTypes.find(pk => pk.name === 'Pallet')?.id,
        sku: 'FOOD001',
        name: 'Premium Coffee Beans',
        description: 'Organic coffee beans from Colombia',
        minimumStockLevel: 20,
        reorderPoint: 10,
        requiredTemperatureMin: '15.00',
        requiredTemperatureMax: '25.00',
        weight: '1.000',
        dimensions: '25x15x8 cm',
        active: true,
        hasExpiryDate: true,
      },
    ];

    const insertedProducts = await db
      .insert(products)
      .values(productsData)
      .returning({ id: products.id, sku: products.sku, name: products.name });

    console.log(`✅ Created ${insertedProducts.length} products`);
    console.log('🎉 Master data seeded successfully!');

  } catch (error) {
    console.error('❌ Error seeding master data:', error);
    throw error;
  }
}