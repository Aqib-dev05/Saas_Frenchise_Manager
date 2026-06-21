const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SaaS Franchise Manager...\n')

  // ── Plans ──
  const starterPlan = await prisma.plan.upsert({
    where: { slug: 'starter' },
    update: {},
    create: {
      name: 'Starter', slug: 'starter',
      priceMonthly: 19, priceYearly: 190,
      maxUsers: 3, maxRoutes: 2, maxProducts: 50, maxShops: 100,
      sortOrder: 1,
      features: JSON.stringify(['2 Salesman Routes', '100 Shops', '50 Products', 'Basic Reports', 'Email Support']),
    },
  })

  const proPlan = await prisma.plan.upsert({
    where: { slug: 'professional' },
    update: {},
    create: {
      name: 'Professional', slug: 'professional',
      priceMonthly: 49, priceYearly: 490,
      maxUsers: 10, maxRoutes: 10, maxProducts: 500, maxShops: 500,
      isPopular: true, sortOrder: 2,
      features: JSON.stringify(['10 Salesman Routes', '500 Shops', '500 Products', 'Advanced Analytics', 'Map View', 'Priority Support', 'Invoice Management']),
    },
  })

  const enterprisePlan = await prisma.plan.upsert({
    where: { slug: 'enterprise' },
    update: {},
    create: {
      name: 'Enterprise', slug: 'enterprise',
      priceMonthly: 99, priceYearly: 990,
      maxUsers: -1, maxRoutes: -1, maxProducts: -1, maxShops: -1,
      sortOrder: 3,
      features: JSON.stringify(['Unlimited Everything', 'Custom Branding', 'API Access', 'Dedicated Support', 'Custom Integrations', 'SLA Guarantee']),
    },
  })
  console.log('✅ Plans created')

  // ── Demo Organization ──
  const demoOrg = await prisma.organization.upsert({
    where: { slug: 'demo-franchise' },
    update: {},
    create: {
      name: 'Demo Franchise Co.', slug: 'demo-franchise',
      email: 'contact@demo-franchise.com', phone: '0300-1234567',
      address: 'Liberty Market, Lahore',
    },
  })

  // Trial subscription for demo org
  const trialEnd = new Date()
  trialEnd.setDate(trialEnd.getDate() + 14)
  await prisma.subscription.upsert({
    where: { organizationId: demoOrg.id },
    update: {},
    create: {
      organizationId: demoOrg.id, planId: proPlan.id,
      status: 'TRIALING', trialEndsAt: trialEnd,
    },
  })
  console.log('✅ Demo organization + trial created')

  // ── Users ──
  const hp = async (p) => bcrypt.hash(p, 10)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo-franchise.com' },
    update: {},
    create: { organizationId: demoOrg.id, name: 'Super Admin', email: 'admin@demo-franchise.com', password: await hp('admin123'), role: 'ADMIN', phone: '0300-1234567' },
  })
  const salesman1 = await prisma.user.upsert({
    where: { email: 'salesman1@demo-franchise.com' },
    update: {},
    create: { organizationId: demoOrg.id, name: 'Ahmed Ali', email: 'salesman1@demo-franchise.com', password: await hp('salesman123'), role: 'SALESMAN', phone: '0301-1234567' },
  })
  const salesman2 = await prisma.user.upsert({
    where: { email: 'salesman2@demo-franchise.com' },
    update: {},
    create: { organizationId: demoOrg.id, name: 'Bilal Khan', email: 'salesman2@demo-franchise.com', password: await hp('salesman123'), role: 'SALESMAN', phone: '0302-1234567' },
  })
  const deliveryUser = await prisma.user.upsert({
    where: { email: 'delivery@demo-franchise.com' },
    update: {},
    create: { organizationId: demoOrg.id, name: 'Usman Raza', email: 'delivery@demo-franchise.com', password: await hp('delivery123'), role: 'DELIVERY', phone: '0303-1234567' },
  })
  console.log('✅ Users created')

  // ── Products ──
  const orgId = demoOrg.id
  const products = [
    { organizationId: orgId, name: 'Coca Cola 250ml', sku: 'COKE-250ML', category: 'Beverages', price: 40, costPrice: 30, stock: 500, minStock: 50, unit: 'bottle' },
    { organizationId: orgId, name: 'Coca Cola 500ml', sku: 'COKE-500ML', category: 'Beverages', price: 75, costPrice: 60, stock: 300, minStock: 30, unit: 'bottle' },
    { organizationId: orgId, name: 'Coca Cola 1.5L',  sku: 'COKE-1.5L',  category: 'Beverages', price: 130, costPrice: 100, stock: 200, minStock: 20, unit: 'bottle' },
    { organizationId: orgId, name: 'Sprite 250ml',    sku: 'SPRITE-250ML', category: 'Beverages', price: 40, costPrice: 30, stock: 400, minStock: 40, unit: 'bottle' },
    { organizationId: orgId, name: 'Fanta 250ml',     sku: 'FANTA-250ML',  category: 'Beverages', price: 40, costPrice: 30, stock: 8,   minStock: 40, unit: 'bottle' },
    { organizationId: orgId, name: 'Lifebuoy Soap 90g', sku: 'SOAP-LIFEBUOY', category: 'Personal Care', price: 85, costPrice: 65, stock: 150, minStock: 20, unit: 'piece' },
    { organizationId: orgId, name: 'Dettol Soap 90g',   sku: 'SOAP-DETTOL',   category: 'Personal Care', price: 95, costPrice: 75, stock: 5,   minStock: 20, unit: 'piece' },
    { organizationId: orgId, name: 'OPC Cement 50kg',   sku: 'CEMENT-OPC',    category: 'Construction',  price: 1200, costPrice: 1000, stock: 100, minStock: 10, unit: 'bag' },
    { organizationId: orgId, name: 'PPC Cement 50kg',   sku: 'CEMENT-PPC',    category: 'Construction',  price: 1150, costPrice: 950, stock: 80, minStock: 10, unit: 'bag' },
    { organizationId: orgId, name: 'Nestle Juice 200ml', sku: 'JUICE-NESTLE', category: 'Beverages', price: 45, costPrice: 35, stock: 250, minStock: 30, unit: 'pack' },
  ]
  for (const p of products) {
    await prisma.product.upsert({ where: { organizationId_sku: { organizationId: orgId, sku: p.sku } }, update: {}, create: p })
  }
  console.log('✅ Products created')

  // ── Shops ──
  const shopData = [
    { id: `${orgId}-shop-001`, organizationId: orgId, name: 'Al-Madina General Store', ownerName: 'Muhammad Naveed', phone: '0311-1111111', address: 'Shop #5, Liberty Market', city: 'Lahore', latitude: 31.5204, longitude: 74.3587, type: 'RETAIL',    balance: 2500,  creditLimit: 10000 },
    { id: `${orgId}-shop-002`, organizationId: orgId, name: 'Karyana House Gulberg',   ownerName: 'Tariq Mehmood',   phone: '0312-2222222', address: 'Main Gulberg Road',   city: 'Lahore', latitude: 31.5161, longitude: 74.3450, type: 'WHOLESALE', balance: 15000, creditLimit: 50000 },
    { id: `${orgId}-shop-003`, organizationId: orgId, name: 'Shah Brothers',           ownerName: 'Irfan Shah',      phone: '0313-3333333', address: 'DHA Phase 5',         city: 'Lahore', latitude: 31.4900, longitude: 74.3720, type: 'CREDIT',    balance: 8000,  creditLimit: 25000 },
    { id: `${orgId}-shop-004`, organizationId: orgId, name: 'City Traders',            ownerName: 'Asif Iqbal',      phone: '0314-4444444', address: 'Johar Town Block D',  city: 'Lahore', latitude: 31.4697, longitude: 74.2929, type: 'CASH',      balance: 0,     creditLimit: 0 },
    { id: `${orgId}-shop-005`, organizationId: orgId, name: 'Hassan General Store',    ownerName: 'Hassan Raza',     phone: '0315-5555555', address: 'Model Town Link Rd',  city: 'Lahore', latitude: 31.4823, longitude: 74.3258, type: 'RETAIL',    balance: 3200,  creditLimit: 10000 },
    { id: `${orgId}-shop-006`, organizationId: orgId, name: 'Al-Barkat Store',         ownerName: 'Khalid Mahmood',  phone: '0316-6666666', address: 'Cavalry Ground',      city: 'Lahore', latitude: 31.5296, longitude: 74.3734, type: 'CREDIT',    balance: 5500,  creditLimit: 20000 },
    { id: `${orgId}-shop-007`, organizationId: orgId, name: 'Rehman Mart',             ownerName: 'Abdul Rehman',    phone: '0317-7777777', address: 'Ferozepur Road',      city: 'Lahore', latitude: 31.5038, longitude: 74.3151, type: 'WHOLESALE', balance: 25000, creditLimit: 100000 },
    { id: `${orgId}-shop-008`, organizationId: orgId, name: 'Bismillah Traders',       ownerName: 'Saeed Ahmed',     phone: '0318-8888888', address: 'Township Sector A',   city: 'Lahore', latitude: 31.4756, longitude: 74.2822, type: 'CASH',      balance: 0,     creditLimit: 0 },
  ]
  for (const s of shopData) {
    await prisma.shop.upsert({ where: { id: s.id }, update: {}, create: s })
  }
  console.log('✅ Shops created')

  // ── Routes ──
  const r1Id = `${orgId}-route-001`, r2Id = `${orgId}-route-002`, r3Id = `${orgId}-route-003`
  await prisma.route.upsert({ where: { id: r1Id }, update: {}, create: { id: r1Id, organizationId: orgId, name: 'Gulberg - Liberty Route', description: 'Central Lahore', daysOfWeek: [1, 3], salesmanId: salesman1.id } })
  await prisma.route.upsert({ where: { id: r2Id }, update: {}, create: { id: r2Id, organizationId: orgId, name: 'DHA - Johar Town Route', description: 'South Lahore', daysOfWeek: [2, 4], salesmanId: salesman1.id } })
  await prisma.route.upsert({ where: { id: r3Id }, update: {}, create: { id: r3Id, organizationId: orgId, name: 'Ferozepur - Township Route', description: 'West Lahore', daysOfWeek: [1, 4], salesmanId: salesman2.id } })

  await prisma.routeShop.deleteMany({ where: { routeId: { in: [r1Id, r2Id, r3Id] } } })
  await prisma.routeShop.createMany({
    data: [
      { routeId: r1Id, shopId: `${orgId}-shop-001`, visitOrder: 1 },
      { routeId: r1Id, shopId: `${orgId}-shop-002`, visitOrder: 2 },
      { routeId: r1Id, shopId: `${orgId}-shop-006`, visitOrder: 3 },
      { routeId: r2Id, shopId: `${orgId}-shop-003`, visitOrder: 1 },
      { routeId: r2Id, shopId: `${orgId}-shop-004`, visitOrder: 2 },
      { routeId: r2Id, shopId: `${orgId}-shop-005`, visitOrder: 3 },
      { routeId: r3Id, shopId: `${orgId}-shop-007`, visitOrder: 1 },
      { routeId: r3Id, shopId: `${orgId}-shop-008`, visitOrder: 2 },
    ],
    skipDuplicates: true,
  })
  console.log('✅ Routes + shops assigned')

  console.log('\n🎉 Seeding complete!')
  console.log('\n📋 Demo Credentials:')
  console.log('  Admin:    admin@demo-franchise.com    / admin123')
  console.log('  Salesman: salesman1@demo-franchise.com / salesman123')
  console.log('  Salesman: salesman2@demo-franchise.com / salesman123')
  console.log('  Delivery: delivery@demo-franchise.com  / delivery123')
  console.log('\n📦 Plans: Starter $19/mo | Professional $49/mo | Enterprise $99/mo')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
