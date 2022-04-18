import {act, fireEvent, render} from '@testing-library/svelte'
import {expect} from 'chai'
import type {Dict, Project} from '../common/Project'
import {fake, stub} from 'sinon'
import ProjectSaver from './ProjectSaver.svelte'
import {GitHubClient} from '../github/GitHubClient'
import type {GoogleProfile} from '../common/GoogleTypes'

describe('ProjectSaver', () => {
  const dict: Dict = {}
  const defaultDict: Dict = {}
  const lang = 'en'
  let config: Project = {title: '', url: 'api.github.com', token: '', indent: 2}
  const user: GoogleProfile|undefined = undefined

  async function clickSaveButton(message: string) {
    const {container} = render(ProjectSaver, {dict, lang, config, user, defaultDict})
    stub(window, 'prompt').returns(message)
    stub(window, 'confirm').returns(false)
    stub(window, 'alert').resolves()
    stub(GitHubClient.prototype, 'saveFile').resolves(undefined)
    const save = fake()
    const button = container.querySelector('button')!
    button.addEventListener('click', save)
    await fireEvent.click(button)
    return save
  }

  it('user gets prompt to commit changes on button click', async () => {
    const save = await clickSaveButton('')
    expect(save).called
    expect(prompt).called
    expect(GitHubClient.prototype.saveFile).not.called
  })

  it('user can change the default commit and save', async () => {
    const save = await clickSaveButton('Custom message')
    expect(save).called
    expect(GitHubClient.prototype.saveFile).calledWith(lang, dict, defaultDict, 'Custom message')
    await act(GitHubClient.prototype.saveFile)
    expect(alert).called
  })

  it('commit button shows default translations branch if no branch in config', async () => {
    const {container} = render(ProjectSaver, {dict, lang, config, user, defaultDict})
    const btn = container.querySelector('button')
    expect(btn?.textContent).to.contain('Save to translations branch')
  })

  it('commit button shows config branch', async () => {
    config.branch = 'test'
    const {container} = render(ProjectSaver, {dict, lang, config, user, defaultDict})
    const btn = container.querySelector('button')
    expect(btn?.textContent).to.contain('Save to test branch')
  })
})