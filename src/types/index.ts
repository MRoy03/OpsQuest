export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
export type NodeStatus = 'healthy' | 'warning' | 'critical' | 'offline'
export type UserRole = 'user' | 'admin' | 'it_master'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  xp: number
  level: number
  badge: string
  avatar?: string
  ticketsResolved: number
  solutionsAdded: number
}

export interface Solution {
  id: string
  title: string
  description: string
  steps: string[]
  tags: string[]
  category: string
  successRate: number
  usageCount: number
  addedBy: string
  createdAt: string
}

export interface Ticket {
  id: string
  title: string
  description: string
  priority: Priority
  status: TicketStatus
  category: string
  userId: string
  userName: string
  assignedTo?: string
  createdAt: string
  updatedAt: string
  solutionsTried: string[]
  systemInfo?: string
}

export interface SystemNode {
  id: string
  name: string
  type: 'server' | 'network' | 'workstation' | 'storage' | 'cloud'
  status: NodeStatus
  cpu: number
  memory: number
  disk: number
  uptime: string
  alerts: number
  x: number
  y: number
}

export interface Alert {
  id: string
  nodeId: string
  nodeName: string
  message: string
  severity: 'info' | 'warning' | 'critical'
  timestamp: string
  acknowledged: boolean
}

export interface SolverResult {
  query: string
  solutions: Solution[]
  confidence: number
}

export interface XPEvent {
  action: string
  xp: number
  timestamp: string
}

export const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500]
export const LEVEL_NAMES = [
  'Rookie User',
  'Basic Technician',
  'Support Specialist',
  'System Operator',
  'IT Engineer',
  'Network Guardian',
  'System Defender',
  'Security Analyst',
  'IT Architect',
  'IT Master',
]
export const LEVEL_BADGES = ['🔰', '⚙️', '🛠️', '💻', '🔧', '🛡️', '⚔️', '🔐', '🏗️', '👑']
