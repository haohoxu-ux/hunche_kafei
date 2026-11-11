import type {Agent} from './agents'

export function makeReply(agent:Agent,prompt:string) {
  const exact = agent.tasks.indexOf(prompt.trim())
  if(exact>=0) return agent.replies[exact]
  if(agent.slug==='car-designer') {
    const count=prompt.match(/(\d{1,2})\s*[辆台]/)
    const fleet=count && Number(count[1])>0 ? '1 辆头车'+(Number(count[1])>1?' + '+(Number(count[1])-1)+' 辆跟车':'') : '1 辆头车 + 同色跟车，数量按乘客人数确定'
    const car=prompt.match(/劳斯莱斯|奔驰迈巴赫|迈巴赫|奔驰 G 级|红旗|宝马|奔驰/)?.[0]||'行政轿车'
    const style=/中式|朱砂|东方/.test(prompt)?'中式雅礼':/黑金|典礼|奢/.test(prompt)?'经典黑金':'桃花春日'
    const colors=style==='中式雅礼'?'朱砂红主花与金色细带':style==='经典黑金'?'奶油白玫瑰与少量绿叶':'桃粉与暖白花材'
    return style+' · 迎亲方案\n\n车辆编排\n以'+car+'作为主车候选，建议 '+fleet+'。优先统一跟车的车色。\n\n花艺与路线\n选用'+colors+'，避开灯组与驾驶视野。提前核对婚期、路线、乘客人数和预算，再确定车型与集合时间。'
  }
  if(agent.slug==='business-analyst'){
    const val=(s:string)=>{const m=prompt.match(new RegExp('(\\d+)\\s*(?:次|笔|单|个)?'+s+'|'+s+'(?:量)?\\s*[：:]?\\s*(\\d+)'));return m?Number(m[1]||m[2]):undefined}
    const leads=val('咨询'),quotes=val('报价'),orders=val('成交')
    if(leads && quotes && orders!==undefined && leads>=quotes && quotes>=orders) return '转化漏斗 · 本地演算\n'+leads+' 次咨询 → '+quotes+' 次报价 → '+orders+' 单成交。\n\n咨询转报价率 '+(100*quotes/leads).toFixed(1)+'%\n报价转成交率 '+(100*orders/quotes).toFixed(1)+'%\n整体成交率 '+(100*orders/leads).toFixed(1)+'%\n\n建议按渠道拆分数据，比较各环节的流失率。'
  }
  const secondary:Record<string,RegExp>={'sales-advisor':/回复|跟进|微信/,'smart-quote':/公里|超程|绕行/,'video-director':/标题|选题/,'poster-designer':/黑金|招募/,'copywriter':/邀约|看车|邀请/,'order-assistant':/清单|前一天|确认/,'business-analyst':/流失|复盘/}
  return agent.replies[secondary[agent.slug]?.test(prompt)?1:0]
}

