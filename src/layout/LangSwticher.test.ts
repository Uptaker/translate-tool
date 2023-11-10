import {render} from '@testing-library/svelte'
import {expect} from 'chai'
import LangSwitcher from './LangSwitcher.svelte'
import type {Project} from '../common/Project'
import {LoadedProject} from '../common/Project'

describe('<LangSwitcher>', () => {
  const project = new LoadedProject({} as Project, {de: {}, et: {}, es: {}})
  const lang = 'de'

  it('renders project languages', () => {
    const {container} = render(LangSwitcher, {project, lang})
    let select = container.querySelector('select')!
    expect(select).to.exist
    expect(select.options).to.have.length(3)
  })

  it('hides if only one language', () => {
    const project = new LoadedProject({} as Project, {de: {}})
    const {container} = render(LangSwitcher, {project, lang})
    let select = container.querySelector('select')!
    expect(select).to.not.exist
  })
})
