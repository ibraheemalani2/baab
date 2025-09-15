import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in development only)
  if (process.env.NODE_ENV !== 'production') {
    console.log('🧹 Clearing existing data...');
    await prisma.notification.deleteMany();
    await prisma.investmentRequest.deleteMany();
    await prisma.business.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.activityLog.deleteMany(); // Clear activity logs
    await prisma.userSettings.deleteMany(); // Clear user settings first
    await prisma.user.deleteMany();
  }

  // Create ADMIN user
  const ADMINPassword = await bcrypt.hash('ADMIN123', 12);
  const ADMINUser = await prisma.user.create({
    data: {
      id: 'ADMIN-001', // Fixed ID for ADMIN user
      email: 'ADMIN@baab.iq',
      phone: '+964 770 123 4567', // Add phone number
      name: 'مدير النظام',
      password: ADMINPassword,
      role: 'ADMIN',
      emailVerified: true,
      phoneVerified: true,
      city: 'بغداد',
      businessType: 'إدارة',
    },
  });

  // Create default UserSettings for ADMIN user
  await prisma.userSettings.create({
    data: {
      userId: ADMINUser.id,
      language: 'ar',
      theme: 'system',
      currency: 'USD',
    },
  });

  // Create sample users
  const user1Password = await bcrypt.hash('user123', 12);
  const user1 = await prisma.user.create({
    data: {
      email: 'ahmed.mohammed@example.com',
      phone: '+964 771 123 4567',
      name: 'أحمد محمد الكرخي',
      password: user1Password,
      role: 'PROJECT_OWNER',
      emailVerified: true,
      phoneVerified: true,
      city: 'بغداد',
      businessType: 'تجارة إلكترونية',
    },
  });

  const user2Password = await bcrypt.hash('user123', 12);
  const user2 = await prisma.user.create({
    data: {
      email: 'sara.ahmed@example.com',
      phone: '+964 771 234 5678',
      name: 'سارة أحمد',
      password: user2Password,
      role: 'PROJECT_OWNER',
      emailVerified: true,
      phoneVerified: false,
      city: 'البصرة',
      businessType: 'مطاعم وأغذية',
    },
  });

  const user3Password = await bcrypt.hash('user123', 12);
  const user3 = await prisma.user.create({
    data: {
      email: 'mohammed.abdullah@example.com',
      phone: '+964 772 345 6789',
      name: 'محمد عبدالله',
      password: user3Password,
      role: 'PROJECT_OWNER',
      emailVerified: false,
      phoneVerified: true,
      city: 'أربيل',
      businessType: 'خدمات تقنية',
    },
  });

  // Create sample investor user
  const investor1Password = await bcrypt.hash('investor123', 12);
  const investor1 = await prisma.user.create({
    data: {
      email: 'khalid.investor@example.com',
      phone: '+964 773 456 7890',
      name: 'خالد المستثمر',
      password: investor1Password,
      role: 'INVESTOR',
      emailVerified: true,
      phoneVerified: true,
      city: 'بغداد',
      businessType: null,
    },
  });

  // Create default UserSettings for sample users
  await prisma.userSettings.create({
    data: {
      userId: user1.id,
      language: 'ar',
      theme: 'system',
      currency: 'USD',
    },
  });

  await prisma.userSettings.create({
    data: {
      userId: user2.id,
      language: 'ar',
      theme: 'system',
      currency: 'USD',
    },
  });

  await prisma.userSettings.create({
    data: {
      userId: user3.id,
      language: 'ar',
      theme: 'system',
      currency: 'USD',
    },
  });

  await prisma.userSettings.create({
    data: {
      userId: investor1.id,
      language: 'ar',
      theme: 'system',
      currency: 'USD',
    },
  });

  console.log('✅ Created users and user settings');

  // Create sample businesses
  const business1 = await prisma.business.create({
    data: {
      title: 'مطعم الكرادة التراثي',
      description: 'مطعم تراثي عراقي متخصص في الأكلات الشعبية',
      price: 5000000, // $50,000 in cents
      currency: 'USD',
      city: 'بغداد',
      category: 'مطاعم ومقاهي',
      location: 'الكرادة، بغداد',
      established: 2018,
      employees: 12,
      monthlyRevenue: 1500000, // $15,000 in cents
      tags: ['تراثي', 'أكلات شعبية', 'عائلي'],
      images: [],
      status: 'APPROVED',
      ownerId: user1.id,
    },
  });

  const business2 = await prisma.business.create({
    data: {
      title: 'صيدلية النور الطبية',
      description: 'صيدلية حديثة مع خدمات طبية متكاملة',
      price: 7500000, // $75,000 in cents
      currency: 'USD',
      city: 'البصرة',
      category: 'الخدمات الطبية',
      location: 'الزبير، البصرة',
      established: 2020,
      employees: 8,
      monthlyRevenue: 2200000, // $22,000 in cents
      tags: ['صيدلية', 'خدمات طبية', 'أدوية'],
      images: [],
      status: 'APPROVED',
      ownerId: user2.id,
    },
  });

  // Create high-value IQD businesses
  const business3 = await prisma.business.create({
    data: {
      title: 'مجمع التسوق التجاري الكبير',
      description: 'مشروع مجمع تسوق ضخم في قلب بغداد مع أكثر من 200 محل تجاري',
      price: 15000000000, // 150,000,000 IQD (150 million IQD)
      currency: 'IQD',
      city: 'بغداد',
      category: 'عقارات تجارية',
      location: 'المنصور، بغداد',
      established: 2022,
      employees: 45,
      monthlyRevenue: 800000000, // 8,000,000 IQD monthly
      tags: ['مجمع تجاري', 'استثمار عقاري', 'تجزئة'],
      images: [],
      status: 'APPROVED',
      ownerId: user1.id,
    },
  });

  const business4 = await prisma.business.create({
    data: {
      title: 'مصنع الألبان والأجبان الحديث',
      description: 'مصنع حديث لإنتاج الألبان والأجبان بتقنيات أوروبية متطورة',
      price: 8500000000, // 85,000,000 IQD (85 million IQD)
      currency: 'IQD',
      city: 'أربيل',
      category: 'صناعة غذائية',
      location: 'المنطقة الصناعية، أربيل',
      established: 2021,
      employees: 65,
      monthlyRevenue: 450000000, // 4,500,000 IQD monthly
      tags: ['ألبان', 'صناعة', 'تصدير'],
      images: [],
      status: 'APPROVED',
      ownerId: user2.id,
    },
  });

  // Create sample investment requests
  const investmentRequest1 = await prisma.investmentRequest.create({
    data: {
      businessId: business1.id,
      investorId: investor1.id,
      businessOwnerId: user1.id,
      requestedAmount: 2500000, // $25,000 in cents
      offeredAmount: 2000000, // $20,000 in cents
      currency: 'USD',
      message:
        'أنا مهتم بالاستثمار في هذا المطعم. لدي خبرة في قطاع المطاعم وأود مناقشة التفاصيل.',
      investorType: 'INDIVIDUAL',
      previousInvestments: 3,
      status: 'PENDING',
    },
  });

  const investmentRequest2 = await prisma.investmentRequest.create({
    data: {
      businessId: business2.id,
      investorId: investor1.id,
      businessOwnerId: user2.id,
      requestedAmount: 1800000, // $18,000 in cents
      offeredAmount: 1500000, // $15,000 in cents
      currency: 'USD',
      message:
        'أرى فرصة استثمارية جيدة في هذه الصيدلية. أتطلع لمناقشة شروط الشراكة.',
      investorType: 'INDIVIDUAL',
      previousInvestments: 5,
      status: 'APPROVED',
    },
  });

  // Add large IQD investment requests
  const investmentRequest3 = await prisma.investmentRequest.create({
    data: {
      businessId: business3.id,
      investorId: investor1.id,
      businessOwnerId: user1.id,
      requestedAmount: 5000000000, // 50,000,000 IQD (50 million IQD)
      offeredAmount: 4500000000, // 45,000,000 IQD
      currency: 'IQD',
      message:
        'أرغب في الاستثمار في مشروع المجمع التجاري. لدي خبرة واسعة في قطاع العقارات التجارية.',
      investorType: 'INDIVIDUAL',
      previousInvestments: 8,
      status: 'APPROVED',
    },
  });

  const investmentRequest4 = await prisma.investmentRequest.create({
    data: {
      businessId: business4.id,
      investorId: investor1.id,
      businessOwnerId: user2.id,
      requestedAmount: 3000000000, // 30,000,000 IQD (30 million IQD)
      offeredAmount: 2800000000, // 28,000,000 IQD
      currency: 'IQD',
      message:
        'مصنع الألبان يمثل فرصة ممتازة للاستثمار في القطاع الصناعي. أتطلع لشراكة طويلة الأمد.',
      investorType: 'INDIVIDUAL',
      previousInvestments: 12,
      status: 'PENDING',
    },
  });

  // Add additional investor with more investment requests
  const investor2Password = await bcrypt.hash('password123', 12);
  const investor2 = await prisma.user.create({
    data: {
      email: 'sara.investor@example.com',
      phone: '+964 791 234 5678',
      name: 'سارة المستثمرة',
      password: investor2Password,
      role: 'INVESTOR',
      emailVerified: true,
      phoneVerified: true,
      city: 'أربيل',
      businessType: 'استثمار',
    },
  });

  // Additional investment request to show partial funding
  const investmentRequest5 = await prisma.investmentRequest.create({
    data: {
      businessId: business3.id,
      investorId: investor2.id,
      businessOwnerId: user1.id,
      requestedAmount: 3000000000, // 30,000,000 IQD
      offeredAmount: 2500000000, // 25,000,000 IQD
      currency: 'IQD',
      message: 'أود المشاركة في استثمار المجمع التجاري. هذا مشروع واعد جداً.',
      investorType: 'INDIVIDUAL',
      previousInvestments: 6,
      status: 'APPROVED',
    },
  });

  console.log('✅ Created investment requests and additional investors');

  // Create sample notifications
  await prisma.notification.create({
    data: {
      userId: user1.id,
      type: 'INVESTMENT_REQUEST',
      title: 'طلب استثمار جديد',
      message:
        'تلقيت طلب استثمار بقيمة $20,000 لمطعم الكرادة التراثي من المستثمر خالد المستثمر',
      read: false,
      priority: 'HIGH',
      actionUrl: '/investment-requests',
      businessId: business1.id,
      investmentRequestId: investmentRequest1.id,
      metadata: {
        businessTitle: 'مطعم الكرادة التراثي',
        investorName: 'خالد المستثمر',
        amount: 20000,
        currency: 'USD',
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: user2.id,
      type: 'BUSINESS_APPROVED',
      title: 'تمت الموافقة على إعلان العمل',
      message:
        'تم الموافقة على إعلان "صيدلية النور الطبية" وأصبح مرئياً للمستثمرين',
      read: true,
      priority: 'MEDIUM',
      actionUrl: `/business/${business2.id}`,
      businessId: business2.id,
      metadata: {
        businessTitle: 'صيدلية النور الطبية',
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: user3.id,
      type: 'PROFILE_VERIFICATION',
      title: 'تم توثيق الحساب',
      message: 'تم توثيق حسابك بنجاح. يمكنك الآن الوصول إلى جميع ميزات المنصة',
      read: true,
      priority: 'MEDIUM',
      actionUrl: '/profile',
      metadata: {},
    },
  });

  console.log('✅ Created notifications');

  console.log('🎉 Database seed completed successfully!');
  console.log('📊 Summary:');
  console.log(`   - Users: ${await prisma.user.count()}`);
  console.log(`   - Businesses: ${await prisma.business.count()}`);
  console.log(
    `   - Investment Requests: ${await prisma.investmentRequest.count()}`,
  );
  console.log(`   - Notifications: ${await prisma.notification.count()}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
