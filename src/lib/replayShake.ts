/**
 * 비어 있는 필수 항목의 빨간 강조(.field-error)를 유지한 채 흔들림(shake)만 다시 재생한다.
 *
 * 에러 상태를 비웠다 채우면(setErrors(new Set()) → setErrors(missing)) 빨강·안내문이
 * 한 프레임 사라져 깜빡이므로, 에러 상태는 그대로 두고 리플로우(void offsetWidth)로
 * 애니메이션만 재시작한다(Courses의 markArrivals와 같은 기법).
 *
 * 호출 전 flushSync로 .field-error를 먼저 커밋해야 재시작 대상 요소가 DOM에 존재한다.
 */
export function replayShake(root: HTMLElement | null): void {
  root?.querySelectorAll<HTMLElement>('.field-error').forEach((el) => {
    el.style.animation = 'none'
    void el.offsetWidth // 리플로우로 애니메이션 재시작 보장
    el.style.animation = ''
  })
}
