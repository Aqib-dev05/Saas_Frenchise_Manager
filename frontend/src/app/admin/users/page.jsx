'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { userApi } from '@/lib/api'
import { getErrorMessage, formatDate } from '@/lib/utils'
import { RoleBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import ImageUpload from '@/components/ui/ImageUpload'
import { Plus, Edit2, UserX, UserCheck } from 'lucide-react'

function UserForm({ defaultValues, onSubmit, loading, isEdit }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({ defaultValues })
  const avatar = watch('avatar')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Profile Picture</label>
        <ImageUpload
          value={avatar}
          onChange={(url) => setValue('avatar', url)}
          folder="avatars"
          shape="circle"
          size="sm"
        />
        <input type="hidden" {...register('avatar')} />
      </div>
      <div><label className="label">Full Name *</label><input className="input" {...register('name', { required: true })} /></div>
      <div><label className="label">Email *</label><input className="input" type="email" {...register('email', { required: true })} /></div>
      <div><label className="label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
        <input className="input" type="password" placeholder="Min 8 chars" {...register('password', { required: !isEdit, minLength: isEdit ? 0 : 8 })} /></div>
      <div><label className="label">Role *</label>
        <select className="input" {...register('role', { required: true })}>
          <option value="">Select role...</option>
          <option value="ADMIN">Admin</option>
          <option value="SALESMAN">Salesman</option>
          <option value="DELIVERY">Delivery</option>
        </select>
      </div>
      <div><label className="label">Phone</label><input className="input" {...register('phone')} /></div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Save User'}</button>
    </form>
  )
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)

  const { data: users = [], isLoading } = useQuery({ queryKey: ['users'], queryFn: () => userApi.getAll().then(r => r.data) })

  const createM = useMutation({ mutationFn: userApi.create, onSuccess: () => { toast.success('User created!'); qc.invalidateQueries(['users']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const updateM = useMutation({ mutationFn: ({ id, ...d }) => userApi.update(id, d), onSuccess: () => { toast.success('User updated!'); qc.invalidateQueries(['users']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const toggleM = useMutation({ mutationFn: ({ id, isActive }) => userApi.update(id, { isActive }), onSuccess: () => { toast.success('User status updated'); qc.invalidateQueries(['users']) }, onError: e => toast.error(getErrorMessage(e)) })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div><h1 className="text-2xl font-bold text-gray-900">Team</h1><p className="text-gray-500 text-sm">{users.filter(u=>u.isActive).length} active members</p></div>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Add Member</button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map(u => (
            <div key={u.id} className={`card p-5 ${!u.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={u.avatar} name={u.name} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <RoleBadge role={u.role} />
              </div>
              {u.phone && <p className="text-sm text-gray-500 mb-2">📞 <a href={`tel:${u.phone}`} className="text-indigo-600 hover:underline">{u.phone}</a></p>}
              <p className="text-xs text-gray-400 mb-4">Joined {formatDate(u.createdAt)}</p>
              <div className="flex gap-2 border-t border-gray-100 pt-3">
                <button onClick={() => setModal(u)} className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"><Edit2 className="w-3.5 h-3.5" />Edit</button>
                <button onClick={() => toggleM.mutate({ id: u.id, isActive: !u.isActive })}
                  className={`flex-1 text-xs py-1.5 flex items-center justify-center gap-1 rounded-lg font-medium transition-colors ${u.isActive ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {u.isActive ? <><UserX className="w-3.5 h-3.5" />Deactivate</> : <><UserCheck className="w-3.5 h-3.5" />Activate</>}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Team Member' : 'Edit Member'} size="sm">
        <UserForm
          defaultValues={modal && modal !== 'create' ? { name: modal?.name, email: modal?.email, role: modal?.role, phone: modal?.phone, avatar: modal?.avatar } : {}}
          onSubmit={d => modal === 'create' ? createM.mutate(d) : updateM.mutate({ id: modal.id, ...d })}
          loading={createM.isPending || updateM.isPending}
          isEdit={!!modal && modal !== 'create'}
        />
      </Modal>
    </div>
  )
}
