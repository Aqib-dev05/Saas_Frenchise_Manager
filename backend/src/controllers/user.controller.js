const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')
const { deleteByUrl } = require('../lib/cloudinary')
const ORG = (req) => req.user.organizationId

const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({ where: { organizationId: ORG(req) }, select: { id:true, name:true, email:true, role:true, phone:true, avatar:true, isActive:true, createdAt:true }, orderBy: { createdAt: 'desc' } })
    res.json(users)
  } catch (err) { next(err) }
}

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, avatar } = req.body
    if (!name || !email || !password || !role) return res.status(400).json({ message: 'Name, email, password and role required' })
    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (exists) return res.status(400).json({ message: 'Email already registered' })
    const user = await prisma.user.create({
      data: { organizationId: ORG(req), name, email: email.toLowerCase(), password: await bcrypt.hash(password, 10), role, phone: phone||null, avatar: avatar||null },
      select: { id:true, name:true, email:true, role:true, phone:true, avatar:true, isActive:true, createdAt:true },
    })
    res.status(201).json(user)
  } catch (err) { next(err) }
}

const updateUser = async (req, res, next) => {
  try {
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!existing) return res.status(404).json({ message: 'User not found' })

    const { name, email, password, role, phone, isActive, avatar } = req.body
    const data = {}
    if (name) data.name = name
    if (email) data.email = email.toLowerCase()
    if (role) data.role = role
    if (phone !== undefined) data.phone = phone
    if (isActive !== undefined) data.isActive = isActive
    if (password) data.password = await bcrypt.hash(password, 10)

    // Avatar replaced/removed — clean up the old Cloudinary asset
    if (avatar !== undefined && existing.avatar && existing.avatar !== avatar) {
      await deleteByUrl(existing.avatar)
    }
    if (avatar !== undefined) data.avatar = avatar || null

    await prisma.user.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data })
    res.json(await prisma.user.findUnique({ where: { id: req.params.id }, select: { id:true, name:true, email:true, role:true, phone:true, avatar:true, isActive:true } }))
  } catch (err) { next(err) }
}

const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user.userId) return res.status(400).json({ message: 'Cannot deactivate your own account' })
    const existing = await prisma.user.findFirst({ where: { id: req.params.id, organizationId: ORG(req) } })
    if (!existing) return res.status(404).json({ message: 'User not found' })

    if (existing.avatar) await deleteByUrl(existing.avatar)

    await prisma.user.updateMany({ where: { id: req.params.id, organizationId: ORG(req) }, data: { isActive: false, avatar: null } })
    res.json({ message: 'User deactivated' })
  } catch (err) { next(err) }
}

module.exports = { getUsers, createUser, updateUser, deleteUser }
