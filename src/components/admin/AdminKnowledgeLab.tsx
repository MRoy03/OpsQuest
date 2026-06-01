'use client'

import { useState } from 'react'
import { mockSolutions } from '@/lib/mock-data'
import type { Solution } from '@/types'
import { Plus, Edit, Trash2, TrendingUp, Search, Star, BarChart3 } from 'lucide-react'

function SolutionRow({ solution, onEdit }: { solution: Solution; onEdit: () => void }) {
  return (
    <tr className="border-t border-[#1a2f4a] hover:bg-[#ffffff03] transition-colors group">
      <td className="py-3 pr-4">
        <p className="text-xs font-semibold text-[#e2e8f0]">{solution.title}</p>
        <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-1">{solution.description}</p>
      </td>
      <td className="py-3 pr-4">
        <span className={`text-[10px] px-2 py-0.5 rounded font-medium capitalize border ${
          solution.category === 'network' ? 'text-[#00d4ff] bg-[#00d4ff11] border-[#00d4ff22]' :
          solution.category === 'hardware' ? 'text-[#f59e0b] bg-[#f59e0b11] border-[#f59e0b22]' :
          'text-[#7c3aed] bg-[#7c3aed11] border-[#7c3aed22]'
        }`}>{solution.category}</span>
      </td>
      <td className="py-3 pr-4">
        <div className="flex items-center gap-1">
          <Star className="w-3 h-3 text-[#f59e0b]" />
          <span className="text-xs font-semibold text-[#f59e0b]">{solution.successRate}%</span>
        </div>
        <div className="mt-1 h-1 w-16 rounded-full bg-[#1a2f4a]">
          <div className="h-full rounded-full bg-[#f59e0b]" style={{ width: `${solution.successRate}%` }} />
        </div>
      </td>
      <td className="py-3 pr-4 text-xs text-[#64748b]">{solution.usageCount}</td>
      <td className="py-3 pr-4 text-xs text-[#64748b]">{solution.addedBy}</td>
      <td className="py-3">
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onEdit} className="p-1.5 rounded bg-[#00d4ff11] border border-[#00d4ff22] text-[#00d4ff] hover:bg-[#00d4ff22]">
            <Edit className="w-3 h-3" />
          </button>
          <button className="p-1.5 rounded bg-[#ef444411] border border-[#ef444422] text-[#ef4444] hover:bg-[#ef444422]">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </td>
    </tr>
  )
}

