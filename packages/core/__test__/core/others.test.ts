import { internalProxy, State, setCurrentComputed, Computed } from "../../src"

describe('internalProxy', () => {
  it('not in computed', () => {
    const s = new State(0)
    const v = s.value
    expect(v).toBe(0)
    expect(v).not.toBeInstanceOf(Proxy)
  })
  it('under computed', () => {
    const c = new Computed(() => {
      return 0
    })
    setCurrentComputed(c)

    const fronzedObj1 = { num: 0 }
    Object.freeze(fronzedObj1)
    const fronzedObj2 = {
      child: fronzedObj1,
      arr: [1,2,3]
    }
    Object.freeze(fronzedObj2)
    
    const s = new State(fronzedObj2)
    const v = s.value

    expect(v.child).toEqual({ num: 0 })
    expect(v.child.num).toBe(0)
    expect(v).toEqual({ child: { num: 0 }, arr: [1,2,3] })
    expect(Object.keys(v.child).length).toBe(1)
    expect(v.arr.length).toBe(3)
    expect(v.arr[0]).toBe(1)

    const newArr = v.arr.map(v => v + 1)
    expect(newArr).toEqual([2,3,4])

    setCurrentComputed(null)
  })
})