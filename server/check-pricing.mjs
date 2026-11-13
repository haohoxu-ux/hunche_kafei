import { loadPricing } from './pricing.mjs'
const db=loadPricing({folder:process.env.PRICING_DIR || 'pricing',live:true})
console.log('核准价表版本',db.version,'正式货架',db.vehicles.length,'项，已核准套餐',db.packages.filter(p=>p.status==='已核准').length,'项')
