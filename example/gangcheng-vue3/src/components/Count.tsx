import { ArcBaseBox } from "@arctron-cim/components-vue3"
import { useInterval, useState, useCountdown } from "@arctron-cim/hooks-vue3"
import { defineComponent } from "vue"

function Count() {
  const [state, setState] = useState<number>(0)
  useInterval(() => setState((c: number) => ++c), 1000, true)
  const [leftTime, timer] = useCountdown({leftTime: 60 * 1000})
  return () => (
    <ArcBaseBox width='240px' height='299px' radius bgColor={'#559999'} bgImage={'https://pgw.udn.com.tw/gw/photo.php?u=https://uc.udn.com.tw/photo/2021/08/12/realtime/13315182.jpg&x=0&y=0&sw=0&sh=0&sl=W&fw=1050&exp=3600'}>
      <h1 class={'text-gray-700 font-bold'}>计数: {state.value}</h1>
      <h1 class={'text-red-600 font-bold'}>倒计时: {Math.round(leftTime.value / 1000)}</h1>
      
      <h1 class={'text-red-600 font-bold'}>倒计时: {timer.value?.seconds}</h1>
    </ArcBaseBox>
  )
}

export default defineComponent(Count)