function AddSolutionModal({ onClose }: { onClose: () => void }) {
  const [steps, setSteps] = useState([''])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[#e2e8f0]">Add New Solution</h3>
          <button onClick={onClose} className="text-xs text-[#475569] hover:text-[#94a3b8] border border-[#1a2f4a] px-2 py-1 rounded">
            Cancel
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Title *</label>
            <input className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[#00d4ff44]" placeholder="Fix WiFi Connectivity Issue" />
          </div>
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Description</label>
            <textarea className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[#00d4ff44] h-20 resize-none" placeholder="Brief description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Category</label>
              <select className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none">
                <option value="network">Network</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
              </select>
            </div>
            <div>
              <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Tags (comma-separated)</label>
              <input className="mt-1 w-full bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 text-sm text-[#e2e8f0] outline-none focus:border-[#00d4ff44]" placeholder="wifi, network, dns" />
            </div>
          </div>
          <div>
            <label className="text-[11px] text-[#64748b] uppercase tracking-wider">Steps *</label>
            <div className="space-y-2 mt-1">
              {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#00d4ff11] border border-[#00d4ff22] flex items-center justify-center text-[10px] text-[#00d4ff] shrink-0">{i + 1}</span>
                  <input
                    value={step}
                    onChange={e => setSteps(prev => prev.map((s, j) => j === i ? e.target.value : s))}
                    className="flex-1 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-1.5 text-xs text-[#e2e8f0] outline-none focus:border-[#00d4ff44]"
                    placeholder={`Step ${i + 1}...`}
                  />
                  {steps.length > 1 && (
                    <button onClick={() => setSteps(prev => prev.filter((_, j) => j !== i))} className="text-[#475569] hover:text-[#ef4444]">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setSteps(prev => [...prev, ''])} className="text-xs text-[#00d4ff] hover:underline flex items-center gap-1 mt-1">
                <Plus className="w-3.5 h-3.5" /> Add Step
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6 pt-4 border-t border-[#1a2f4a]">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border border-[#1a2f4a] text-sm text-[#64748b] hover:text-[#94a3b8]">Cancel</button>
          <button className="flex-1 py-2.5 rounded-lg bg-[#00d4ff] text-[#060b18] text-sm font-bold hover:bg-[#00b8d9]">Save Solution</button>
        </div>
      </div>
    </div>
  )
}

export default function AdminKnowledgeLab() {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Solution | null>(null)

  const filtered = mockSolutions.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.category.toLowerCase().includes(search.toLowerCase())
  )

  const topSolutions = [...mockSolutions].sort((a, b) => b.usageCount - a.usageCount).slice(0, 3)

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Solutions', value: mockSolutions.length, icon: BarChart3, color: 'cyan' },
          { label: 'Avg Success Rate', value: `${Math.round(mockSolutions.reduce((a, s) => a + s.successRate, 0) / mockSolutions.length)}%`, icon: TrendingUp, color: 'green' },
          { label: 'Total Uses', value: mockSolutions.reduce((a, s) => a + s.usageCount, 0), icon: Star, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className={`rounded-xl border p-4 ${
            color === 'cyan' ? 'bg-[#00d4ff11] border-[#00d4ff22]' :
            color === 'green' ? 'bg-[#10b98111] border-[#10b98122]' :
            'bg-[#f59e0b11] border-[#f59e0b22]'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${color === 'cyan' ? 'text-[#00d4ff]' : color === 'green' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`} />
              <p className="text-[11px] text-[#64748b] uppercase tracking-wider">{label}</p>
            </div>
            <p className={`text-2xl font-bold ${color === 'cyan' ? 'text-[#00d4ff]' : color === 'green' ? 'text-[#10b981]' : 'text-[#f59e0b]'}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Top solutions */}
      <div className="rounded-xl border border-[#1a2f4a] bg-[#0a1525] p-5">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-3">Top Performing Solutions</h3>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {topSolutions.map((s, i) => (
            <div key={s.id} className="shrink-0 w-48 rounded-lg border border-[#1a2f4a] p-3 bg-[#060b18]">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="text-[11px] font-bold text-[#00d4ff]">#{i+1}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded capitalize ${
                  s.category === 'network' ? 'text-[#00d4ff] bg-[#00d4ff11]' :
                  s.category === 'hardware' ? 'text-[#f59e0b] bg-[#f59e0b11]' : 'text-[#7c3aed] bg-[#7c3aed11]'
                }`}>{s.category}</span>
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
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 bg-[#060b18] border border-[#1a2f4a] rounded-lg px-3 py-2 flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 text-[#475569]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search solutions..."
              className="bg-transparent text-xs text-[#e2e8f0] placeholder-[#475569] outline-none w-full"
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00d4ff] text-[#060b18] text-xs font-bold hover:bg-[#00b8d9]"
          >
            <Plus className="w-3.5 h-3.5" /> Add Solution
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#475569] uppercase text-[10px] tracking-wider">
                <th className="text-left pb-2 pr-4">Solution</th>
                <th className="text-left pb-2 pr-4">Category</th>
                <th className="text-left pb-2 pr-4">Success Rate</th>
                <th className="text-left pb-2 pr-4">Uses</th>
                <th className="text-left pb-2 pr-4">Added By</th>
                <th className="text-left pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <SolutionRow key={s.id} solution={s} onEdit={() => setEditing(s)} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <AddSolutionModal onClose={() => setShowModal(false)} />}
    </div>
  )
}
