import { PrismaClient, RoleName } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')

  // Create roles
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: RoleName.LEARNER },
      update: {},
      create: {
        name: RoleName.LEARNER,
        description: 'Standard employee learner role',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.MANAGER },
      update: {},
      create: {
        name: RoleName.MANAGER,
        description: 'Department manager role',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.ADMIN },
      update: {},
      create: {
        name: RoleName.ADMIN,
        description: 'System administrator role',
      },
    }),
    prisma.role.upsert({
      where: { name: RoleName.SUPER_ADMIN },
      update: {},
      create: {
        name: RoleName.SUPER_ADMIN,
        description: 'Super administrator with full system access',
      },
    }),
  ])

  console.log('Roles created:', roles.map(r => r.name))

  // Create initial SUPER_ADMIN user
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@thepoolshop.africa'
  const adminName = process.env.SEED_ADMIN_NAME || 'Super Admin'

  const superAdminRole = roles.find(r => r.name === RoleName.SUPER_ADMIN)!

  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
    include: { roles: true },
  })

  if (existingAdmin) {
    // Check if user already has SUPER_ADMIN role
    const hasSuperAdmin = existingAdmin.roles.some(r => r.roleId === superAdminRole.id)
    if (!hasSuperAdmin) {
      await prisma.userRole.create({
        data: {
          userId: existingAdmin.id,
          roleId: superAdminRole.id,
        },
      })
      console.log(`Added SUPER_ADMIN role to existing user: ${adminEmail}`)
    } else {
      console.log(`User ${adminEmail} already has SUPER_ADMIN role`)
    }
  } else {
    const admin = await prisma.user.create({
      data: {
        name: adminName,
        email: adminEmail,
        status: 'active',
        roles: {
          create: {
            roleId: superAdminRole.id,
          },
        },
      },
    })

    console.log(`Created SUPER_ADMIN user: ${adminEmail}`)
  }

  console.log('Seed completed successfully!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

