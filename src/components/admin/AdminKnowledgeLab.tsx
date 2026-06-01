'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { mockSolutions as INITIAL } from '@/lib/mock-data'
import type { Solution } from '@/types'
import { Plus, Edit, Trash2, TrendingUp, Search, Star, BarChart3, X, CheckCircle, AlertTriangle } from 'lucide-react'

/* ── Solution modal (add or edit) ─────────────────────────── */
function SolutionModal({
  initial,
  onClose,
  onSave,
}: {
  initial: Solution | null
  onClose: () => void
  onSave: (s: Solution) => void
}) {
  const [title, setTitle] = useState(initial?.title ?? '')
  const [desc,  setDesc]  = useState(initial?.description ?? '')
  const [category, setCategory] = useState<Solution['category']>(initial?.category ?? 'software')
  const [tags, setTags]   = useState(initial?.tags.join(', ') ?? '')
  const [steps, setSteps] = useState<string[]>(initial?.steps ?? [''])
  const [saving, setSaving] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || steps.filter(s => s.trim()).length === 0) return
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    onSave({
      id: initial?.id ?? `s${Date.now()}`,
      title: title.trim(),
      description: desc.trim(),
      steps: steps.filter(s => s.trim()),
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      category,
      successRate: initial?.successRate ?? 0,
      usageCount: initial?.usageCount ?? 0,
      addedBy: initial?.addedBy ?? 'Admin',
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl rounded-2xl border border-[#1a2f4a] bg-[#0a1525] p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-bold text-[#e2e8f0]">
            {initial ? 'Edit Solution' : 'Add New Solution'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#ffffff08] text-[#475569] hover:text-[#94a3b8]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} required
              placeholder="Fix WiFi Connectivity Issue"
              className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors" />
          </div>
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Brief description of when to use this solution..."
              className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors h-20 resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as Solution['category'])}
                className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] outline-none">
                <option value="network">Network</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="cloud">Cloud</option>
                <option value="security">Security</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Tags (comma-separated)</label>
              <input value={tags} onChange={e => setTags(e.target.value)}
                placeholder="wifi, network, dns"
                className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg px-3 py-2.5 text-sm text-[#e2e8f0] placeholder-[#334155] outline-none transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Steps *</label>
            <div className="space-y-2 mt-1">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#00d4ff11] border border-[#00d4ff22] flex items-center justify-center text-[10px] text-[#00d4ff] shrink-0">{i + 1}</span>
                  <input value={step}
                    onChange={e => setSteps(prev => prev.map((s, j) => j === i ? e.target.value : s))}
                    className="flex-1 bg-[#060b18] border border-[#1a2f4a] focus:border-[#00d4ff44] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] outline-none transition-colors"
                    placeholder={`Step ${i + 1}...`} />
                  {steps.length > 1 && (
                    <button type="button" onClick={() => setSteps(prev => prev.filter((_, j) => j !== i))}
                      className="text-[#475569] hover:text-[#ef4444] transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={() => setSteps(prev => [...prev, ''])}
                className="text-xs text-[#00d4ff] hover:underline flex items-center gap-1 mt-1">
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-[#1a2f4a]">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[#1a2f4a] text-sm text-[#64748b] hover:text-[#94a3b8] transition-colors">
              Cancel
            </button>
            <motion.button type="submit" disabled={saving} whileTap={{ scale: 0.97 }}
              className="flex-1 py-2.5 rounded-xl bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00b8d9] disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-[#060b18] border-t-transparent rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {saving ? 'Saving...' : initial ? 'Update Solution' : 'Save Solution'}
            </motion.button>
          </div>
        </form>
      </motion.div>
    </div>
  )
}

/* ── Delete confirm ─────────────────────────────────────────── */
function DeleteConfirm({ title, onConfirm, onCancel }: { title: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-sm rounded-2xl border border-[#ef444433] bg-[#0a1525] p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-[#ef4444]" />
          <h3 className="text-sm font-bold text-[#e2e8f0]">Delete Solution</h3>
        </div>
        <p className="text-xs text-[#94a3b8] mb-5">
          Delete &quot;<span className="text-[#e2e8f0]">{title}</span>&quot;? This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 rounded-xl border border-[#1a2f4a] text-sm text-[#64748b] hover:text-[#94a3b8]">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2 rounded-xl bg-[#ef4444] text-white text-sm font-bold hover:bg-[#dc2626]">Delete</button>
        </div>
      </motion.div>
    </div>
  )
}

/* ── Main component ─────────────────────────────────────────── */
export default function AdminKnowledgeLab() {
  const [solutions, setSolutions] = useState<Solution[]>(INITIAL)
  const [search, setSearch]       = useState('')
  const [modal, setModal]         = useState<'add' | Solution | null>(null)
  const [delTarget, setDelTarget] = useState<Solution | null>(null)

  const filtered = solutions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.includes(search.toLowerCase()))
  )
  const topSolutions = [...solutions].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3)

  function handleSave(sol: Solution) {
    setSolutions(prev => {
      const idx = prev.findIndex(s => s.id === sol.id)
      return idx >= 0 ? prev.map(s => s.id === sol.id ? sol : s) : [sol, ...prev]
    })
  }

  function handleDelete(id: string) {
    setSolutions(prev => prev.filter(s => s.id !== id))
    setDelTarget(null)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Solutions', value: solutions.length, icon: BarChart3, color: 'cyan' },
          { label: 'Avg Success Rate', value: `${Math.round(solutions.reduce((a, s) => a + s.successRate, 0) / (solutions.length || 1))}%`, icon: TrendingUp, color: 'green' },
          { label: 'Total Uses', value: solutions.reduce((a, s) => a + s.usageCount, 0), icon: Star, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <motion.div key={label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 ${color === 'cyan' ? 'bg-[#00d4ff11] border-[#00d4ff22]' : color === 'green' ? 'bg-[#10b98111] border-[#10b98122]' : 'bg-[#f59e0b11] border-[#f59e0b22]'}`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color === 'cyan' ? 'text-[#00d4ff]' : color === 'green' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`} />
              <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color === 'cyan' ? 'text-[#00d4ff]' : color === 'green' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{value}</p>
          </motion.div>
        ))}
      </div>

      {/* Top solutions */}
      <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Top Performing Solutions</h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {topSolutions.map((s, i) => (
            <div key={s.id} className="shrink-0 w-48 rounded-lg border border-[#1a2f4a] p-3 bg-[#060b18]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[11px] font-bold text-[#00d4ff]">#{i + 1}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${s.category === 'network' ? 'text-[#00d4ff] bg-[#00d4ff11]' : s.category === 'hardware' ? 'text-[#f59e0b] bg-[#f59e0b11]' : 'text-[#7c3aed] bg-[#7c3aed11]'}`}>
                  {s.category}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#e2e8f0] line-clamp-2">{s.title}</p>
              <div className="flex items-center gap-2 mt-2 text-[10px]">
                <span className="text-[#f59e0b]"><Star className="w-2.5 h-2.5 inline" /> {s.successRate}%</span>
                <span className="text-[#475569]">{s.usageCount} uses</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Solutions table */}
      <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
        <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
          <div className="flex items-center gap-2 bg-[#060b18] border border-[#1a2f4a] hover:border-[#00d4ff33] rounded-lg px-3 py-2 flex-1 max-w-xs transition-colors">
            <Search className="w-3.5 h-3.5 text-[#475569]" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search solutions..."
              className="bg-transparent text-xs text-[#e2e8f0] placeholder-[#475569] outline-none w-full" />
          </div>
          <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setModal('add')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00d4ff] text-[#060b18] text-xs font-bold hover:bg-[#00b8d9] transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Solution
          </motion.button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#475569] uppercase text-[10px] tracking-wider border-b border-[#1a2f4a]">
                <th className="text-left pb-2 pr-4">Solution</th>
                <th className="text-left pb-2 pr-4">Category</th>
                <th className="text-left pb-2 pr-4">Success</th>
                <th className="text-left pb-2 pr-4">Uses</th>
                <th className="text-left pb-2 pr-4">By</th>
                <th className="text-left pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {filtered.map(s => (
                  <motion.tr key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="border-t border-[#1a2f4a] hover:bg-[#ffffff03] transition-colors group">
                    <td className="py-3 pr-4 max-w-xs">
                      <p className="text-xs font-semibold text-[#e2e8f0] truncate">{s.title}</p>
                      <p className="text-[11px] text-[#64748b] mt-0.5 truncate">{s.description}</p>
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize border ${
                        s.category === 'network' ? 'text-[#00d4ff] bg-[#00d4ff11] border-[#00d4ff22]' :
                        s.category === 'hardware' ? 'text-[#f59e0b] bg-[#f59e0b11] border-[#f59e0b22]' :
                        'text-[#7c3aed] bg-[#7c3aed11] border-[#7c3aed22]'
                      }`}>{s.category}</span>
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-[#f59e0b]" />
                        <span className="text-xs font-semibold text-[#f59e0b]">{s.successRate}%</span>
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-xs text-[#64748b]">{s.usageCount}</td>
                    <td className="py-3 pr-4 text-xs text-[#64748b] truncate max-w-24">{s.addedBy}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModal(s)}
                          className="p-1.5 rounded bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] hover:bg-[#00d4ff22] transition-colors">
                          <Edit className="w-3 h-3" />
                        </button>
                        <button onClick={() => setDelTarget(s)}
                          className="p-1.5 rounded bg-[#ef444411] border border-[#ef444422] text-[#ef4444] hover:bg-[#ef444422] transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-[#475569] py-8">No solutions match &quot;{search}&quot;</p>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal && (
          <SolutionModal
            initial={modal === 'add' ? null : modal}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}
        {delTarget && (
          <DeleteConfirm
            title={delTarget.title}
            onConfirm={() => handleDelete(delTarget.id)}
            onCancel={() => setDelTarget(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
