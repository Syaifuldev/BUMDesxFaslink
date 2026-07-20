import { useEffect, useState } from 'react'
import { Plus, Trash2, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { operatorsService } from '@/services/operators.service'
import type { Profile } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PageSpinner } from '@/components/ui/Spinner'
import { Card } from '@/components/ui/Card'
import { getInitials, formatDate } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function OperatorsPage() {
  const { user } = useAuth()
  const [operators, setOperators] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // Form State
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdding, setIsAdding] = useState(false)

  const loadOperators = async () => {
    if (!user) return
    try {
      const data = await operatorsService.getOperators(user.id)
      setOperators(data)
    } catch (err) {
      toast.error('Failed to load operators')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOperators()
  }, [user])

  const handleCreateOperator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password || !fullName) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setIsSubmitting(true)
      await operatorsService.createOperator(username, password, fullName)
      toast.success('Operator created successfully!')
      
      // Reset form and reload list
      setUsername('')
      setPassword('')
      setFullName('')
      setIsAdding(false)
      loadOperators()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create operator'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteOperator = async (operatorId: string, operatorName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${operatorName}? They will no longer be able to log in.`)) {
      return
    }

    try {
      await operatorsService.deleteOperator(operatorId)
      toast.success('Operator deleted')
      loadOperators()
    } catch (err) {
      toast.error('Failed to delete operator')
    }
  }

  if (loading) return <PageSpinner />

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Operator Management</h1>
          <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
            Create and manage scanner operator accounts. Operators can only access the QR Scanner page.
          </p>
        </div>
        <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? 'outline' : 'primary'} className="shrink-0">
          {isAdding ? 'Cancel' : <><Plus className="h-4 w-4 mr-2" /> Add Operator</>}
        </Button>
      </div>

      {isAdding && (
        <Card className="p-6 border-primary-200 dark:border-primary-900 bg-primary-50/50 dark:bg-primary-900/10">
          <div className="mb-4 flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <KeyRound className="h-5 w-5" />
            <h3 className="font-semibold text-lg">Create New Operator</h3>
          </div>
          <form onSubmit={handleCreateOperator} className="grid sm:grid-cols-3 gap-4">
            <Input
              label="Full Name"
              placeholder="e.g. John (Pintu Depan)"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            <Input
              label="Username"
              placeholder="operator123"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              required
            />
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <Input
                  label="Password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" loading={isSubmitting} className="mb-[2px]">
                Create
              </Button>
            </div>
          </form>
        </Card>
      )}

      {operators.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 px-4 text-center">
          <div className="h-16 w-16 rounded-full bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-4">
            <ShieldAlert className="h-8 w-8 text-surface-400" />
          </div>
          <h3 className="text-lg font-medium text-surface-900 dark:text-white mb-2">No operators yet</h3>
          <p className="text-surface-500 max-w-sm mx-auto mb-6">
            You haven't created any operator accounts. Operators can help you scan QR codes at different entry points.
          </p>
          <Button onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create First Operator
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {operators.map((operator) => (
            <Card key={operator.id} className="p-5 flex flex-col hover:border-primary-500/30 transition-colors">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                    {getInitials(operator.full_name || 'Op')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-surface-900 dark:text-white leading-tight">
                      {operator.full_name}
                    </h3>
                    <div className="flex items-center gap-1 mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full w-fit">
                      <ShieldCheck className="h-3 w-3" />
                      Operator
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteOperator(operator.id, operator.full_name || 'this operator')}
                  className="text-surface-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Delete operator"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-auto pt-4 border-t border-surface-100 dark:border-surface-800 text-sm text-surface-500 flex justify-between">
                <span>Added:</span>
                <span className="text-surface-900 dark:text-surface-300 font-medium">
                  {formatDate(operator.created_at)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
