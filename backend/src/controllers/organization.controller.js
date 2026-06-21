const prisma = require('../lib/prisma')

const getOrganization = async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
      include: {
        subscription: { include: { plan: true } },
        _count: { select: { users: true, shops: true, products: true, routes: true } },
      },
    })
    if (!org) return res.status(404).json({ message: 'Organization not found' })
    res.json(org)
  } catch (err) { next(err) }
}

const updateOrganization = async (req, res, next) => {
  try {
    const { name, phone, address, logo } = req.body
    const data = {}
    if (name) data.name = name
    if (phone !== undefined) data.phone = phone
    if (address !== undefined) data.address = address
    if (logo !== undefined) data.logo = logo

    const org = await prisma.organization.update({
      where: { id: req.user.organizationId },
      data,
      include: { subscription: { include: { plan: true } } },
    })
    res.json(org)
  } catch (err) { next(err) }
}

module.exports = { getOrganization, updateOrganization }
