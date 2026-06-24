import { EQUIVALENT_PAIRS } from './equivalents'

// 동일교과목 쌍을 union-find로 묶어, 같은 그룹이면 같은 대표 코드를 반환한다.
const parent = new Map<string, string>()

function find(x: string): string {
  let r = x
  while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!
  return r
}

function union(a: string, b: string): void {
  if (!parent.has(a)) parent.set(a, a)
  if (!parent.has(b)) parent.set(b, b)
  const ra = find(a)
  const rb = find(b)
  if (ra !== rb) parent.set(ra, rb)
}

for (const [a, b] of EQUIVALENT_PAIRS) union(a, b)

/** 동일교과목 그룹 대표 코드. 그룹에 속하지 않으면 자기 코드 그대로. */
export function equivalentGroup(code: string): string {
  return parent.has(code) ? find(code) : code
}
