import { CalendarClock, Phone, RefreshCw, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { EmptyState, ErrorState, LoadingState } from '../components/PageState'
import { Dialog } from '../components/Dialog'
import { api, getApiErrorMessage, sessionStore } from '../services/api'

const statusLabels = {
  assigned: '待选择时间',
  appointment_requested: '待确认预约',
  scheduled: '已预约',
  active: '进行中',
  completed: '已结案',
  cancelled: '已取消',
}

const timeLabel = (item) => {
  if (item.status === 'cancelled') return '预约已取消'
  if (!item.scheduledAt) return item.status === 'completed' ? '无预约记录' : '尚未预约'
  return (item.status === 'appointment_requested' ? '意向 · ' : '') +
    new Date(item.scheduledAt).toLocaleString('zh-CN', { hour12: false })
}

export default function CasesPage() {
  const [cases, setCases] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(null)
  const [confirmation, setConfirmation] = useState(null)
  const [confirmationError, setConfirmationError] = useState('')
  const serial = useRef(0)
  const psychologist = sessionStore.getUser()?.role === 'psychologist'
  const load = useCallback(async () => {
    const token = ++serial.current
    try {
      const response = await api.get('/consultations')
      if (token === serial.current) { setCases(response.data); setError('') }
    } catch (requestError) {
      if (token === serial.current) setError(getApiErrorMessage(requestError, '个案列表加载失败'))
    }
  }, [])

  useEffect(() => {
    void load()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void load() }, 15000)
    return () => { clearInterval(timer); serial.current++ }
  }, [load])

  const actions = {
    confirm: { title: '确认预约', description: '确认后，学生端会同步显示已预约。', label: '确认预约' },
    reschedule: { title: '调整预约时间', description: '当前时段将释放，学生可以重新选择时间。', label: '请学生改期' },
    complete: { title: '完成本次咨询', description: '确认服务完成后，将该个案标记为已结案。', label: '确认完成' },
  }
  const openAction = (item, action) => {
    setConfirmationError('')
    setConfirmation({ item, action })
  }
  const act = async () => {
    if (busy || !confirmation) return
    const { item, action } = confirmation
    setConfirmationError('')
    setBusy(item.id)
    setNotice('')
    try {
      await api.patch('/consultations/' + encodeURIComponent(item.id) + '/appointment', { action })
      setNotice(action === 'confirm' ? '已确认预约，学生端可以查看。' : action === 'reschedule' ? '已通知学生重新选择时间（学生端状态已更新）。' : '已标记结案。')
      setConfirmation(null)
      await load()
    } catch (requestError) {
      setConfirmationError(getApiErrorMessage(requestError, '处理失败，请稍后重试。'))
      await load()
    } finally { setBusy(null) }
  }

  if (error && !cases) return <ErrorState message={error} onRetry={load} />
  if (!cases) return <LoadingState text="正在读取授权个案..." />
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
        <div><h2 className="font-semibold">我的个案</h2>
          <p className="mt-1 text-xs text-slate-500">学生提交预约意向后，由负责咨询师确认；自动刷新，也可手动刷新。</p>
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 rounded-full border border-emerald-800/20 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
          <RefreshCw size={15} /> 刷新预约
        </button>
      </div>
      {(error || notice) && <p role="status" className="border-b border-slate-100 px-5 py-3 text-sm text-slate-700">{error || notice}</p>}
      {!cases.length ? <EmptyState title="暂无分配个案" description="收到学生主动预约或辅导员转介后，符合权限的个案会显示在这里。" /> :
      <div className="divide-y divide-slate-100">
        {cases.map((item) => (
          <article key={item.id} className="grid gap-4 px-5 py-5 hover:bg-slate-50 md:grid-cols-[minmax(170px,1fr)_minmax(180px,1fr)_minmax(120px,auto)] md:items-center">
            <div>
              <h3 className="font-semibold">{item.student}</h3>
              <a href={'tel:' + item.phone} className="mt-1 inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"><Phone size={15} />{item.phone}</a>
              <p className="mt-1 text-xs text-slate-500">{item.referred ? '辅导员转介' : '学生自主预约'}</p>
            </div>
            <div className="min-w-0 text-sm text-slate-600">
              <div className="flex flex-wrap items-center gap-2"><CalendarClock size={16} className="shrink-0 text-emerald-700" />{timeLabel(item)}</div>
              {psychologist && ['appointment_requested','scheduled'].includes(item.status) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.status === 'appointment_requested' && <button disabled={!!busy} onClick={() => openAction(item,'confirm')} className="rounded-full bg-emerald-800 px-4 py-2 font-medium text-white hover:bg-emerald-900 disabled:opacity-50">确认预约</button>}
                  <button disabled={!!busy} onClick={() => openAction(item,'reschedule')} className="rounded-full border border-slate-200 px-4 py-2 text-slate-700 hover:bg-slate-100 disabled:opacity-50">请学生改期</button>
                </div>
              )}
              {psychologist && !item.referred && ['scheduled','active'].includes(item.status) && <button disabled={!!busy} onClick={() => openAction(item,'complete')} className="mt-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50">完成咨询</button>}
            </div>
            <div className="flex items-center gap-2">
              {item.consentGranted ? <ShieldCheck className="text-emerald-600" size={18} /> : <ShieldQuestion className="text-amber-600" size={18} />}
              <span className={'rounded-full px-3 py-1.5 text-sm ' + (item.status === 'appointment_requested' ? 'bg-amber-50 text-amber-900' : 'bg-slate-100 text-slate-700')}>{statusLabels[item.status] || item.status}</span>
            </div>
          </article>
        ))}
      </div>}
      <Dialog
        open={!!confirmation}
        title={confirmation ? actions[confirmation.action].title : '预约确认'}
        description={confirmation ? actions[confirmation.action].description : ''}
        width="max-w-md"
        closeDisabled={!!busy}
        onClose={() => setConfirmation(null)}
        footer={(
          <>
            <button type="button" disabled={!!busy} onClick={() => setConfirmation(null)}
              className="h-10 rounded-full border border-slate-200 px-5 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">取消</button>
            <button type="button" disabled={!!busy} onClick={act}
              className="h-10 rounded-full bg-emerald-800 px-5 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50">
              {busy ? '处理中…' : confirmation ? actions[confirmation.action].label : '确认'}
            </button>
          </>
        )}
      >
        {confirmation && <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-emerald-800"><CalendarClock size={18} /> 预约信息</div>
          <p className="font-semibold text-slate-800">{confirmation.item.student}</p>
          <p className="mt-1 text-sm text-slate-600">{timeLabel(confirmation.item)}</p>
        </div>}
        {confirmationError && <p role="alert" className="mt-4 text-sm text-rose-700">{confirmationError}</p>}
      </Dialog>
    </div>
  )
}
