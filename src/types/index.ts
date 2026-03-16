// 摊位位置表
export interface Stall {
  id: string
  name: string           // 如 "A区1号"、"入口处"
  area: string           // 区域分组
  defaultPrice: number   // 默认日租金
  longTermPrice: number  // 默认长租月租金
  status: 'active' | 'inactive'
  createdAt: string
}

// 出租记录表
export interface RentalRecord {
  id: string
  stallId: string        // 关联位置ID
  renterName: string     // 微信名/姓名
  rentalType: 'daily' | 'long-term'  // 日租 / 长租
  rentalTypeName: string // 出租类型：烧烤/饮品/服装/玩具/其他

  // 日租字段
  date: string           // 日期 YYYY-MM-DD (日租)

  // 长租字段
  startDate: string      // 长租开始日期
  endDate: string        // 长租结束日期

  rentAmount: number     // 租金金额
  paymentStatus: 'paid' | 'unpaid' | 'deposit' // 已付款/未付款/定金
  notes: string          // 备注
  createdAt: string
  updatedAt: string
}

// 预设出租类型
export const RENTAL_TYPES = [
  '烧烤', '炸串', '饮品', '奶茶', '冰淇淋',
  '服装', '饰品', '玩具', '日用品', '水果',
  '小吃', '其他'
] as const

export type RentalTypeName = typeof RENTAL_TYPES[number]

// 付款状态选项
export const PAYMENT_STATUS = [
  { value: 'paid', label: '已付款', color: '#52c41a' },
  { value: 'unpaid', label: '未付款', color: '#faad14' },
  { value: 'deposit', label: '已付定金', color: '#1890ff' }
] as const

// 日历日期状态
export interface CalendarDay {
  date: string
  isCurrentMonth: boolean
  isToday: boolean
  records: RentalRecord[]
}