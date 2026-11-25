import { Activity, ArrowUpRight, BriefcaseMedical, FileCheck, ShieldAlert, UserRoundCheck, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ErrorState, LoadingState } from '../components/PageState'
import { platformConfig, roleLabels } from '../config/platforms'
import { api } from '../services/api'

const metricIcons = {
  activeStaff: UserRoundCheck,
  counselors: Users,
  psychologists: BriefcaseMedical,
  auditEvents: FileCheck,
  assignedStudents: Users,
  openAlerts: ShieldAlert,
  pendingOrders: ShieldAlert,
  interventions: Activity,
  activeCases: BriefcaseMedical,
  consentedCases: UserRoundCheck,
  pendingReviews: FileCheck,
  publishedDocuments: FileCheck,
}

const workspaceDescriptions = {
  workorders: '查看待办、跟进进度与转介情况',
  students: '查询负责的学生与联系信息',
  cases: '查看已转介个案与跟进安排',
  review: '处理待审核与待发布资料',
  reviews: '查看账号申请与资料审核',
  knowledge: '查阅校内工作资料',
  staff: '管理工作人员与账号权限',
  archives: '回看已完成的处置与干预记录',
}

const workOrderLabels = { pending: '待处理', assigned: '已分配', processing: '跟进中', referred: '已转介' }

export default function DashboardPage({ user, onNavigate }) {
  const [dashboard, setDashboard] = useState(null)
  const [error, setError] = useState('')
  const [tasks, setTasks] = useState(null)
  const [recentResolved, setRecentResolved] = useState([])
  const [taskError, setTaskError] = useState(false)
  const hasWorkOrders = ['counselor', 'psychologist'].includes(user.role)

  const load = useCallback(async () => {
    setError('')
    try {
      const response = await api.get('/dashboard')
      setDashboard(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.detail || '工作概览加载失败')
    }
  }, [])

  useEffect(() => {
    if (!hasWorkOrders) return
    let active = true
    api.get('/workorders').then(({ data }) => {
      if (!active) return
      setTasks(data.filter(item => item.status in workOrderLabels
        && (user.role !== 'counselor' || item.status !== 'referred')).slice(0, 4))
      setRecentResolved(data.filter(item => item.status === 'resolved').slice(0, 3))
    }).catch(() => {
      if (active) setTaskError(true)
    })
    return () => { active = false }
  }, [hasWorkOrders, user.role])

  useEffect(() => {
    let active = true
    api.get('/dashboard')
      .then((response) => {
        if (active) setDashboard(response.data)
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.detail || '工作概览加载失败')
      })
    return () => {
      active = false
    }
  }, [])

  if (error) return <ErrorState message={error} onRetry={load} />
  if (!dashboard) return <LoadingState text="正在读取工作概览..." />

  const shortcuts = platformConfig[user.role]?.navigation
    .filter(item => workspaceDescriptions[item.id]).slice(0, 5) ?? []
  return (
    <div className="here-dashboard space-y-7">
      <section className="here-welcome">
        <h2 className="text-lg font-bold">你好，{user.name}</h2>
        <p className="mt-1 text-sm text-slate-500">当前身份：{roleLabels[user.role]}</p>
      </section>

      <section className="here-metrics grid grid-cols-2 sm:grid-cols-4" aria-label="工作数据">
        {dashboard.metrics.map((metric) => {
          const Icon = metricIcons[metric.key] || Activity
          return (
            <article key={metric.key} className="here-metric">
              <div className="flex items-start justify-between">
                <p className="text-sm text-slate-500">{metric.label}</p>
                <div className="text-emerald-800">
                  <Icon size={19} />
                </div>
              </div>
              <p className="here-metric-value mt-3 text-3xl font-bold">
                {metric.value}
                <span className="ml-1 text-sm font-medium text-slate-400">{metric.unit}</span>
              </p>
            </article>
          )
        })}
      </section>
      <div className="here-workbench">
        <section className="here-task-feed">
          <div className="here-section-head">
            <h2 className="text-lg font-bold">待办事项</h2>
            {hasWorkOrders && <button type="button" className="here-task-action" onClick={() => onNavigate('workorders')}>查看全部工单 <ArrowUpRight size={16} /></button>}
          </div>
          {hasWorkOrders ? (
            taskError ? <p className="here-task-empty" role="status">暂时无法读取工单。请从工单页面重试。</p>
              : !tasks ? <p className="here-task-empty" role="status">正在读取待办工单…</p>
              : !tasks.length ? <div className="here-task-empty"><strong>当前没有待办工单</strong><p>收到新的学生求助或预警后，会在这里显示。</p></div>
              : <ul>{tasks.map(order => (
                <li key={order.id}>
                  <button type="button" className="here-dashboard-link"
                    onClick={() => onNavigate('workorders', order.id)}>
                    <ShieldAlert size={20} aria-hidden="true" />
                    <span><strong>{order.summary}</strong><small>{order.student} · {order.number}</small></span>
                    <span className="here-task-state">{workOrderLabels[order.status]}</span>
                  </button>
                </li>
              ))}</ul>
          ) : (
            <div className="here-task-empty">
              <strong>{dashboard.metrics.find(metric => metric.key === 'pendingReviews')?.value ?? ''} 资料与账号审核</strong>
              <p>在审核入口查看最新申请与待处理资料。</p>
              <button type="button" className="here-task-action" onClick={() => onNavigate(user.role === 'admin' ? 'reviews' : 'review')}>打开审核页面 <ArrowUpRight size={16} /></button>
            </div>
          )}
          {hasWorkOrders && (
            <div className="here-recent">
              <div className="here-section-head">
                <h3 className="text-base font-bold">已完成工单</h3>
                <button type="button" className="here-task-action" onClick={() => onNavigate('archives')}>打开干预档案 <ArrowUpRight size={16} /></button>
              </div>
              {recentResolved.length ? <ul>{recentResolved.map(order => (
                <li key={order.id}>
                  <button type="button" className="here-dashboard-link"
                    onClick={() => onNavigate('workorders', order.id)}>
                    <FileCheck size={20} aria-hidden="true" />
                    <span><strong>{order.summary}</strong><small>{order.student} · {order.number}</small></span>
                    <span className="here-task-state">已完成</span>
                  </button>
                </li>
              ))}</ul> : <p className="here-task-empty">已完成的工单会归入干预档案。</p>}
            </div>
          )}
        </section>
        {shortcuts.length > 0 && <section className="here-dashboard-links">
          <h2 className="text-lg font-bold">常用工作</h2>
          {shortcuts.map(({ id, icon: Icon, label }) => (
            <button key={id} type="button" onClick={() => onNavigate(id)} className="here-dashboard-link">
              <Icon aria-hidden="true" size={22} />
              <span><strong>{label}</strong><small>{workspaceDescriptions[id]}</small></span>
              <ArrowUpRight aria-hidden="true" size={19} />
            </button>
          ))}
        </section>}
      </div>
    </div>
  )
}
